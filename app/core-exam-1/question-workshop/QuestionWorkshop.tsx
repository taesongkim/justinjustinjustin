"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type DragEvent,
  useMemo,
  useState,
} from "react";
import styles from "./QuestionWorkshop.module.css";
import { CoreStudyLogo } from "../CoreStudyLogo";
import type {
  QuestionBankDocument,
  WorkshopAction,
  WorkshopApiResponse,
  WorkshopQuestion,
} from "./types";

type WorkshopTopic = {
  label: string;
  stableKey: string;
};

type StatusMessage = {
  kind: "error" | "success";
  text: string;
} | null;

function fingerprint(document: QuestionBankDocument) {
  return JSON.stringify(document.questions);
}

function newStableKey() {
  return `question.custom.${crypto.randomUUID().replaceAll("-", "")}`;
}

function replaceTopicQuestions(
  allQuestions: WorkshopQuestion[],
  topics: WorkshopTopic[],
  topicStableKey: string,
  nextTopicQuestions: WorkshopQuestion[],
) {
  const byTopic = new Map(
    topics.map((topic) => [
      topic.stableKey,
      allQuestions.filter(
        (question) => question.topicStableKey === topic.stableKey,
      ),
    ]),
  );
  byTopic.set(topicStableKey, nextTopicQuestions);
  return topics.flatMap((topic) => byTopic.get(topic.stableKey) ?? []);
}

function escapeCsv(value: string | number) {
  const stringValue = String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((candidate) =>
    candidate.some((value) => value.trim().length > 0),
  );
}

