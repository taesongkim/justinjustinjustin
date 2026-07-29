"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TopicSummary } from "./topics";

type CoreExamFrameProps = {
  topics: TopicSummary[];
  selectedTopic: TopicSummary;
  markdown: string;
  sourceAvailable: boolean;
};

type PreviewControls = {
  discussionWidth: number;
  gutter: number;
  readingMeasure: number;
  headerHeight: number;
};

const INITIAL_CONTROLS: PreviewControls = {
  discussionWidth: 360,
  gutter: 28,
  readingMeasure: 760,
  headerHeight: 64,
};

const MOCK_COMMENTS = [
  {
    name: "Maya",
    color: "#8a6ad8",
    time: "18 min ago",
    body: "I keep returning to the distinction between protection and identity here.",
  },
  {
    name: "Justin",
    color: "#2f7b68",
    time: "6 min ago",
    body: "Same. I want to connect this section to the formation arc before we finalize the group definition.",
  },
];

export function CoreExamFrame({
  topics,
  selectedTopic,
  markdown,
  sourceAvailable,
}: CoreExamFrameProps) {
  const [mobileMode, setMobileMode] = useState<"content" | "discussion">(
    "content",
  );
  const [discussionCollapsed, setDiscussionCollapsed] = useState(false);
  const [controls, setControls] =
    useState<PreviewControls>(INITIAL_CONTROLS);

  const style = useMemo(
    () =>
      ({
        "--ce-discussion-width": `${controls.discussionWidth}px`,
        "--ce-workspace-gutter": `${controls.gutter}px`,
        "--ce-reading-measure": `${controls.readingMeasure}px`,
        "--ce-header-height": `${controls.headerHeight}px`,
      }) as React.CSSProperties,
    [controls],
  );

  const snippet = `discussionWidth: ${controls.discussionWidth}, gutter: ${controls.gutter}, readingMeasure: ${controls.readingMeasure}, headerHeight: ${controls.headerHeight}`;

  return (
    <main className="ce-app" style={style}>
      <header className="ce-header">
        <div className="ce-brand">
          <span className="ce-brand-mark">CE</span>
          <div>
            <p className="ce-eyebrow">Study space</p>
            <h1>Core Exam 1</h1>
          </div>
        </div>

        <div className="ce-header-actions">
          <details className="ce-mobile-topics">
            <summary>Topics</summary>
            <nav aria-label="Mobile study topics">
              {topics.map((topic) => (
                <Link
                  className={
                    topic.stableKey === selectedTopic.stableKey
                      ? "ce-mobile-topic-active"
                      : undefined
                  }
                  href={`/core-exam-1?topic=${encodeURIComponent(topic.stableKey)}`}
                  key={topic.stableKey}
                >
                  <span>{String(topic.number).padStart(2, "0")}</span>
                  {topic.label}
                </Link>
              ))}
            </nav>
          </details>
          <button className="ce-quiet-button" type="button">
            Source library
          </button>
          <button className="ce-quiet-button" type="button">
            Activity
          </button>
          <button className="ce-identity" type="button">
            <span className="ce-avatar" aria-hidden="true">
              J
            </span>
            <span>
              <small>Studying as</small>
              Justin
            </span>
          </button>
        </div>
      </header>

      <div className="ce-body">
        <aside className="ce-sidebar" aria-label="Study topics">
          <p className="ce-sidebar-label">Exam topics</p>
          <nav>
            {topics.map((topic) => (
              <Link
                className={
                  topic.stableKey === selectedTopic.stableKey
                    ? "ce-topic-link ce-topic-link-active"
                    : "ce-topic-link"
                }
                href={`/core-exam-1?topic=${encodeURIComponent(topic.stableKey)}`}
                key={topic.stableKey}
              >
                <span>{String(topic.number).padStart(2, "0")}</span>
                {topic.label}
              </Link>
            ))}
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
              Discussion <span>2</span>
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
                  <p className="ce-eyebrow">
                    Topic {selectedTopic.number} · Canonical content
                  </p>
                  <div className="ce-topic-title-row">
                    <h2>{selectedTopic.label}</h2>
                    <span className="ce-status">12 of 18 verified</span>
                  </div>
                </div>

                {sourceAvailable ? (
                  <div className="ce-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="ce-source-unavailable">
                    <h3>Private source unavailable</h3>
                    <p>
                      Connect the local source map to preview canonical study
                      content.
                    </p>
                  </div>
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

              {!discussionCollapsed && (
                <>
                  <div className="ce-thread">
                    {MOCK_COMMENTS.map((comment) => (
                      <article className="ce-comment" key={comment.time}>
                        <div
                          className="ce-comment-avatar"
                          style={{ background: comment.color }}
                          aria-hidden="true"
                        >
                          {comment.name[0]}
                        </div>
                        <div>
                          <p className="ce-comment-meta">
                            <strong>{comment.name}</strong>
                            <span>{comment.time}</span>
                          </p>
                          <p>{comment.body}</p>
                          <button type="button">Reply</button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="ce-composer">
                    <label htmlFor="ce-comment">Comment</label>
                    <textarea
                      id="ce-comment"
                      placeholder="Add to the group discussion…"
                      rows={3}
                    />
                    <div>
                      <span>Everyone in Core Exam</span>
                      <button type="button">Comment</button>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </section>
      </div>

      {process.env.NODE_ENV === "development" && (
        <aside className="ce-dev-panel" aria-label="Layout preview controls">
          <strong>Layout controls</strong>
          {(
            [
              ["discussionWidth", 300, 480],
              ["gutter", 12, 52],
              ["readingMeasure", 620, 900],
              ["headerHeight", 52, 84],
            ] as const
          ).map(([key, min, max]) => (
            <label key={key}>
              <span>
                {key} <output>{controls[key]}</output>
              </span>
              <input
                min={min}
                max={max}
                onChange={(event) =>
                  setControls((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
                type="range"
                value={controls[key]}
              />
            </label>
          ))}
          <code>{snippet}</code>
        </aside>
      )}
    </main>
  );
}
