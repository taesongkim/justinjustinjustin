import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Read the LOCAL Supabase admin credentials from `supabase status`. Guarded to
// a localhost URL so this can never resolve a remote project.
async function localTarget() {
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

// Read the HOSTED Supabase admin credentials from the environment. Guarded to
// an https://<ref>.supabase.co URL (and never localhost) so a hosted write
// takes deliberate opt-in and can't happen by accident.
function hostedTarget() {
  const apiUrl = process.env.HOSTED_SUPABASE_URL;
  const serviceRoleKey = process.env.HOSTED_SERVICE_ROLE_KEY;
  if (!apiUrl || !serviceRoleKey) {
    throw new Error(
      "Hosted target requires HOSTED_SUPABASE_URL and HOSTED_SERVICE_ROLE_KEY",
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

// Default resolver used by the deterministic importers: local unless the caller
// explicitly opts into hosted with CORE_EXAM_TARGET=hosted.
export async function resolveAdminTarget() {
  if (process.env.CORE_EXAM_TARGET === "hosted") {
    return hostedTarget();
  }
  return localTarget();
}

// Explicit resolvers for scripts that need BOTH ends at once (e.g. the
// local→hosted reconcile).
export async function resolveLocalTarget() {
  return localTarget();
}

export async function resolveHostedTarget() {
  return hostedTarget();
}
