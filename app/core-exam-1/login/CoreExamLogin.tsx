"use client";

import { useState } from "react";
import { createCoreExamBrowserClient } from "../lib/supabase/browser";
import { CoreStudyLogo } from "../CoreStudyLogo";

type CoreExamLoginProps = {
  callbackFailed: boolean;
};

// Turn a Supabase auth error into a specific, actionable message instead of a
// generic "couldn't send" — so a rate limit, an uninvited email, or a blocked
// network read differently.
function describeAuthError(error: {
  message?: string;
  status?: number;
  code?: string;
}): string {
  const message = (error.message ?? "").toLowerCase();
  const status = error.status;
  if (status === 429 || message.includes("rate limit")) {
    return "Too many sign-in emails were requested recently. Give it a few minutes, then try again.";
  }
  if (
    message.includes("signups not allowed") ||
    message.includes("not allowed for otp") ||
    message.includes("user not found") ||
    status === 422
  ) {
    return "This email isn’t on the invite list — double-check the address, or ask Justin to add it.";
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  ) {
    return "Couldn’t reach the sign-in service. A network or firewall may be blocking it — try another network.";
  }
  return error.message ?? "We couldn’t send the sign-in link. Try again.";
}

export function CoreExamLogin({ callbackFailed }: CoreExamLoginProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >(callbackFailed ? "error" : "idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setErrorDetail(null);

    const supabase = createCoreExamBrowserClient();
    const callbackUrl = new URL(
      "/core-exam-1/auth/callback",
      window.location.origin,
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: false,
      },
    });

    if (error) {
      // Full error to the console for debugging; friendly reason on screen.
      console.error("Core Exam sign-in error:", error);
      setErrorDetail(describeAuthError(error));
      setStatus("error");
      return;
    }
    setStatus("sent");
  };

  return (
    <main className="ce-login-shell">
      <section className="ce-login-card" aria-labelledby="ce-login-title">
        <CoreStudyLogo className="ce-brand-logo" />
        <p className="ce-eyebrow">Core Exam 1</p>
        <h1 id="ce-login-title">Sign in to your study space</h1>
        <p className="ce-login-intro">
          Use the email Justin invited. We’ll send you a sign-in link.
        </p>

        {status === "sent" ? (
          <div className="ce-login-message" role="status">
            Check your email for your sign-in link.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="ce-login-email">Email</label>
            <input
              autoComplete="email"
              id="ce-login-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <button disabled={status === "sending"} type="submit">
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="ce-login-error" role="alert">
            {callbackFailed
              ? "That sign-in link couldn’t be completed. Request a new one."
              : (errorDetail ??
                "We couldn’t send the sign-in link. Try again.")}
          </p>
        )}
      </section>
    </main>
  );
}
