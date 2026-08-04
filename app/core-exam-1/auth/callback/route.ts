import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createCoreExamServerClient } from "../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createCoreExamServerClient();
  let error: { message?: string; status?: number } | null = null;

  if (code) {
    // PKCE magic link (needs the verifier stored in the requesting browser).
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    // Token-hash verify: works cross-browser and for admin-generated links,
    // since it doesn't need a client-side code verifier.
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    }));
  } else {
    error = { message: "callback reached with no code or token_hash" };
  }

  if (!error) {
    return NextResponse.redirect(new URL("/core-exam-1", requestUrl.origin));
  }

  // Log the exact reason to the server (Vercel) logs for diagnosis.
  console.error("[core-exam] auth callback failed", {
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    type,
    status: error.status,
    message: error.message,
  });

  const destination = new URL("/core-exam-1/login", requestUrl.origin);
  destination.searchParams.set("error", "auth_callback");
  return NextResponse.redirect(destination);
}
