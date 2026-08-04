"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CoreExamActivityItem } from "./lib/activity";
import { hueNameStyle } from "./lib/hue";
import { createCoreExamBrowserClient } from "./lib/supabase/browser";

const ACTION_LABELS: Record<CoreExamActivityItem["action"], string> = {
  answer_created: "answered",
  answer_updated: "updated an answer to",
  comment_added: "commented on",
  contribution_created: "added a contribution to",
  contribution_updated: "updated a contribution on",
  likelihood_marked: "rated the test likelihood of",
  question_hidden: "hid",
  question_shown: "restored",
  question_submitted: "submitted",
  verification_changed: "updated verification for",
};

const formatActivityTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsed < 60) return "just now";
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
  if (elapsed < 172800) return "1d ago";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

export function ActivityPanel({
  currentTopicStableKey,
  events,
  initialHasUnviewed,
  latestOtherEventId,
  onRevealTarget,
}: {
  currentTopicStableKey?: string;
  events: CoreExamActivityItem[];
  initialHasUnviewed: boolean;
  latestOtherEventId: string | null;
  onRevealTarget?: (targetId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  // Play the slide-out before unmounting; close instantly under reduced motion.
  const closeDrawer = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setClosing(false);
      setOpen(false);
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 175);
  }, []);
  const [viewedThroughId, setViewedThroughId] = useState<string | null>(
    initialHasUnviewed ? null : latestOtherEventId,
  );
  const [newEventIdsForOpen, setNewEventIdsForOpen] = useState<string[]>([]);
  const hasUnviewed =
    initialHasUnviewed && viewedThroughId !== latestOtherEventId;

  const persistViewed = useCallback(async () => {
    if (!latestOtherEventId) return true;
    const supabase = createCoreExamBrowserClient();
    const { error } = await supabase.rpc("core_exam_mark_activity_viewed");
    return !error;
  }, [latestOtherEventId]);

  const markViewed = useCallback(async () => {
    if (!latestOtherEventId) return;
    setViewedThroughId(latestOtherEventId);
    if (!(await persistViewed())) setViewedThroughId(null);
  }, [latestOtherEventId, persistViewed]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, closeDrawer]);

  useEffect(() => {
    if (!open || !hasUnviewed || !latestOtherEventId) return;
    let active = true;
    void persistViewed().then((saved) => {
      if (active && saved) setViewedThroughId(latestOtherEventId);
    });
    return () => {
      active = false;
    };
  }, [hasUnviewed, latestOtherEventId, open, persistViewed]);

  const getDestination = (event: CoreExamActivityItem) => {
    const target = event.contentStableKey
      ? `ce-content-${event.contentStableKey}`
      : event.commentId
        ? `ce-comment-${event.commentId}`
        : event.answerId
          ? `ce-answer-${event.answerId}`
          : `ce-question-${event.questionId}`;
    return {
      href: `/core-exam-1?topic=${encodeURIComponent(event.topicStableKey)}&target=${encodeURIComponent(target)}${
        event.contributionId
          ? `&contribution=${encodeURIComponent(event.contributionId)}`
          : ""
      }`,
      target,
    };
  };

  const navigate = (event: CoreExamActivityItem) => {
    setOpen(false);
    const destination = getDestination(event);

    if (
      currentTopicStableKey === event.topicStableKey &&
      onRevealTarget
    ) {
      onRevealTarget(destination.target);
      if (event.contributionId && event.contentStableKey) {
        window.requestAnimationFrame(() =>
          window.dispatchEvent(
            new CustomEvent("core-exam:open-contribution", {
              detail: {
                contributionId: event.contributionId,
                stableKey: event.contentStableKey,
              },
            }),
          ),
        );
        return;
      }
      return;
    }

    router.push(destination.href, { scroll: false });
  };

  return (
    <>
      <button
        aria-label={hasUnviewed ? "Activity, new items" : "Activity"}
        aria-expanded={open}
        className="ce-quiet-button ce-activity-button"
        onClick={() => {
          setClosing(false);
          setOpen(true);
          setNewEventIdsForOpen(
            hasUnviewed
              ? events
                  .filter((event) => event.isUnviewed)
                  .map((event) => event.id)
              : [],
          );
          if (hasUnviewed) void markViewed();
        }}
        type="button"
      >
        Activity
        {hasUnviewed && (
          <span className="ce-activity-unviewed-dot" aria-hidden="true" />
        )}
      </button>
      {open &&
        createPortal(
          <div
            className={
              closing
                ? "ce-activity-overlay ce-activity-closing"
                : "ce-activity-overlay"
            }
          >
            <button
              aria-label="Close activity"
              className="ce-activity-backdrop"
              onClick={closeDrawer}
              type="button"
            />
            <aside
              aria-label="Activity"
              aria-modal="true"
              className="ce-activity-drawer"
              role="dialog"
            >
              <header>
                <div>
                  <p className="ce-eyebrow">Across Core Exam</p>
                  <h2>Activity</h2>
                </div>
                <button onClick={closeDrawer} type="button">
                  Close
                </button>
              </header>
              <div className="ce-activity-drawer-list">
                {events.length === 0 ? (
                  <p className="ce-discussion-empty">
                    No activity yet. Answers, comments, and study signals will
                    appear here.
                  </p>
                ) : (
                  events.map((event) => (
                    <button
                      className="ce-activity-drawer-row"
                      key={event.id}
                      onFocus={() =>
                        router.prefetch(getDestination(event).href)
                      }
                      onMouseEnter={() =>
                        router.prefetch(getDestination(event).href)
                      }
                      onClick={() => navigate(event)}
                      type="button"
                    >
                      <span
                        className={
                          newEventIdsForOpen.includes(event.id)
                            ? "ce-activity-row-dot ce-activity-row-dot-new"
                            : "ce-activity-row-dot"
                        }
                        aria-hidden="true"
                      />
                      <span>
                        <span className="ce-activity-row-head">
                          <span className="ce-activity-row-summary">
                            <strong style={hueNameStyle(event.actorColor)}>
                              {event.actorName}
                            </strong>{" "}
                            {event.action === "verification_changed"
                              ? event.metadata.state === "verified"
                                ? "verified"
                                : event.metadata.state === "flagged"
                                  ? "flagged"
                                  : "marked unverified"
                              : event.action === "contribution_created"
                                ? `added a ${event.metadata.kind ?? "contribution"} to`
                                : event.action === "contribution_updated"
                                  ? `updated a ${event.metadata.kind ?? "contribution"} on`
                                  : ACTION_LABELS[event.action]}
                          </span>
                          <small suppressHydrationWarning>
                            {formatActivityTime(event.createdAt)}
                          </small>
                        </span>
                        <p>{event.prompt}</p>
                        {event.action === "verification_changed" &&
                          event.metadata.note && (
                            <p
                              className="ce-activity-note"
                              style={hueNameStyle(event.actorColor)}
                            >
                              {event.metadata.note}
                            </p>
                          )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
