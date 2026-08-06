"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { labelForContentStableKey } from "./content-label";
import {
  CONTENT_GLYPHS,
  formatAnswerMarkdown,
  isCitationToken,
} from "./format-reader-markdown";
import {
  resolveCitationSource,
  type PreviewSource,
} from "./source-catalog";
import { SourceViewerDialog } from "./SourceViewerDialog";
import { ActivityPanel } from "./ActivityPanel";
import type {
  CoreExamActivityFeed,
  CoreExamActivityItem,
} from "./lib/activity";
import type { PageContributions } from "./lib/contributions";
import { hueNameStyle } from "./lib/hue";
import { createCoreExamBrowserClient } from "./lib/supabase/browser";
import type {
  QuestionLikelihood,
  TopicQuestion,
} from "./lib/questions";
import type { PageVerifications } from "./lib/verification";
import type { CoreExamViewer } from "./lib/viewer";
import type { ScoreboardMember } from "./lib/scoreboard";
import { Scoreboard } from "./Scoreboard";
import { CoreStudyLogo } from "./CoreStudyLogo";
import { ThemeToggle } from "./ThemeToggle";
import { useLiveActivity } from "./useLiveActivity";
import { useLiveConfidence } from "./useLiveConfidence";
import { type RingMember } from "./StatusRings";
import { ConfidenceSlider } from "./ConfidenceSlider";
import { ConfidenceRings } from "./ConfidenceRings";
import { QuestionTOC } from "./QuestionTOC";
import { SavingIndicator } from "./SavingIndicator";
import { REFERENCES, TOPICS, type ReaderPageSummary } from "./topics";
import { VerificationControl } from "./VerificationControl";

type CoreExamFrameProps = {
  activity: CoreExamActivityFeed;
  collaborativeEmpty: boolean;
  contributions: PageContributions;
  initialTargetId: string | null;
  selectedTopic: ReaderPageSummary;
  markdown: string;
  questions: TopicQuestion[];
  scoreboard: ScoreboardMember[];
  sourceAvailable: boolean;
  topicConfidence: { topicNodeId: string | null; myLevel: number | null };
  verifications: PageVerifications;
  viewer: CoreExamViewer | null;
};

type OpenSource = {
  citation?: string;
  page?: number;
  source: PreviewSource;
};

const formatAnswerTimestamp = (value: string) => {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  // This is display-only relative time; persisted timestamps remain absolute.
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "just now";
  if (elapsedSeconds < 60 * 60) {
    return `${Math.floor(elapsedSeconds / 60)}m ago`;
  }
  if (elapsedSeconds < 24 * 60 * 60) {
    return `${Math.floor(elapsedSeconds / (60 * 60))}h ago`;
  }
  if (elapsedSeconds < 48 * 60 * 60) return "1d ago";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

// Plain-language legend for the red/yellow/gray priority dots, shown as a
// tooltip on hover/focus so readers don't have to guess what the colors mean.
const TIER_TOOLTIP: Record<string, string> = {
  "tier-high": "Highest study priority",
  "tier-mid": "Medium study priority",
  "tier-low": "Lower study priority",
};

// Flat marker icons that replace content emojis. Shapes (dots/diamonds/square)
// are drawn in CSS from the ce-marker-* class; only the check and caution need
// glyph paths.
function MarkerGlyph({ type }: { type: string }) {
  if (type === "done") {
    return (
      <svg aria-hidden="true" fill="none" height="11" viewBox="0 0 12 12" width="11">
        <path
          d="M1.6 5.5 4.05 8 9.1 2.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (type === "warn") {
    return (
      <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
        <path
          d="M6 1.4 11 10.4H1z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />
        <path
          d="M6 5v2.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.2"
        />
        <circle cx="6" cy="8.9" fill="currentColor" r="0.6" />
      </svg>
    );
  }
  return null;
}

// Flip to false to turn the centered nav loader back off.
const TOPIC_NAV_LOADER_ENABLED = true;

// "Sort by exam relevance" groups non-hidden cards by the viewer's own
// likelihood mark (unmarked counts as "unsure"), in this order.
const RELEVANCE_SECTIONS = [
  { key: "likely", label: "Likely to be tested" },
  { key: "unsure", label: "Unsure" },
  { key: "unlikely", label: "Unlikely to be tested" },
] as const;

const revealCoreExamTarget = (targetId: string) => {
  const anchor = document.getElementById(targetId);
  if (!anchor) return false;
  const target = targetId.startsWith("ce-content-")
    ? (anchor.closest("tr") ??
      anchor.closest(
        "h1, h2, h3, h4, h5, h6, li, p, blockquote, th, td",
      ) ??
      anchor)
    : anchor;

  let ancestor: HTMLElement | null = target;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }

  window.requestAnimationFrame(() =>
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.remove("ce-target-highlight");
      void target.offsetWidth;
      target.classList.add("ce-target-highlight");
      window.setTimeout(
        () => target.classList.remove("ce-target-highlight"),
        1000,
      );
    }),
  );
  return true;
};

