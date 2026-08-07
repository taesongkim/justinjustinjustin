"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CONFIDENCE_LABELS } from "./ConfidenceSlider";
import type { TopicQuestionGroup } from "./QuestionIndexView";

// The All Questions index, rendered inside the main reading pane. The page
// chrome (header, scoreboard, nav, identity) is supplied by the frame; this is
// just the heading, filters, and cross-topic list.
export function QuestionIndexContent({
  groups,
}: {
  groups: TopicQuestionGroup[];
}) {
  const [filter, setFilter] = useState<
    "all" | "answered" | "unanswered" | "hidden"
  >("all");
  // Filter by the viewer's own confidence level (1–5), unset, or any.
  const [mastery, setMastery] = useState<"any" | "unset" | 1 | 2 | 3 | 4 | 5>(
    "any",
  );
  // Filter by the viewer's exam-relevance mark (unmarked counts as "unsure").
  const [relevance, setRelevance] = useState<
    "any" | "likely" | "unsure" | "unlikely"
  >("any");
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
    const statusOk =
      filter === "answered"
        ? Boolean(question.myAnswer)
        : filter === "unanswered"
          ? !question.myAnswer
          : filter === "hidden"
            ? question.isHiddenForMe
            : true;
    if (!statusOk) return false;
    if (
      relevance !== "any" &&
      (question.myLikelihood ?? "unsure") !== relevance
    ) {
      return false;
    }
    if (mastery === "unset") return question.myConfidence == null;
    if (typeof mastery === "number") return question.myConfidence === mastery;
    return true;
  });

  return (
    <div className="ce-index-shell ce-index-embedded">
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
        {(["all", "answered", "unanswered", "hidden"] as const).map(
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
        <span className="ce-index-filter-label">Mastery</span>
        {(["any", 1, 2, 3, 4, 5, "unset"] as const).map((option) => (
          <button
            aria-pressed={mastery === option}
            key={String(option)}
            onClick={() => setMastery(option)}
            title={
              typeof option === "number"
                ? CONFIDENCE_LABELS[option - 1]
                : undefined
            }
            type="button"
          >
            {option === "any" ? "Any" : option === "unset" ? "Unset" : option}
          </button>
        ))}
        <span className="ce-index-filter-label">Relevance</span>
        {(["any", "likely", "unsure", "unlikely"] as const).map((option) => (
          <button
            aria-pressed={relevance === option}
            key={option}
            onClick={() => setRelevance(option)}
            type="button"
          >
            {option}
          </button>
        ))}
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
                <span>{question.likelihood.likely.length} likely</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
