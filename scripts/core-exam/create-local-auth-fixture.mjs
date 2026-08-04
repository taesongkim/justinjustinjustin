import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);
const email = process.argv[2] ?? "core-exam-test@example.com";
const accessRole = process.argv[3] ?? "owner";

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("Pass a valid fixture email address");
}
if (!["owner", "member", "none"].includes(accessRole)) {
  throw new Error("Fixture role must be owner, member, or none");
}
const participation = process.argv[4] ?? "active";
if (!["assistant", "active", "observer"].includes(participation)) {
  throw new Error("Participation must be assistant, active, or observer");
}

const { stdout } = await execFileAsync("supabase", ["status", "-o", "env"], {
  maxBuffer: 1024 * 1024,
});

const localValues = new Map();
for (const line of stdout.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (!match) continue;
  localValues.set(
    match[1],
    match[2].trim().replace(/^"|"$/g, ""),
  );
}

const apiUrl = localValues.get("API_URL");
const serviceRoleKey = localValues.get("SERVICE_ROLE_KEY");

if (!apiUrl || !serviceRoleKey) {
  throw new Error(
    "Local Supabase status did not provide API_URL and SERVICE_ROLE_KEY",
  );
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiUrl)) {
  throw new Error("Refusing to create a fixture outside local Supabase");
}

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: users, error: listError } =
  await admin.auth.admin.listUsers();
if (listError) throw listError;

const existing = users.users.find((user) => user.email === email);
let user = existing;
if (!user) {
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createError) throw createError;
  user = data.user;
  console.log(`Created local auth fixture: ${email}`);
} else {
  console.log(`Local auth fixture already exists: ${email}`);
}

if (!user) throw new Error("Local auth fixture has no user record");

const { error: profileError } = await admin
  .from("core_exam_profiles")
  .upsert({
    user_id: user.id,
    display_name:
      accessRole === "owner"
        ? "Core Exam Test"
        : accessRole === "member"
          ? "Study Friend"
          : "Outside Account",
    avatar_color:
      accessRole === "owner"
        ? "#7b6ad8"
        : accessRole === "member"
          ? "#b66b53"
          : "#7c8581",
  });
if (profileError) throw profileError;

const { data: space, error: spaceError } = await admin
  .from("core_exam_spaces")
  .upsert(
    {
      slug: "core-exam-1",
      title: "Core Exam 1",
    },
    { onConflict: "slug" },
  )
  .select("id")
  .single();
if (spaceError) throw spaceError;

const membershipQuery = admin
  .from("core_exam_memberships");
const { error: membershipError } =
  accessRole === "none"
    ? await membershipQuery
        .delete()
        .eq("space_id", space.id)
        .eq("user_id", user.id)
    : await membershipQuery.upsert({
        space_id: space.id,
        user_id: user.id,
        role: accessRole,
        status: "active",
        participation,
      });
if (membershipError) throw membershipError;

console.log(
  accessRole === "none"
    ? "Ensured local profile has no Core Exam membership."
    : `Ensured local profile, Core Exam space, and ${accessRole} membership.`,
);
console.log("No service-role credential was stored or printed.");