// Comment/reply bodies are stored as plain text; render them as markdown so
// line breaks, lists, and basic formatting survive (same pipeline as answers,
// minus the citation handling that only applies to answers).
function CommentMarkdown({ body }: { body: string }) {
  return (
    <div className="ce-comment-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

function CommentThread({
  answerId = null,
  comments,
  questionId = null,
}: {
  answerId?: string | null;
  comments: TopicQuestion["questionComments"];
  questionId?: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const topLevel = comments.filter((comment) => !comment.parentCommentId);

  const addComment = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    setError("");
    const supabase = createCoreExamBrowserClient();
    const { error: commentError } = await supabase.rpc(
      "core_exam_add_comment",
      {
        comment_body: draft.trim(),
        reply_to_comment_id: replyTo,
        target_answer_id: answerId,
        target_question_id: questionId,
      },
    );
    setSaving(false);
    if (commentError) {
      setError("We couldn’t add that comment.");
      return;
    }
    setDraft("");
    setReplyTo(null);
    router.refresh();
  };

  return (
    <div className="ce-card-discussion">
      <div className="ce-card-discussion-heading">
        <strong>Discussion</strong>
        <span>{comments.length}</span>
      </div>
      {topLevel.length > 0 && (
        <div className="ce-card-comments">
          {topLevel.map((comment) => (
            <article id={`ce-comment-${comment.id}`} key={comment.id}>
              <div>
                <strong style={hueNameStyle(comment.authorColor)}>
                  {comment.authorName}
                </strong>
                <time dateTime={comment.createdAt} suppressHydrationWarning>
                  {formatAnswerTimestamp(comment.createdAt)}
                </time>
              </div>
              <CommentMarkdown body={comment.body} />
              <button
                onClick={() => setReplyTo(comment.id)}
                type="button"
              >
                Reply
              </button>
              {comments
                .filter((reply) => reply.parentCommentId === comment.id)
                .map((reply) => (
                  <article
                    className="ce-card-reply"
                    id={`ce-comment-${reply.id}`}
                    key={reply.id}
                  >
                    <div>
                      <strong style={hueNameStyle(reply.authorColor)}>
                        {reply.authorName}
                      </strong>
                      <time
                        dateTime={reply.createdAt}
                        suppressHydrationWarning
                      >
                        {formatAnswerTimestamp(reply.createdAt)}
                      </time>
                    </div>
                    <CommentMarkdown body={reply.body} />
                  </article>
                ))}
            </article>
          ))}
        </div>
      )}
      <div className="ce-card-comment-composer">
        {replyTo && (
          <button onClick={() => setReplyTo(null)} type="button">
            Cancel reply
          </button>
        )}
        <textarea
          aria-label={replyTo ? "Write a reply" : "Add a comment"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key === "Enter" &&
              !saving &&
              draft.trim()
            ) {
              event.preventDefault();
              void addComment();
            }
          }}
          placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
          rows={2}
          value={draft}
        />
        <div>
          <span>{error}</span>
          <button
            disabled={saving || !draft.trim()}
            onClick={addComment}
            type="button"
          >
            {saving ? "Adding…" : replyTo ? "Reply" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

type GroupDiscussionEntry = {
  actor: string;
  actorColor: string | null;
  body: string;
  // true when body is the member's own words (answer/comment/contribution), so
  // it takes their hue; false when it identifies a question (stays neutral).
  bodyIsUserContent: boolean;
  contributionId: string | null;
  createdAt: string;
  label: string;
  target: string;
};

function buildGroupDiscussionEntries({
  activityEvents,
  contributions,
  pageStableKey,
  questions,
  verifications,
}: {
  activityEvents: CoreExamActivityItem[];
  contributions: PageContributions;
  pageStableKey: string;
  questions: TopicQuestion[];
  verifications: PageVerifications;
}): GroupDiscussionEntry[] {
  const questionEntries = questions
    .flatMap((question) => {
      const questionTarget = `ce-question-${question.id}`;
      const questionEntries = question.questionComments.map((comment) => ({
        actor: comment.authorName,
        actorColor: comment.authorColor,
        body: comment.body,
        createdAt: comment.createdAt,
        contributionId: null,
        bodyIsUserContent: true,
        label: "commented on a question",
        target: `ce-comment-${comment.id}`,
      }));
      if (question.origin === "submitted") {
        questionEntries.push({
          actor: question.submittedByName ?? "Study member",
          actorColor: question.submittedByColor,
          body: question.prompt,
          createdAt: question.createdAt,
          contributionId: null,
          bodyIsUserContent: false,
          label: "submitted a question",
          target: questionTarget,
        });
      }
      const answers = [
        ...(question.myAnswer?.visibility === "group"
          ? [question.myAnswer]
          : []),
        ...question.groupAnswers,
      ];
      const answerEntries = answers.flatMap((answer) => [
        {
          actor: answer.authorName,
          actorColor: answer.authorColor,
          body: answer.plainText,
          createdAt: answer.editedAt,
          contributionId: null,
          bodyIsUserContent: true,
          label: "updated an answer",
          target: `ce-answer-${answer.id}`,
        },
        ...answer.comments.map((comment) => ({
          actor: comment.authorName,
          actorColor: comment.authorColor,
          body: comment.body,
          createdAt: comment.createdAt,
          contributionId: null,
          bodyIsUserContent: true,
          label: `commented on ${answer.authorName}’s answer`,
          target: `ce-comment-${comment.id}`,
        })),
      ]);
      return [...questionEntries, ...answerEntries];
    });
  const verificationEntries = Object.values(verifications).flatMap(
    (verification) =>
      verification.history.map((event) => ({
        actor: event.actorName,
        actorColor: event.actorColor,
        bodyIsUserContent: false,
        body:
          event.note ??
          labelForContentStableKey(
            verification.stableKey,
            pageStableKey,
          ),
        createdAt: event.createdAt,
        contributionId: null,
        label:
          event.state === "verified"
            ? "verified canonical content"
            : event.state === "flagged"
              ? "flagged canonical content"
              : "marked canonical content unverified",
        target: `ce-content-${verification.stableKey}`,
      })),
  );
  const contributionEntries = Object.values(contributions).flatMap(
    (items) =>
      items
        .filter((contribution) => contribution.visibility === "group")
        .map((contribution) => ({
          actor: contribution.authorName,
          actorColor: contribution.authorColor,
          bodyIsUserContent: true,
          body: contribution.plainText,
          contributionId: contribution.id,
          createdAt: contribution.editedAt,
          label: `shared a ${contribution.kind} on canonical content`,
          target: `ce-content-${contribution.stableKey}`,
        })),
  );
  const studySignalEntries = activityEvents
    .filter(
      (event) =>
        event.topicStableKey === pageStableKey &&
        (event.action === "likelihood_marked" ||
          event.action === "question_hidden" ||
          event.action === "question_shown"),
    )
    .map((event) => ({
      actor: event.actorName,
      actorColor: event.actorColor,
      bodyIsUserContent: false,
      body: event.prompt,
      contributionId: null,
      createdAt: event.createdAt,
      label:
        event.action === "likelihood_marked"
          ? `marked this question ${event.metadata.likelihood ?? "unsure"}`
          : event.action === "question_hidden"
            ? "hid this question for themselves"
            : "restored this question for themselves",
      target: `ce-question-${event.questionId}`,
    }));

  return [
    ...questionEntries,
    ...verificationEntries,
    ...contributionEntries,
    ...studySignalEntries,
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
}

function GroupDiscussionFeed({
  entries,
  onRevealTarget,
}: {
  entries: GroupDiscussionEntry[];
  onRevealTarget: (targetId: string) => void;
}) {
  const navigateToEntry = (entry: GroupDiscussionEntry) => {
    onRevealTarget(entry.target);
    if (!entry.contributionId) return;
    window.requestAnimationFrame(() =>
      window.dispatchEvent(
        new CustomEvent("core-exam:open-contribution", {
          detail: {
            contributionId: entry.contributionId,
            stableKey: entry.target.replace(/^ce-content-/, ""),
          },
        }),
      ),
    );
  };

  if (entries.length === 0) {
    return (
      <p className="ce-discussion-empty">
        No discussion yet. Start the conversation.
      </p>
    );
  }

  return (
    <>
      {entries.slice(0, 30).map((entry, index) => (
        <button
          className="ce-feed-entry"
          key={`${entry.target}-${entry.createdAt}-${index}`}
          onClick={() => navigateToEntry(entry)}
          type="button"
        >
          <span>
            <span className="ce-feed-entry-head">
              <span className="ce-feed-entry-summary">
                <strong style={hueNameStyle(entry.actorColor)}>
                  {entry.actor}
                </strong>{" "}
                {entry.label}
              </span>
              <small suppressHydrationWarning>
                {formatAnswerTimestamp(entry.createdAt)}
              </small>
            </span>
            <p
              style={
                entry.bodyIsUserContent
                  ? hueNameStyle(entry.actorColor)
                  : undefined
              }
            >
              {entry.body}
            </p>
          </span>
        </button>
      ))}
    </>
  );
}

function QuestionCard({
  onOpenSource,
  question,
  roster,
  viewerId,
}: {
  onOpenSource: (source: OpenSource) => void;
  question: TopicQuestion;
  roster: RingMember[];
  viewerId: string | null;
}) {
  const router = useRouter();
  // Exam-relevance notch (always shown): unmarked reads as "unsure".
  const relevanceKey = question.myLikelihood ?? "unsure";
  const relevanceLabel =
    RELEVANCE_SECTIONS.find((section) => section.key === relevanceKey)?.label ??
    "";
  // Optimistic own confidence level; resyncs when the server value changes.
  const [myLevel, setMyLevel] = useState<number | null>(question.myConfidence);
  useEffect(() => {
    setMyLevel(question.myConfidence);
  }, [question.myConfidence]);
  const saveConfidence = async (level: number) => {
    const previous = myLevel;
    setMyLevel(level);
    const supabase = createCoreExamBrowserClient();
    const { error } = await supabase.rpc("core_exam_set_confidence", {
      p_target_type: "question",
      p_target_id: question.id,
      p_level: level,
    });
    if (error) {
      // The optimistic level silently reverts; log so failures aren't invisible.
      console.error("[confidence] save failed", error.code, error.message);
      setMyLevel(previous);
    }
  };
  // Every active member's ring: the viewer's shows their optimistic level, the
  // rest come from the server. Members who haven't set one render empty.
  const ringMembers = roster.map((member) => ({
    id: member.userId,
    name: member.displayName,
    color: member.avatarColor,
    level:
      member.userId === viewerId
        ? myLevel
        : (question.confidenceByUser[member.userId] ?? null),
    hidden: question.hiddenBy.some((entry) => entry.id === member.userId),
  }));
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"personal" | "others" | "discussion">(
    "personal",
  );
  const [answerText, setAnswerText] = useState(
    question.myAnswer?.plainText ?? "",
  );
  // The public/private toggle is hidden for now — everyone works publicly. We
  // still send this to the backend (so the feature can return later): keep an
  // existing answer's stored visibility on re-save, default new answers to public.
  const visibility: "group" | "private" =
    question.myAnswer?.visibility ?? "group";
  const [saving, setSaving] = useState(false);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const [error, setError] = useState("");
  // Once the refreshed answer lands (new id or revision), drop the
  // "Saving answer…" placeholder.
  useEffect(() => {
    setAwaitingAnswer(false);
  }, [question.myAnswer?.id, question.myAnswer?.editedAt]);

  const setLikelihood = async (likelihood: QuestionLikelihood) => {
    setError("");
    const supabase = createCoreExamBrowserClient();
    const { error: likelihoodError } = await supabase.rpc(
      "core_exam_set_question_likelihood",
      {
        selected_likelihood: likelihood,
        target_question_id: question.id,
      },
    );
    if (likelihoodError) {
      setError("We couldn’t save that test-likelihood mark.");
      return;
    }
    router.refresh();
  };

  const setHidden = async (shouldHide: boolean) => {
    setError("");
    const supabase = createCoreExamBrowserClient();
    const { error: hiddenError } = await supabase.rpc(
      "core_exam_set_question_hidden",
      {
        should_hide: shouldHide,
        target_question_id: question.id,
      },
    );
    if (hiddenError) {
      setError("We couldn’t update that hidden-question setting.");
      return;
    }
    router.refresh();
  };

  const saveAnswer = async () => {
    if (!answerText.trim()) return;
    setSaving(true);
    setAwaitingAnswer(true);
    setError("");
    const supabase = createCoreExamBrowserClient();
    const { error: answerError } = await supabase.rpc(
      "core_exam_save_personal_answer",
      {
        answer_body: {
          content: [
            {
              content: [{ text: answerText.trim(), type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        answer_edit_summary: null,
        answer_plain_text: answerText.trim(),
        answer_visibility: visibility,
        base_revision_id: question.myAnswer?.currentRevisionId ?? null,
        target_question_id: question.id,
      },
    );
    setSaving(false);
    if (answerError) {
      setAwaitingAnswer(false);
      setError(
        answerError.code === "40001"
          ? "This answer changed elsewhere. Reload and review it before saving."
          : "We couldn’t save your answer.",
      );
      return;
    }
    setEditing(false);
    router.refresh();
    // Safety net: if the refreshed answer never arrives (realtime hiccup),
    // drop the placeholder anyway so the card doesn't hang on "Saving…".
    window.setTimeout(() => setAwaitingAnswer(false), 6000);
  };

  return (
    <details className="ce-question-card" id={`ce-question-${question.id}`}>
      <summary>
        {/* Inside <summary> so it stays visible when the card is collapsed;
            absolutely positioned, so it's out of the summary grid. */}
        <span
          className="ce-question-notch"
          data-relevance={relevanceKey}
          title={relevanceLabel}
        />
        <span className="ce-question-index">
          {String(Math.round(question.rank / 1000)).padStart(2, "0")}
        </span>
        <span className="ce-question-prompt">{question.prompt}</span>
        <span className="ce-question-summary-meta">
          {/* Stop pointer/click from toggling the <summary> while dragging. */}
          <span
            className="ce-question-confidence"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <ConfidenceSlider onChange={saveConfidence} value={myLevel} />
          </span>
          <ConfidenceRings members={ringMembers} />
        </span>
      </summary>
      <div className="ce-question-body">
        {question.origin === "submitted" && (
          <p className="ce-question-origin">
            Asked by {question.submittedByName}
          </p>
        )}
        <div className="ce-card-tabs" role="tablist">
          {(["personal", "others", "discussion"] as const).map((key) => (
            <button
              aria-selected={tab === key}
              className="ce-card-tab"
              key={key}
              onClick={() => setTab(key)}
              role="tab"
              type="button"
            >
              {key === "personal"
                ? "My Answer"
                : key === "others"
                  ? "Others' Answers"
                  : "General Discussion"}
            </button>
          ))}
        </div>

        {tab === "personal" && (
        <section
          className="ce-answer-block ce-answer-mine"
          id={question.myAnswer ? `ce-answer-${question.myAnswer.id}` : undefined}
        >
          <div className="ce-answer-heading">
            <div>
              <p className="ce-eyebrow">Personal</p>
              <h4>My answer</h4>
            </div>
            {!editing &&
              (question.myAnswer ? (
                <button
                  aria-label="Update my answer"
                  className="ce-answer-edit-button"
                  onClick={() => setEditing(true)}
                  title="Update my answer"
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    viewBox="0 0 24 24"
                    width="14"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              ) : (
                <button onClick={() => setEditing(true)} type="button">
                  Write my answer
                </button>
              ))}
          </div>
          {awaitingAnswer ? (
            <SavingIndicator label="Saving answer" />
          ) : editing ? (
            <div className="ce-answer-editor">
              <textarea
                aria-label="My answer"
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter" &&
                    !saving
                  ) {
                    event.preventDefault();
                    void saveAnswer();
                  }
                }}
                onChange={(event) => setAnswerText(event.target.value)}
                rows={6}
                value={answerText}
              />
              <div>
                <span>
                  <button
                    className="ce-answer-cancel"
                    onClick={() => setEditing(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving || !answerText.trim()}
                    onClick={saveAnswer}
                    type="button"
                  >
                    {saving ? "Saving…" : "Save answer"}
                  </button>
                </span>
              </div>
            </div>
          ) : question.myAnswer ? (
            <AnswerMarkdown
              markdown={question.myAnswer.plainText}
              onOpenSource={onOpenSource}
            />
          ) : (
            <p className="ce-answer-empty">
              You haven’t answered this yet.
            </p>
          )}
          {question.myAnswer && (
            <CommentThread
              answerId={question.myAnswer.id}
              comments={question.myAnswer.comments}
            />
          )}
        </section>
        )}

        {tab === "others" && (
          <section className="ce-answer-block">
            <p className="ce-eyebrow">Other perspectives</p>
            <h4>Answers from the group</h4>
            {question.groupAnswers.length === 0 && (
              <p className="ce-answer-empty">
                No answers from the group yet.
              </p>
            )}
            {question.groupAnswers.map((answer) => (
              <article
                className="ce-group-answer"
                id={`ce-answer-${answer.id}`}
                key={answer.id}
              >
                <div className="ce-group-answer-meta">
                  <strong style={hueNameStyle(answer.authorColor)}>
                    {answer.authorName}
                  </strong>
                  <time dateTime={answer.editedAt} suppressHydrationWarning>
                    {formatAnswerTimestamp(answer.editedAt)}
                  </time>
                </div>
                <AnswerMarkdown
                  markdown={answer.plainText}
                  onOpenSource={onOpenSource}
                />
                <CommentThread
                  answerId={answer.id}
                  comments={answer.comments}
                />
              </article>
            ))}
          </section>
        )}

        {tab === "discussion" && (
          <CommentThread
            comments={question.questionComments}
            questionId={question.id}
          />
        )}

        <section className="ce-likelihood">
          <div>
            <p className="ce-eyebrow">Exam relevance</p>
            <h4>How likely is this to be tested?</h4>
          </div>
          <div className="ce-likelihood-options">
            {(["likely", "unsure", "unlikely"] as const).map((option) => (
              <button
                aria-pressed={question.myLikelihood === option}
                data-likelihood={option}
                key={option}
                onClick={() => setLikelihood(option)}
                title={
                  question.likelihood[option].length
                    ? question.likelihood[option]
                        .map((person) => person.name)
                        .join(", ")
                    : `No one chose ${option}`
                }
                type="button"
              >
                <span>{option}</span>
                <small>{question.likelihood[option].length}</small>
              </button>
            ))}
          </div>
          {(["likely", "unsure", "unlikely"] as const).some(
            (option) => question.likelihood[option].length > 0,
          ) && (
            <details className="ce-likelihood-attribution">
              <summary>See who chose each</summary>
              <dl>
                {(["likely", "unsure", "unlikely"] as const)
                  .filter(
                    (option) =>
                      question.likelihood[option].length > 0,
                  )
                  .map((option) => (
                    <div key={option}>
                      <dt>
                        {option[0].toUpperCase()}
                        {option.slice(1)}
                      </dt>
                      <dd>
                        {question.likelihood[option]
                          .map((person) => person.name)
                          .join(", ")}
                      </dd>
                    </div>
                  ))}
              </dl>
            </details>
          )}
          <div className="ce-question-hide">
            <button
              onClick={() => setHidden(!question.isHiddenForMe)}
              type="button"
            >
              {question.isHiddenForMe
                ? "Show this question again"
                : "Hide this question (personally)"}
            </button>
            {question.hiddenBy.length > 0 && (
              <span>
                Hidden by{" "}
                {question.hiddenBy.map((person) => person.name).join(", ")}
              </span>
            )}
          </div>
        </section>
        {error && <p className="ce-question-error">{error}</p>}
      </div>
    </details>
  );
}

function AnswerMarkdown({
  markdown,
  onOpenSource,
}: {
  markdown: string;
  onOpenSource: (source: OpenSource) => void;
}) {
  return (
    <div className="ce-answer-markdown">
      <ReactMarkdown
        components={{
          code({ children, className, ...props }) {
            const value = String(children).replace(/\n$/, "");

            if (isCitationToken(value)) {
              const resolved = resolveCitationSource(value);
              if (resolved) {
                return (
                  <button
                    className="ce-citation ce-citation-button"
                    onClick={() =>
                      onOpenSource({
                        citation: value,
                        ...resolved,
                      })
                    }
                    title={`View source ${value}`}
                    type="button"
                  >
                    {value}
                  </button>
                );
              }

              return <span className="ce-citation">{value}</span>;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {formatAnswerMarkdown(markdown)}
      </ReactMarkdown>
    </div>
  );
}

function AskQuestionForm({
  onQuestionAdded,
  topicStableKey,
}: {
  onQuestionAdded: (data: {
    questionId: string;
    commentId: string | null;
    prompt: string;
    detail: string;
  }) => void;
  topicStableKey: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const submitQuestion = async () => {
    if (prompt.trim().length < 5) return;
    setSubmitting(true);
    setMessage("");
    const supabase = createCoreExamBrowserClient();
    const { data: topic } = await supabase
      .from("core_exam_content_nodes")
      .select("id")
      .eq("stable_key", topicStableKey)
      .eq("kind", "topic")
      .maybeSingle();
    if (!topic) {
      setSubmitting(false);
      setMessage("We couldn’t find this topic.");
      return;
    }

    const trimmedDetail = detail.trim();
    const submittedPrompt = prompt.trim();
    const { data: newQuestionId, error } = await supabase.rpc(
      "core_exam_submit_question",
      {
        question_detail: null,
        question_prompt: submittedPrompt,
        target_topic_node_id: topic.id,
      },
    );
    if (error || typeof newQuestionId !== "string") {
      setSubmitting(false);
      setMessage("We couldn’t submit that question.");
      return;
    }
    // Seed the submitter's context as the opening comment on the new
    // question's thread. Best-effort: the question already exists, so a
    // failed comment shouldn't block the success path.
    let commentId: string | null = null;
    if (trimmedDetail) {
      const { data: newCommentId } = await supabase.rpc(
        "core_exam_add_comment",
        {
          comment_body: trimmedDetail,
          reply_to_comment_id: null,
          target_answer_id: null,
          target_question_id: newQuestionId,
        },
      );
      commentId = typeof newCommentId === "string" ? newCommentId : null;
    }
    setSubmitting(false);
    setPrompt("");
    setDetail("");
    setMessage("Your question was added to this topic.");
    // Insert optimistically instead of refreshing so the scroll never resets.
    onQuestionAdded({
      commentId,
      detail: trimmedDetail,
      prompt: submittedPrompt,
      questionId: newQuestionId,
    });
  };

  return (
    <section aria-labelledby="ce-ask-question" className="ce-ask-question">
      <p className="ce-eyebrow">Contribute</p>
      <h3 id="ce-ask-question">Add a question</h3>
      <p>Add something you think is important to understand.</p>
      <label htmlFor="ce-question-prompt">Question</label>
      <input
        id="ce-question-prompt"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter" &&
            !submitting &&
            prompt.trim().length >= 5
          ) {
            event.preventDefault();
            void submitQuestion();
          }
        }}
        placeholder="What do you want the group to work through?"
        value={prompt}
      />
      <label htmlFor="ce-question-detail">Context (optional)</label>
      <textarea
        id="ce-question-detail"
        onChange={(event) => setDetail(event.target.value)}
        onKeyDown={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter" &&
            !submitting &&
            prompt.trim().length >= 5
          ) {
            event.preventDefault();
            void submitQuestion();
          }
        }}
        rows={3}
        value={detail}
      />
      <div>
        <span>{message}</span>
        <button
          disabled={submitting || prompt.trim().length < 5}
          onClick={submitQuestion}
          type="button"
        >
          {submitting ? "Adding…" : "Ask the group"}
        </button>
      </div>
    </section>
  );
}

export function CoreExamFrame({
  activity,
  collaborativeEmpty,
  contributions,
  initialTargetId,
  selectedTopic,
  markdown,
  questions: initialQuestions,
  scoreboard,
  sourceAvailable,
  topicConfidence,
  verifications,
  viewer,
}: CoreExamFrameProps) {
  useLiveActivity(viewer?.spaceId, viewer?.userId);
  useLiveConfidence(viewer?.spaceId, viewer?.userId);
  // Viewer's own confidence for the whole topic (optimistic; resyncs on load).
  const [topicLevel, setTopicLevel] = useState<number | null>(
    topicConfidence.myLevel,
  );
  useEffect(() => {
    setTopicLevel(topicConfidence.myLevel);
  }, [topicConfidence.myLevel]);
  const saveTopicConfidence = async (level: number) => {
    if (!topicConfidence.topicNodeId) return;
    const previous = topicLevel;
    setTopicLevel(level);
    const supabase = createCoreExamBrowserClient();
    const { error } = await supabase.rpc("core_exam_set_confidence", {
      p_target_type: "topic",
      p_target_id: topicConfidence.topicNodeId,
      p_level: level,
    });
    if (error) {
      console.error("[confidence] topic save failed", error.code, error.message);
      setTopicLevel(previous);
    }
  };
  // Active members only (observers + assistant excluded), in join order — the
  // roster for each card's group answer-status rings.
  const ringRoster: RingMember[] = scoreboard
    .filter((member) => member.participation === "active")
    .map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      avatarColor: member.avatarColor,
    }));
  const [mobileMode, setMobileMode] = useState<"content" | "discussion">(
    "content",
  );
  const [discussionCollapsed, setDiscussionCollapsed] = useState(false);
  // Sort-by-relevance defaults ON for everyone; an explicit choice either way
  // is remembered (localStorage). Start from the default so server and first
  // client render match, then apply any stored override on mount.
  const [sortByRelevance, setSortByRelevance] = useState(true);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ce-sort-relevance");
      if (stored === "off") setSortByRelevance(false);
      else if (stored === "on") setSortByRelevance(true);
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }, []);
  const setSortPreference = (next: boolean) => {
    setSortByRelevance(next);
    try {
      localStorage.setItem("ce-sort-relevance", next ? "on" : "off");
    } catch {
      // ignore storage failures
    }
  };
  // Cards animate to their new spot when the sort toggle flips or a card's
  // exam-relevance changes (which moves it between sections). Uses shared-layout
  // (layoutId) so a card tracked across the flat↔grouped structure change — and
  // across parent sections — tweens instead of jumping. Honors reduced motion.
  const reduceMotion = useReducedMotion();
  const cardLayout = reduceMotion ? false : "position";
  const cardLayoutTransition = {
    layout: { type: "spring", stiffness: 500, damping: 40 },
  } as const;
  const [openSource, setOpenSource] = useState<OpenSource | null>(null);
  const [enterQuestionId, setEnterQuestionId] = useState<string | null>(null);
  // Topic switches are same-segment (searchParam) navigations, which don't
  // trigger loading.tsx. Show a centered loader if a switch takes longer than a
  // short beat so fast loads never flash it.
  const [navigating, setNavigating] = useState(false);
  const navTimerRef = useRef<number | null>(null);
  const beginNavigation = useCallback(() => {
    if (!TOPIC_NAV_LOADER_ENABLED) return;
    // flushSync paints the overlay synchronously before Link's navigation
    // transition, which would otherwise defer this update out of view.
    flushSync(() => setNavigating(true));
    // Safety net: never let the loader stick if a navigation stalls.
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    navTimerRef.current = window.setTimeout(() => setNavigating(false), 4000);
  }, []);
  const beginTopicNavigation = useCallback(
    (targetKey: string) => {
      // Clicking the current topic doesn't change selectedTopic, so the
      // clear-on-topic-change effect never fires — skip it to avoid a hang.
      if (targetKey === selectedTopic.stableKey) return;
      beginNavigation();
    },
    [selectedTopic.stableKey, beginNavigation],
  );
  useEffect(() => {
    if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    setNavigating(false);
  }, [selectedTopic.stableKey]);
  // Mobile: All Questions + Activity collapse behind a hamburger. Plain state
  // (not <details>) so the same markup shows the two actions inline on desktop.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  // Local copy of the server questions so a newly-submitted question can be
  // inserted optimistically — no router.refresh(), so the reading scroll never
  // resets and the new card reveals reliably. A later server refresh (from any
  // other action) resyncs this to the authoritative list.
  const [questions, setQuestions] = useState(initialQuestions);
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);
  const handleQuestionAdded = useCallback(
    (data: {
      questionId: string;
      commentId: string | null;
      prompt: string;
      detail: string;
    }) => {
      const now = new Date().toISOString();
      const authorName = viewer?.displayName ?? "You";
      const authorId = viewer?.userId ?? "me";
      const authorColor = viewer?.avatarColor ?? null;
      const trimmedDetail = data.detail.trim();
      setQuestions((previous) => {
        const nextRank =
          previous.reduce(
            (highest, question) => Math.max(highest, question.rank),
            0,
          ) + 1000;
        const newQuestion: TopicQuestion = {
          createdAt: now,
          groupAnswers: [],
          answeredBy: [],
          hiddenBy: [],
          id: data.questionId,
          isHiddenForMe: false,
          likelihood: { likely: [], unlikely: [], unsure: [] },
          myAnswer: null,
          myLikelihood: null,
          confidenceByUser: {},
          myConfidence: null,
          origin: "submitted",
          prompt: data.prompt.trim(),
          questionComments:
            trimmedDetail && data.commentId
              ? [
                  {
                    authorId,
                    authorName,
                    authorColor,
                    body: trimmedDetail,
                    createdAt: now,
                    id: data.commentId,
                    parentCommentId: null,
                  },
                ]
              : [],
          rank: nextRank,
          submittedByName: authorName,
          submittedByColor: authorColor,
        };
        return [...previous, newQuestion];
      });
      setEnterQuestionId(data.questionId);
    },
    [viewer],
  );
  // Answered-status metrics ignore questions the viewer has hidden for
  // themselves, so the count reflects their active study set.
  const countedQuestions = questions.filter(
    (question) => !question.isHiddenForMe,
  );
  const countedTotal = countedQuestions.length;
  // Non-hidden questions in order — the sticky TOC's jump targets.
  const tocQuestionIds = countedQuestions.map((question) => question.id);
  const answeredCount = countedQuestions.filter(
    (question) => question.myAnswer,
  ).length;
  const discussionEntries = buildGroupDiscussionEntries({
    activityEvents: activity.events,
    contributions,
    pageStableKey: selectedTopic.stableKey,
    questions,
    verifications,
  });
  const revealTarget = useCallback((targetId: string) => {
    setMobileMode("content");
    window.requestAnimationFrame(() => {
      revealCoreExamTarget(targetId);
    });
  }, []);
  useEffect(() => {
    const targetId =
      initialTargetId ??
      (window.location.hash
        ? decodeURIComponent(window.location.hash.slice(1))
        : null);
    if (!targetId) return;
    let attempts = 0;
    const reveal = () => {
      attempts += 1;
      if (!revealCoreExamTarget(targetId) && attempts < 12) {
        window.setTimeout(reveal, 50);
      }
    };
    reveal();
  }, [initialTargetId, selectedTopic.stableKey]);
  // Once a freshly-submitted question lands in the list, scroll it into view
  // and play a gentle entrance so it arrives rather than jumps.
  useEffect(() => {
    if (!enterQuestionId) return;
    if (!questions.some((question) => question.id === enterQuestionId)) return;
    const domId = `ce-question-${enterQuestionId}`;
    setEnterQuestionId(null);
    const card = document.getElementById(domId);
    if (!card) return;
    card.classList.add("ce-question-entering");
    window.setTimeout(
      () => card.classList.remove("ce-question-entering"),
      700,
    );
    // The reading column and its wrapper are nested scroll containers, so a
    // single scrollIntoView only moves the card partway. Iterate until it lands
    // in view — safe now that the optimistic insert means no refresh fights us.
    let iterations = 0;
    const reveal = () => {
      iterations += 1;
      const target = document.getElementById(domId);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 800;
      const inView = rect.top >= 64 && rect.top <= viewportHeight * 0.7;
      if (inView || iterations >= 6) return;
      target.scrollIntoView({
        behavior: iterations === 1 ? "smooth" : "auto",
        block: "center",
      });
      window.setTimeout(reveal, 80);
    };
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(reveal),
    );
  }, [enterQuestionId, questions]);
  const openSourceViewer = (nextSource: OpenSource) => {
    if (window.matchMedia("(max-width: 1024px)").matches) {
      const params = new URLSearchParams();
      if (nextSource.citation) {
        params.set("citation", nextSource.citation);
      }
      if (nextSource.page) {
        params.set("page", String(nextSource.page));
      }
      const query = params.size > 0 ? `?${params.toString()}` : "";
      window.location.assign(
        `/core-exam-1/sources/${encodeURIComponent(nextSource.source.sourceKey)}${query}`,
      );
      return;
    }

    setOpenSource(nextSource);
  };
  const signOut = async () => {
    const supabase = createCoreExamBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/core-exam-1/login");
  };
  const identity = viewer ?? {
    avatarColor: "#2f7b68",
    displayName: "Justin",
    email: "Preview identity",
    role: "owner" as const,
    spaceId: "preview",
    userId: "preview",
  };

  return (
    <main className="ce-app">
      <header className="ce-header">
        <div className="ce-brand">
          <CoreStudyLogo className="ce-brand-logo" />
          <div>
            <p className="ce-eyebrow">Study space</p>
            <h1>Core Exam 1</h1>
          </div>
        </div>

        {/* Mobile-only Topics button — sits left of the scorecard (desktop uses
            the sidebar instead, where this is display:none). */}
        <details className="ce-mobile-topics">
          <summary>Topics</summary>
          <nav aria-label="Mobile study topics">
            {[...TOPICS, ...REFERENCES].map((topic) => (
              <Link
                className={
                  topic.stableKey === selectedTopic.stableKey
                    ? "ce-mobile-topic-active"
                    : undefined
                }
                href={`/core-exam-1?topic=${encodeURIComponent(topic.stableKey)}`}
                key={topic.stableKey}
                onNavigate={() => beginTopicNavigation(topic.stableKey)}
              >
                <span>
                  {topic.number
                    ? String(topic.number).padStart(2, "0")
                    : "REF"}
                </span>
                {topic.label}
              </Link>
            ))}
            <Link href="/core-exam-1/sources">
              <span>REF</span>
              Source library
            </Link>
          </nav>
        </details>

        <Scoreboard members={scoreboard} />

        <div className="ce-header-actions">
          {/* All Questions + Activity: inline on desktop, collapsed behind a
              hamburger on phones. One ActivityPanel instance either way. */}
          <div className="ce-actions-menu" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-label="Menu"
              className="ce-actions-menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="currentColor"
                height="16"
                viewBox="0 0 16 16"
                width="16"
              >
                <rect height="1.6" rx="0.8" width="14" x="1" y="3" />
                <rect height="1.6" rx="0.8" width="14" x="1" y="7.2" />
                <rect height="1.6" rx="0.8" width="14" x="1" y="11.4" />
              </svg>
              {activity.hasUnviewed && (
                <span className="ce-activity-unviewed-dot" aria-hidden="true" />
              )}
            </button>
            <div
              className="ce-actions-menu-content"
              data-open={menuOpen || undefined}
            >
              <Link
                className="ce-quiet-button"
                href="/core-exam-1?view=all-questions"
                onNavigate={() => {
                  beginNavigation();
                  setMenuOpen(false);
                }}
              >
                All Questions
              </Link>
              <ActivityPanel
                currentTopicStableKey={selectedTopic.stableKey}
                events={activity.events}
                initialHasUnviewed={activity.hasUnviewed}
                latestOtherEventId={activity.latestOtherEventId}
                onRevealTarget={revealTarget}
              />
              <ThemeToggle />
            </div>
          </div>
          <details className="ce-identity-menu">
            <summary className="ce-identity">
              <span
                className="ce-avatar"
                style={{ background: identity.avatarColor }}
                aria-hidden="true"
              >
                {identity.displayName[0]}
              </span>
              <span>
                <small>Studying as</small>
                {identity.displayName}
              </span>
            </summary>
            <div className="ce-identity-popover">
              <strong>{identity.displayName}</strong>
              <span>{identity.email}</span>
              <span className="ce-identity-role">{identity.role}</span>
              {viewer?.role === "owner" &&
                process.env.NODE_ENV === "development" && (
                  <Link href="/core-exam-1/question-workshop">
                    Question Workshop
                  </Link>
                )}
              {viewer && (
                <button onClick={signOut} type="button">
                  Sign out
                </button>
              )}
            </div>
          </details>
        </div>
      </header>

      <div className="ce-body">
        {selectedTopic.kind === "topic" && tocQuestionIds.length > 0 && (
          <QuestionTOC questionIds={tocQuestionIds} />
        )}
        <aside className="ce-sidebar" aria-label="Study topics">
          <p className="ce-sidebar-label">Exam topics</p>
          <nav>
            {TOPICS.map((topic) => (
              <Link
                className={
                  topic.stableKey === selectedTopic.stableKey
                    ? "ce-topic-link ce-topic-link-active"
                    : "ce-topic-link"
                }
                href={`/core-exam-1?topic=${encodeURIComponent(topic.stableKey)}`}
                key={topic.stableKey}
                onNavigate={() => beginTopicNavigation(topic.stableKey)}
              >
                <span>{String(topic.number).padStart(2, "0")}</span>
                {topic.label}
              </Link>
            ))}
          </nav>
          <p className="ce-sidebar-label ce-sidebar-reference-label">
            Reference
          </p>
          <nav>
            <Link className="ce-topic-link" href="/core-exam-1/sources">
              <span aria-hidden="true">•</span>
              Source library
            </Link>
            {REFERENCES.filter(
              (reference) => reference.stableKey === "reference.kessler-chart",
            ).map((reference) => (
              <Link
                className={
                  reference.stableKey === selectedTopic.stableKey
                    ? "ce-topic-link ce-topic-link-active"
                    : "ce-topic-link"
                }
                href={`/core-exam-1?topic=${encodeURIComponent(reference.stableKey)}`}
                key={reference.stableKey}
                onNavigate={() => beginTopicNavigation(reference.stableKey)}
              >
                <span aria-hidden="true">•</span>
                {reference.label}
              </Link>
            ))}
            <details
              className="ce-sidebar-archive"
              open={
                selectedTopic.kind === "reference" &&
                selectedTopic.stableKey !== "reference.kessler-chart"
              }
            >
              <summary>Archive</summary>
              <nav>
                {REFERENCES.filter(
                  (reference) =>
                    reference.stableKey !== "reference.kessler-chart",
                ).map((reference) => (
                  <Link
                    className={
                      reference.stableKey === selectedTopic.stableKey
                        ? "ce-topic-link ce-topic-link-active"
                        : "ce-topic-link"
                    }
                    href={`/core-exam-1?topic=${encodeURIComponent(reference.stableKey)}`}
                    key={reference.stableKey}
                    onNavigate={() => beginTopicNavigation(reference.stableKey)}
                  >
                    <span aria-hidden="true">•</span>
                    {reference.label}
                  </Link>
                ))}
              </nav>
            </details>
          </nav>
        </aside>

        <section className="ce-main">
          <div
            className="ce-mobile-switcher"
            role="tablist"
            aria-label="Page view"
          >
            <button
              aria-selected={mobileMode === "content"}
              onClick={() => setMobileMode("content")}
              role="tab"
              type="button"
            >
              Content
            </button>
            <button
              aria-selected={mobileMode === "discussion"}
              onClick={() => setMobileMode("discussion")}
              role="tab"
              type="button"
            >
              Discussion
              {discussionEntries.length > 0 && (
                <span>{discussionEntries.length}</span>
              )}
            </button>
          </div>

          <div
            className={
              discussionCollapsed
                ? "ce-workspace ce-workspace-collapsed"
                : "ce-workspace"
            }
          >
            <article
              className={
                mobileMode === "content"
                  ? "ce-reading ce-mobile-active"
                  : "ce-reading"
              }
              aria-label={`${selectedTopic.label} content`}
            >
              <div className="ce-reading-inner">
                <div className="ce-topic-heading">
                  <div className="ce-topic-eyebrow-row">
                    <div className="ce-topic-eyebrow-group">
                      <p className="ce-eyebrow">
                        {selectedTopic.kind === "topic"
                          ? collaborativeEmpty
                            ? `Topic ${selectedTopic.number} · Group-built topic`
                            : `Topic ${selectedTopic.number}`
                          : "Reference"}
                      </p>
                      {selectedTopic.kind === "topic" &&
                        topicConfidence.topicNodeId &&
                        viewer && (
                          <span className="ce-topic-confidence">
                            <ConfidenceSlider
                              ariaLabel="Your confidence for this topic"
                              onChange={saveTopicConfidence}
                              value={topicLevel}
                            />
                          </span>
                        )}
                    </div>
                    <span
                      className="ce-status"
                      data-progress={
                        countedTotal === 0
                          ? "na"
                          : answeredCount === 0
                            ? "none"
                            : answeredCount === countedTotal
                              ? "complete"
                              : "partial"
                      }
                    >
                      {countedTotal > 0
                        ? `${answeredCount} of ${countedTotal} answered`
                        : selectedTopic.kind === "reference"
                          ? "Supporting reference"
                          : collaborativeEmpty
                            ? "Open for contributions"
                            : "No questions yet"}
                    </span>
                  </div>
                  <div className="ce-topic-title-row">
                    <h2>{selectedTopic.label}</h2>
                  </div>
                  {selectedTopic.kind === "topic" &&
                    questions.length > 0 &&
                    viewer && (
                      <label className="ce-relevance-toggle">
                        <span>Sort by Exam Relevance</span>
                        <input
                          checked={sortByRelevance}
                          onChange={(event) =>
                            setSortPreference(event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span className="ce-switch" aria-hidden="true" />
                      </label>
                    )}
                </div>

                {questions.length > 0 && viewer && (
                  <section
                    aria-label="Study questions"
                    className="ce-question-workspace"
                  >
                   <LayoutGroup>
                    {sortByRelevance ? (
                      RELEVANCE_SECTIONS.map((section) => {
                        const sectionQuestions = questions.filter(
                          (question) =>
                            !question.isHiddenForMe &&
                            (question.myLikelihood ?? "unsure") ===
                              section.key,
                        );
                        if (sectionQuestions.length === 0) return null;
                        return (
                          <div
                            className="ce-relevance-group"
                            key={section.key}
                          >
                            <div className="ce-question-list">
                              {sectionQuestions.map((question) => (
                                <motion.div
                                  className="ce-card-motion"
                                  key={question.id}
                                  layout={cardLayout}
                                  layoutId={question.id}
                                  transition={cardLayoutTransition}
                                >
                                  <QuestionCard
                                    onOpenSource={openSourceViewer}
                                    question={question}
                                    roster={ringRoster}
                                    viewerId={viewer?.userId ?? null}
                                  />
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="ce-question-list">
                        {questions
                          .filter((question) => !question.isHiddenForMe)
                          .map((question) => (
                            <motion.div
                              className="ce-card-motion"
                              key={question.id}
                              layout={cardLayout}
                              layoutId={question.id}
                              transition={cardLayoutTransition}
                            >
                              <QuestionCard
                                onOpenSource={openSourceViewer}
                                question={question}
                                roster={ringRoster}
                                viewerId={viewer?.userId ?? null}
                              />
                            </motion.div>
                          ))}
                      </div>
                    )}
                    {questions.some((question) => question.isHiddenForMe) && (
                      <details className="ce-hidden-questions">
                        <summary>
                          Hidden questions
                          <span>
                            {
                              questions.filter(
                                (question) => question.isHiddenForMe,
                              ).length
                            }
                          </span>
                        </summary>
                        <div className="ce-question-list">
                          {questions
                            .filter((question) => question.isHiddenForMe)
                            .map((question) => (
                              <QuestionCard
                                key={question.id}
                                onOpenSource={openSourceViewer}
                                question={question}
                                roster={ringRoster}
                                viewerId={viewer?.userId ?? null}
                              />
                            ))}
                        </div>
                      </details>
                    )}
                   </LayoutGroup>
                  </section>
                )}

                {collaborativeEmpty && questions.length === 0 && (
                  <section className="ce-collaborative-empty">
                    <p className="ce-eyebrow">Group-built topic</p>
                    <h3>Start this topic together</h3>
                    <p>
                      Ask the first question below. Answers and discussion
                      will grow from the group.
                    </p>
                  </section>
                )}

                {selectedTopic.kind === "topic" && (
                  <AskQuestionForm
                    onQuestionAdded={handleQuestionAdded}
                    topicStableKey={selectedTopic.stableKey}
                  />
                )}

                {!collaborativeEmpty && (
                  <details className="ce-canon">
                    <summary className="ce-canon-summary">
                      <span className="ce-canon-summary-text">
                        <span className="ce-eyebrow">Supporting canon</span>
                        <h3>Source material and study notes</h3>
                      </span>
                      <span className="ce-canon-chevron" aria-hidden="true" />
                    </summary>

                    <div className="ce-canon-body">
                    {sourceAvailable ? (
                      <div className="ce-markdown">
                    <ReactMarkdown
                      components={{
                        a({ children, href, ...props }) {
                          if (href?.startsWith("#verify-")) {
                            const stableKey = href.slice("#verify-".length);
                            const verification = verifications[stableKey];
                            return verification ? (
                              <VerificationControl
                                contributions={
                                  contributions[stableKey] ?? []
                                }
                                verification={verification}
                              />
                            ) : null;
                          }

                          return (
                            <a href={href} {...props}>
                              {children}
                            </a>
                          );
                        },
                        code({ children, className, ...props }) {
                          const value = String(children).replace(/\n$/, "");

                          const glyph = CONTENT_GLYPHS[value];
                          if (glyph) {
                            const tip = TIER_TOOLTIP[glyph.type];
                            return (
                              <span
                                aria-label={glyph.label}
                                className={`ce-marker ce-marker-${glyph.type}`}
                                data-tip={tip}
                                tabIndex={tip ? 0 : undefined}
                                role="img"
                              >
                                <MarkerGlyph type={glyph.type} />
                              </span>
                            );
                          }

                          if (isCitationToken(value)) {
                            const resolved = resolveCitationSource(value);
                            if (resolved) {
                              return (
                                <button
                                  className="ce-citation ce-citation-button"
                                  onClick={() =>
                                    openSourceViewer({
                                      citation: value,
                                      ...resolved,
                                    })
                                  }
                                  title={`View source ${value}`}
                                  type="button"
                                >
                                  {value}
                                </button>
                              );
                            }

                            return (
                              <span className="ce-citation">
                                {value}
                              </span>
                            );
                          }

                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                      remarkPlugins={[remarkGfm]}
                    >
                      {markdown}
                    </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="ce-source-unavailable">
                        <h3>Private source unavailable</h3>
                        <p>
                          Connect the local source map to preview canonical
                          study content.
                        </p>
                      </div>
                    )}
                    </div>
                  </details>
                )}

              </div>
            </article>

            <aside
              className={
                mobileMode === "discussion"
                  ? "ce-discussion ce-mobile-active"
                  : "ce-discussion"
              }
              aria-label="Group discussion"
            >
              <div className="ce-discussion-header">
                <div>
                  <p className="ce-eyebrow">Page conversation</p>
                  <h2>Group discussion</h2>
                </div>
                <button
                  aria-label={
                    discussionCollapsed
                      ? "Expand discussion"
                      : "Collapse discussion"
                  }
                  className="ce-collapse"
                  onClick={() =>
                    setDiscussionCollapsed((collapsed) => !collapsed)
                  }
                  type="button"
                >
                  {discussionCollapsed ? "←" : "→"}
                </button>
              </div>

              <div className="ce-discussion-content">
                  <div className="ce-thread">
                    <GroupDiscussionFeed
                      entries={discussionEntries}
                      onRevealTarget={revealTarget}
                    />
                  </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {navigating && (
        <div className="ce-nav-loading" role="status" aria-live="polite">
          <span className="ce-route-loading-spinner" aria-hidden="true" />
          <span className="ce-route-loading-label">Loading…</span>
        </div>
      )}

      {openSource && (
        <SourceViewerDialog
          citation={openSource.citation}
          onClose={() => setOpenSource(null)}
          page={openSource.page}
          source={openSource.source}
        />
      )}
    </main>
  );
}
