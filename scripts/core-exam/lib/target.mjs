import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Resolve the admin Supabase target for the core-exam import/provisioning
// scripts. Default is the LOCAL Supabase (read from `supabase status`), and the
// URL must be localhost. Hosted is opt-in ONLY: it requires an explicit
// CORE_EXAM_TARGET=hosted plus both hosted env vars, and in that mode the guard
// inverts — the URL must be an https://<ref>.supabase.co and must NOT be
// localhost. So a hosted write can never happen by accident, and a local run
// can never silently escape to prod.
export async function resolveAdminTarget() {
  if (process.env.CORE_EXAM_TARGET === "hosted") {
    const apiUrl = process.env.HOSTED_SUPABASE_URL;
    const serviceRoleKey = process.env.HOSTED_SERVICE_ROLE_KEY;
    if (!apiUrl || !serviceRoleKey) {
      throw new Error(
        "CORE_EXAM_TARGET=hosted requires HOSTED_SUPABASE_URL and HOSTED_SERVICE_ROLE_KEY",
      );
    }
    if (/localhost|127\.0\.0\.1/.test(apiUrl)) {
      throw new Error("Hosted target must not be a localhost URL");
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(apiUrl)) {
      throw new Error(
        "Hosted target must be an https://<project-ref>.supabase.co URL",
      );
    }
    return { apiUrl, serviceRoleKey, mode: "hosted" };
  }

  const { stdout } = await execFileAsync("supabase", ["status", "-o", "env"], {
    maxBuffer: 1024 * 1024,
  });
  const localValues = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    localValues.set(match[1], match[2].trim().replace(/^"|"$/g, ""));
  }
  const apiUrl = localValues.get("API_URL");
  const serviceRoleKey = localValues.get("SERVICE_ROLE_KEY");
  if (!apiUrl || !serviceRoleKey) {
    throw new Error("Local Supabase status did not provide credentials");
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiUrl)) {
    throw new Error("Refusing to run outside local Supabase");
  }
  return { apiUrl, serviceRoleKey, mode: "local" };
}
