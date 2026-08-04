import process from "node:process";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminTarget } from "./lib/target.mjs";

// Provision Core Exam members on the target Supabase (hosted, for go-live).
// Reads a gitignored JSON list of { email, displayName, role } and, IN ORDER,
// creates confirmed auth users, upserts the space, upserts profiles, and
// upserts active memberships.
//
// Order matters: the BEFORE-INSERT hue trigger assigns palette colors by human
// join order, so list people in the order you want the first six maximally-
// distinct hues handed out. We never send avatar_color — the trigger owns it.
//
// Usage:
//   CORE_EXAM_TARGET=hosted \
//   HOSTED_SUPABASE_URL=https://<ref>.supabase.co \
//   HOSTED_SERVICE_ROLE_KEY=... \
//   node scripts/core-exam/provision-hosted-members.mjs .local-archive/core-exam/prod-members.json

const listPath = process.argv[2];
if (!listPath) {
  throw new Error(
    "Usage: node provision-hosted-members.mjs <members.json>",
  );
}

const members = JSON.parse(await readFile(listPath, "utf8"));
if (!Array.isArray(members) || members.length === 0) {
  throw new Error("Member list must be a non-empty JSON array");
}
for (const member of members) {
  if (
    !member ||
    typeof member.email !== "string" ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(member.email)
  ) {
    throw new Error(
      `Invalid email in member list: ${JSON.stringify(member)}`,
    );
  }
  if (typeof member.displayName !== "string" || !member.displayName.trim()) {
    throw new Error(`Missing displayName for ${member.email}`);
  }
  if (!["owner", "member"].includes(member.role)) {
    throw new Error(`Role for ${member.email} must be owner or member`);
  }
  if (
    member.participation !== undefined &&
    !["assistant", "active", "observer"].includes(member.participation)
  ) {
    throw new Error(
      `Participation for ${member.email} must be assistant, active, or observer`,
    );
  }
}

const { apiUrl, serviceRoleKey, mode } = await resolveAdminTarget();
console.log(
  `Provisioning ${members.length} member(s) against ${mode} Supabase.`,
);

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find an existing auth user by email, paginating — the live project may hold
// many users, so we can't assume page one. Returns the user or null.
async function findUserByEmail(email) {
  const perPage = 200;
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === target,
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
  }
  return null;
}

const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .upsert(
    { slug: "core-exam-1", title: "Core Exam 1" },
    { onConflict: "slug" },
  )
  .select("id")
  .single();
if (spaceError) throw spaceError;

for (const member of members) {
  let user = await findUserByEmail(member.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: member.email,
      email_confirm: true,
      user_metadata: { display_name: member.displayName },
    });
    if (error) throw error;
    user = data.user;
    console.log(`created auth user: ${member.email}`);
  } else {
    console.log(`auth user already exists: ${member.email}`);
  }
  if (!user) throw new Error(`No user record for ${member.email}`);

  // Upsert the profile WITHOUT avatar_color so the BEFORE-INSERT hue trigger
  // assigns the color on a fresh insert. On a pre-existing profile this update
  // leaves the stored color untouched.
  const { error: profileError } = await admin
    .from("core_exam_profiles")
    .upsert(
      { user_id: user.id, display_name: member.displayName },
      { onConflict: "user_id" },
    );
  if (profileError) throw profileError;

  const { error: membershipError } = await admin
    .from("core_exam_memberships")
    .upsert(
      {
        space_id: space.id,
        user_id: user.id,
        role: member.role,
        status: "active",
        participation: member.participation ?? "active",
      },
      { onConflict: "space_id,user_id" },
    );
  if (membershipError) throw membershipError;

  console.log(
    `  ensured profile + ${member.role} membership for ${member.displayName}`,
  );
}

console.log("Done. No service-role credential was printed.");
