"use client";

import { useState } from "react";
import { createCoreExamBrowserClient } from "../lib/supabase/browser";

type CoreExamLoginProps = {
  callbackFailed: boolean;
};

export function CoreExamLogin({ callbackFailed }: CoreExamLoginProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >(callbackFailed ? "error" : "idle");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");

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

    setStatus(error ? "error" : "sent");
  };

  return (
    <main className="ce-login-shell">
      <section className="ce-login-card" aria-labelledby="ce-login-title">
        <span className="ce-brand-mark" aria-hidden="true">
          CE
        </span>
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
              : "We couldn’t send the sign-in link. Try again."}
          </p>
        )}
      </section>
    </main>
  );
}
