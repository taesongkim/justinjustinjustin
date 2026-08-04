"use client";

import { createCoreExamBrowserClient } from "./lib/supabase/browser";

type UnauthorizedAccountProps = {
  email: string;
};

export function UnauthorizedAccount({ email }: UnauthorizedAccountProps) {
  const signOut = async () => {
    const supabase = createCoreExamBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/core-exam-1/login");
  };

  return (
    <main className="ce-login-shell">
      <section className="ce-login-card" aria-labelledby="ce-access-title">
        <span className="ce-brand-mark" aria-hidden="true">
          CE
        </span>
        <p className="ce-eyebrow">Core Exam 1</p>
        <h1 id="ce-access-title">This account doesn’t have access</h1>
        <p className="ce-login-intro">
          You’re signed in, but this email isn’t a member of Core Exam 1.
        </p>
        <div className="ce-account-mismatch">
          <span>Signed in as</span>
          <strong>{email}</strong>
        </div>
        <button className="ce-login-secondary" onClick={signOut} type="button">
          Sign out
        </button>
      </section>
    </main>
  );
}
