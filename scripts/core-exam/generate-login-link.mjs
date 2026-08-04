import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { resolveHostedTarget } from "./lib/target.mjs";

// Generate a one-time sign-in link for a provisioned member and print a direct
// callback URL you can send them OUT OF BAND (text / Signal / personal email),
// bypassing a work inbox's link scanner and the cross-browser magic-link issue.
//
// Requires the callback route's token_hash handling to be deployed.
//
//   HOSTED_SUPABASE_URL=https://<ref>.supabase.co \
//   HOSTED_SERVICE_ROLE_KEY=... \
//   node scripts/core-exam/generate-login-link.mjs someone@example.com

const email = process.argv[2];
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error(
    "Usage: node scripts/core-exam/generate-login-link.mjs <email>",
  );
}

const { apiUrl, serviceRoleKey } = await resolveHostedTarget();
const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: "https://justinjustinjustin.com/core-exam-1" },
});
if (error) throw error;

const hashedToken = data.properties?.hashed_token;
if (!hashedToken) {
  throw new Error("No hashed_token returned — is the email a member?");
}

const directLink =
  "https://justinjustinjustin.com/core-exam-1/auth/callback" +
  `?token_hash=${hashedToken}&type=magiclink`;

console.log(`\nSign-in link for ${email} — send OUT OF BAND, not to a work inbox:\n`);
console.log(directLink);
console.log(
  "\nSingle-use, expires per your Supabase OTP settings (default ~1h).",
);
console.log("They should open it in a normal browser (not an in-app mail viewer).");