export function QuestionWorkshop({
  initialDocument,
  topics,
  viewerName,
}: {
  initialDocument: QuestionBankDocument;
  topics: WorkshopTopic[];
  viewerName: string;
}) {
  const [document, setDocument] = useState(initialDocument);
  const [savedFingerprint, setSavedFingerprint] = useState(
    fingerprint(initialDocument),
  );
  const [selectedTopicKey, setSelectedTopicKey] = useState(
    topics[0]?.stableKey ?? "",
  );
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    key: string;
    position: "before" | "after";
  } | null>(null);
  const [busyAction, setBusyAction] = useState<WorkshopAction | null>(null);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);

  const selectedTopic =
    topics.find((topic) => topic.stableKey === selectedTopicKey) ?? topics[0];
  const topicQuestions = document.questions.filter(
    (question) => question.topicStableKey === selectedTopic?.stableKey,
  );
  const activeQuestions = topicQuestions.filter(
    (question) => !question.archived,
  );
  const removedQuestions = topicQuestions.filter(
    (question) => question.archived,
  );
  const dirty = fingerprint(document) !== savedFingerprint;
  const totals = useMemo(
    () => ({
      active: document.questions.filter((question) => !question.archived)
        .length,
      removed: document.questions.filter((question) => question.archived)
        .length,
    }),
    [document.questions],
  );

  const updateQuestions = (
    update: (questions: WorkshopQuestion[]) => WorkshopQuestion[],
  ) => {
    setDocument((current) => ({
      ...current,
      questions: update(current.questions),
    }));
    setStatus(null);
  };

  const replaceSelectedTopic = (questions: WorkshopQuestion[]) => {
    updateQuestions((current) =>
      replaceTopicQuestions(
        current,
        topics,
        selectedTopic.stableKey,
        questions,
      ),
    );
  };

  const updatePrompt = (stableKey: string, prompt: string) => {
    updateQuestions((questions) =>
      questions.map((question) =>
        question.stableKey === stableKey
          ? { ...question, prompt }
          : question,
      ),
    );
  };

  const addQuestion = () => {
    const question: WorkshopQuestion = {
      archived: false,
      prompt: "What would you like to understand?",
      rank: (activeQuestions.length + 1) * 1000,
      stableKey: newStableKey(),
      topicStableKey: selectedTopic.stableKey,
    };
    replaceSelectedTopic([
      ...activeQuestions,
      question,
      ...removedQuestions,
    ]);
  };

  const setArchived = (stableKey: string, archived: boolean) => {
    const target = topicQuestions.find(
      (question) => question.stableKey === stableKey,
    );
    if (!target) return;
    const withoutTarget = topicQuestions.filter(
      (question) => question.stableKey !== stableKey,
    );
    const nextTarget = { ...target, archived };
    const active = withoutTarget.filter((question) => !question.archived);
    const removed = withoutTarget.filter((question) => question.archived);
    replaceSelectedTopic(
      archived
        ? [...active, ...removed, nextTarget]
        : [...active, nextTarget, ...removed],
    );
  };

  const moveQuestion = (stableKey: string, offset: number) => {
    const currentIndex = activeQuestions.findIndex(
      (question) => question.stableKey === stableKey,
    );
    const nextIndex = currentIndex + offset;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= activeQuestions.length
    ) {
      return;
    }
    const reordered = [...activeQuestions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    replaceSelectedTopic([...reordered, ...removedQuestions]);
  };

  // Which edge of a hovered row the drop will land on, from the cursor's
  // position within it. Also drives the preview line.
  const dropPositionFor = (
    event: DragEvent<HTMLElement>,
  ): "before" | "after" => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };

  const previewDrop = (
    event: DragEvent<HTMLElement>,
    targetStableKey: string,
  ) => {
    event.preventDefault();
    if (!draggingKey || draggingKey === targetStableKey) {
      setDropIndicator(null);
      return;
    }
    setDropIndicator({
      key: targetStableKey,
      position: dropPositionFor(event),
    });
  };

  const clearDropState = () => {
    setDraggingKey(null);
    setDropIndicator(null);
  };

  const dropQuestion = (
    event: DragEvent<HTMLElement>,
    targetStableKey: string,
  ) => {
    event.preventDefault();
    const position = dropPositionFor(event);
    clearDropState();
    if (!draggingKey || draggingKey === targetStableKey) return;
    const reordered = [...activeQuestions];
    const sourceIndex = reordered.findIndex(
      (question) => question.stableKey === draggingKey,
    );
    if (sourceIndex < 0) return;
    const [moved] = reordered.splice(sourceIndex, 1);
    // Re-find the target after removal so indices don't shift under us.
    let insertIndex = reordered.findIndex(
      (question) => question.stableKey === targetStableKey,
    );
    if (insertIndex < 0) return;
    if (position === "after") insertIndex += 1;
    reordered.splice(insertIndex, 0, moved);
    replaceSelectedTopic([...reordered, ...removedQuestions]);
  };

  const runAction = async (action: WorkshopAction) => {
    setBusyAction(action);
    setStatus(null);
    try {
      const response = await fetch("/core-exam-1/question-workshop/api", {
        body: JSON.stringify({ action, document }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as WorkshopApiResponse;
      if (!result.ok) throw new Error(result.error);

      setDocument(result.document);
      setSavedFingerprint(fingerprint(result.document));
      setStatus({ kind: "success", text: result.message });
      setConfirmingFinalize(false);

      if (action === "preview") {
        window.location.assign(
          `/core-exam-1?topic=${encodeURIComponent(selectedTopic.stableKey)}`,
        );
      }
    } catch (error) {
      const fallback =
        action === "save"
          ? "We couldn’t save this draft."
          : action === "preview"
            ? "We couldn’t apply this preview."
            : "We couldn’t finalize the question bank. No test activity was cleared.";
      setStatus({
        kind: "error",
        text: error instanceof Error ? `${fallback} ${error.message}` : fallback,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["topic_stable_key", "order", "status", "stable_key", "prompt"],
      ...topics.flatMap((topic) => {
        const questions = document.questions.filter(
          (question) => question.topicStableKey === topic.stableKey,
        );
        return questions.map((question, index) => [
          topic.stableKey,
          String(index + 1),
          question.archived ? "removed" : "active",
          question.stableKey,
          question.prompt,
        ]);
      }),
    ];
    const csv = rows
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `core-exam-question-bank-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      const [header, ...dataRows] = rows;
      const expectedHeader = [
        "topic_stable_key",
        "order",
        "status",
        "stable_key",
        "prompt",
      ];
      if (
        !header ||
        expectedHeader.some((value, index) => header[index] !== value)
      ) {
        throw new Error("The CSV columns do not match the workshop export.");
      }
      const topicKeySet = new Set(topics.map((topic) => topic.stableKey));
      const imported = dataRows.map((row): WorkshopQuestion => {
        const [topicStableKey, order, statusValue, stableKey, prompt] = row;
        if (!topicKeySet.has(topicStableKey)) {
          throw new Error(`Unknown topic in CSV: ${topicStableKey}`);
        }
        if (statusValue !== "active" && statusValue !== "removed") {
          throw new Error(`Unknown question status: ${statusValue}`);
        }
        return {
          archived: statusValue === "removed",
          prompt,
          rank: Number(order) * 1000,
          stableKey: stableKey || newStableKey(),
          topicStableKey,
        };
      });
      imported.sort((left, right) => {
        const leftTopic = topics.findIndex(
          (topic) => topic.stableKey === left.topicStableKey,
        );
        const rightTopic = topics.findIndex(
          (topic) => topic.stableKey === right.topicStableKey,
        );
        return (
          leftTopic - rightTopic ||
          Number(left.archived) - Number(right.archived) ||
          left.rank - right.rank
        );
      });
      setDocument((current) => ({ ...current, questions: imported }));
      setStatus({
        kind: "success",
        text: "CSV imported into the unsaved draft. Review it before saving.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        text:
          error instanceof Error
            ? `We couldn’t import that CSV. ${error.message}`
            : "We couldn’t import that CSV.",
      });
    }
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/core-exam-1">
          <CoreStudyLogo className="ce-brand-logo" />
          <div>
            <small>Development workspace</small>
            <strong>Question Workshop</strong>
          </div>
        </Link>
        <div className={styles.headerMeta}>
          <span>{viewerName}</span>
          <span>{dirty ? "Unsaved changes" : "Draft saved"}</span>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.topicRail}>
          <div className={styles.summary}>
            <span>
              <strong>{totals.active}</strong> active
            </span>
            <span>
              <strong>{totals.removed}</strong> removed
            </span>
          </div>
          <nav aria-label="Question topics">
            {topics.map((topic, index) => {
              const count = document.questions.filter(
                (question) =>
                  question.topicStableKey === topic.stableKey &&
                  !question.archived,
              ).length;
              return (
                <button
                  aria-current={
                    topic.stableKey === selectedTopic.stableKey
                      ? "page"
                      : undefined
                  }
                  key={topic.stableKey}
                  onClick={() => setSelectedTopicKey(topic.stableKey)}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{topic.label}</span>
                  <small>{count}</small>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className={styles.editor}>
          <header className={styles.editorHeading}>
            <div>
              <p>Starting questions</p>
              <h1>{selectedTopic.label}</h1>
              <span>
                Arrange these from the most fundamental question to the most
                nuanced.
              </span>
            </div>
            <button className={styles.addButton} onClick={addQuestion} type="button">
              Add question
            </button>
          </header>

          {activeQuestions.length === 0 ? (
            <p className={styles.empty}>No starting questions yet.</p>
          ) : (
            <ol className={styles.questionList}>
              {activeQuestions.map((question, index) => (
                <li
                  className={[
                    styles.question,
                    draggingKey === question.stableKey ? styles.dragging : "",
                    dropIndicator?.key === question.stableKey &&
                    dropIndicator.position === "before"
                      ? styles.dropBefore
                      : "",
                    dropIndicator?.key === question.stableKey &&
                    dropIndicator.position === "after"
                      ? styles.dropAfter
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={question.stableKey}
                  onDragOver={(event) => previewDrop(event, question.stableKey)}
                  onDrop={(event) => dropQuestion(event, question.stableKey)}
                >
                  <span
                    aria-hidden="true"
                    className={styles.dragHandle}
                    draggable
                    onDragEnd={clearDropState}
                    onDragStart={() => setDraggingKey(question.stableKey)}
                  >
                    ⠿
                  </span>
                  <span className={styles.questionNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.questionEditor}>
                    <textarea
                      aria-label={`Question ${index + 1}`}
                      onChange={(event) =>
                        updatePrompt(question.stableKey, event.target.value)
                      }
                      rows={2}
                      value={question.prompt}
                    />
                    <div className={styles.questionActions}>
                      {question.stableKey.startsWith("question.custom.") && (
                        <span>New</span>
                      )}
                      <button
                        disabled={index === 0}
                        onClick={() => moveQuestion(question.stableKey, -1)}
                        type="button"
                      >
                        Move up
                      </button>
                      <button
                        disabled={index === activeQuestions.length - 1}
                        onClick={() => moveQuestion(question.stableKey, 1)}
                        type="button"
                      >
                        Move down
                      </button>
                      <button
                        onClick={() => setArchived(question.stableKey, true)}
                        type="button"
                      >
                        Remove from starting questions
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {removedQuestions.length > 0 && (
            <details className={styles.removed}>
              <summary>Removed questions ({removedQuestions.length})</summary>
              <div>
                {removedQuestions.map((question) => (
                  <article key={question.stableKey}>
                    <p>{question.prompt}</p>
                    <button
                      onClick={() => setArchived(question.stableKey, false)}
                      type="button"
                    >
                      Restore
                    </button>
                  </article>
                ))}
              </div>
            </details>
          )}
        </section>
      </div>

      <footer className={styles.actionBar}>
        <div>
          {status && (
            <p
              className={
                status.kind === "error"
                  ? styles.errorStatus
                  : styles.successStatus
              }
              role="status"
            >
              {status.text}
            </p>
          )}
        </div>
        <div className={styles.secondaryActions}>
          <button onClick={exportCsv} type="button">
            Export CSV
          </button>
          <label>
            Import CSV
            <input accept=".csv,text/csv" onChange={importCsv} type="file" />
          </label>
        </div>
        <div className={styles.primaryActions}>
          <button
            disabled={Boolean(busyAction) || !dirty}
            onClick={() => void runAction("save")}
            type="button"
          >
            {busyAction === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            disabled={Boolean(busyAction)}
            onClick={() => void runAction("preview")}
            type="button"
          >
            {busyAction === "preview" ? "Applying…" : "Preview in site"}
          </button>
          <button
            className={styles.finalizeButton}
            disabled={Boolean(busyAction)}
            onClick={() => setConfirmingFinalize(true)}
            type="button"
          >
            Finalize question bank
          </button>
        </div>
      </footer>

      {confirmingFinalize && (
        <div className={styles.confirmBackdrop} role="presentation">
          <section
            aria-labelledby="question-workshop-finalize-title"
            aria-modal="true"
            className={styles.confirmDialog}
            role="dialog"
          >
            <p>Final review</p>
            <h2 id="question-workshop-finalize-title">
              Finalize this question bank?
            </h2>
            <p>
              This will replace the local starting-question set. Removed
              questions will remain archived.
            </p>
            <p>
              Current local answers, comments, study signals, hidden marks, and
              activity attached to starting questions will be cleared.
            </p>
            <div>
              <button
                disabled={Boolean(busyAction)}
                onClick={() => setConfirmingFinalize(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.finalizeButton}
                disabled={Boolean(busyAction)}
                onClick={() => void runAction("finalize")}
                type="button"
              >
                {busyAction === "finalize"
                  ? "Finalizing…"
                  : "Finalize and clear test activity"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
