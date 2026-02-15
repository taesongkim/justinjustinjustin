import { createClient } from "@supabase/supabase-js";

// ─── Supabase credentials ───────────────────────────────────────────
// Set these as environment variables in your .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// ─────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[habit-tracker] Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

// Use a placeholder URL during build when env vars aren't available yet.
// The client will only be called at runtime in the browser.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
