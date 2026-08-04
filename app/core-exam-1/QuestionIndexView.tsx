"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TopicQuestion } from "./lib/questions";
import { ActivityPanel } from "./ActivityPanel";
import type { CoreExamActivityFeed } from "./lib/activity";
import type { ScoreboardMember } from "./lib/scoreboard";
import { Scoreboard } from "./Scoreboard";
import { CoreStudyLogo } from "./CoreStudyLogo";
import { ThemeToggle } from "./ThemeToggle";
import { useLiveActivity } from "./useLiveActivity";
import { createCoreExamBrowserClient } from "./lib/supabase/browser";
import type { CoreExamViewer } from "./lib/viewer";

export type TopicQuestionGroup = {
  label: string;
  stableKey: string;
  questions: TopicQuestion[];
};

export function QuestionIndexView({
  activity,
  groups,
  scoreboard,
  viewer,
}: {
  activity: CoreExamActivityFeed;
  groups: TopicQuestionGroup[];
  scoreboard: ScoreboardMember[];
  viewer: CoreExamViewer;
}) {
  useLiveActivity(viewer.spaceId, viewer.userId);
  const [filter, setFilter] = useState<
    "all" | "answered" | "unanswered" | "submitted" | "hidden"
  >("all");
  const allQuestions = useMemo(
    () =>
      groups.flatMap((group) =>
        group.questions.map((question) => ({ ...question, group })),
      ),
    [groups],
  );
  // Answered progress ignores questions the viewer has hidden for themselves.
  const countedQuestions = allQuestions.filter(
    (question) => !question.isHiddenForMe,
  );
  const filteredQuestions = allQuestions.filter((question) => {
    if (filter === "answered") return Boolean(question.myAnswer);
    if (filter === "unanswered") return !question.myAnswer;
    if (filter === "submitted") return question.origin === "submitted";
    if (filter === "hidden") return question.isHiddenForMe;
    return true;
  });

  const signOut = async () => {
    const supabase = createCoreExamBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/core-exam-1/login");
  };

  return (
    <main className="ce-app ce-index-app">
      <header className="ce-header">
        <Link className="ce-brand ce-brand-link" href="/core-exam-1">
          <CoreStudyLogo className="ce-brand-logo" />
          <div>
            <p className="ce-eyebrow">Study space</p>
            <h1>Core Exam 1</h1>
          </div>
        </Link>
        <Scoreboard members={scoreboard} />
        <nav className="ce-index-nav" aria-label="Study">
          <Link href="/core-exam-1">Home</Link>
          <ActivityPanel
            events={activity.events}
            initialHasUnviewed={activity.hasUnviewed}
            latestOtherEventId={activity.latestOtherEventId}
          />
          <ThemeToggle />
        </nav>
        <details className="ce-identity-menu">
          <summary className="ce-identity">
            <span
              className="ce-avatar"
              style={{ background: viewer.avatarColor }}
              aria-hidden="true"
            >
              {viewer.displayName[0]}
            </span>
            <span>
              <small>Studying as</small>
              {viewer.displayName}
            </span>
          </summary>
          <div className="ce-identity-popover">
            <strong>{viewer.displayName}</strong>
            <span>{viewer.email}</span>
            <span className="ce-identity-role">{viewer.role}</span>
            {viewer.role === "owner" &&
              process.env.NODE_ENV === "development" && (
                <Link href="/core-exam-1/question-workshop">
                  Question Workshop
                </Link>
              )}
            <button onClick={signOut} type="button">
              Sign out
            </button>
          </div>
        </details>
      </header>

      <div className="ce-index-shell">
        <header className="ce-index-heading">
          <p className="ce-eyebrow">Across every topic</p>
          <h2>All Questions</h2>
          <p>
            Every question in the exam — your answer, the group’s activity, and
            what’s still open.
          </p>
          <div className="ce-index-progress">
            <strong>
              {countedQuestions.filter((question) => question.myAnswer).length}
            </strong>
            <span>of {countedQuestions.length} answered</span>
          </div>
        </header>

        <div className="ce-index-filters" aria-label="Question filters">
          {(
            ["all", "answered", "unanswered", "submitted", "hidden"] as const
          ).map(
            (option) => (
              <button
                aria-pressed={filter === option}
                key={option}
                onClick={() => setFilter(option)}
                type="button"
              >
                {option}
              </button>
            ),
          )}
        </div>

        <div className="ce-index-list">
          {filteredQuestions.map((question) => {
            const answerCount =
              question.groupAnswers.length + (question.myAnswer ? 1 : 0);
            const commentCount =
              question.questionComments.length +
              question.groupAnswers.reduce(
                (count, answer) => count + answer.comments.length,
                0,
              ) +
              (question.myAnswer?.comments.length ?? 0);
            return (
              <article className="ce-index-row" key={question.id}>
                <div className="ce-index-row-topic">
                  {question.group.label}
                  {question.isHiddenForMe && <span>Hidden for me</span>}
                </div>
                <div>
                  <Link
                    href={`/core-exam-1?topic=${encodeURIComponent(question.group.stableKey)}#ce-question-${question.id}`}
                  >
                    {question.prompt}
                  </Link>
                  <p
                    className={
                      question.myAnswer
                        ? "ce-index-answer"
                        : "ce-index-answer ce-index-answer-empty"
                    }
                  >
                    {question.myAnswer?.plainText ??
                      "You haven’t answered this yet."}
                  </p>
                </div>
                <div className="ce-index-row-meta">
                  <span>{answerCount} answers</span>
                  <span>{commentCount} comments</span>
                  <span>
                    {question.likelihood.likely.length} likely
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
