import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoreExamAccess } from "../lib/viewer";
import { UnauthorizedAccount } from "../UnauthorizedAccount";
import { CoreStudyLogo } from "../CoreStudyLogo";
import { LowerSelfGuide } from "./LowerSelfGuide";

export const metadata = {
  title: "The Lower Self — Core Exam 1",
  description: "A working map of the lower self.",
};

export default async function LowerSelfPage() {
  const access = await getCoreExamAccess();
  if (access.status === "anonymous") {
    redirect("/core-exam-1/login?next=/core-exam-1/lower-self");
  }
  if (access.status === "unauthorized") {
    return <UnauthorizedAccount email={access.email} />;
  }

  return (
    <main className="ce-app ce-ls-page">
      <header className="ce-header">
        <Link className="ce-brand" href="/core-exam-1">
          <CoreStudyLogo className="ce-brand-logo" />
          <div>
            <p className="ce-eyebrow">Study space</p>
            <h1>Core Exam 1</h1>
          </div>
        </Link>
        <div className="ce-header-actions">
          <Link className="ce-quiet-button" href="/core-exam-1">
            Back to study
          </Link>
          <div className="ce-identity">
            <span
              aria-hidden="true"
              className="ce-avatar"
              style={{ background: access.viewer.avatarColor }}
            >
              {access.viewer.displayName[0]}
            </span>
            <span>
              <small>Studying as</small>
              {access.viewer.displayName}
            </span>
          </div>
        </div>
      </header>

      <div className="ce-ls-shell">
        <LowerSelfGuide />
      </div>
    </main>
  );
}
