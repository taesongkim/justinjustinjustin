"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  ContentContribution,
  ContributionKind,
  ContributionVisibility,
} from "./lib/contributions";
import type {
  ContentVerification,
  VerificationState,
} from "./lib/verification";
import { hueNameStyle } from "./lib/hue";
import { createCoreExamBrowserClient } from "./lib/supabase/browser";

const STATE_LABELS: Record<VerificationState, string> = {
  flagged: "Flagged",
  unverified: "Unverified",
  verified: "Verified",
};

const STATE_SYMBOLS: Record<VerificationState | "unset", string> = {
  flagged: "!",
  unset: "",
  unverified: "",
  verified: "",
};

// Custom flat checkmark for the verified state (replaces the ✓ glyph).
function VerificationCheck() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="10"
      viewBox="0 0 12 12"
      width="10"
    >
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

const formatVerificationTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

type ContributionDraft = {
  contribution: ContentContribution | null;
  kind: ContributionKind;
  plainText: string;
  visibility: ContributionVisibility;
};

export function VerificationControl({
  contributions,
  showLabel = false,
  verification,
}: {
  contributions: ContentContribution[];
  showLabel?: boolean;
  verification: ContentVerification;
}) {
  const router = useRouter();
  const currentState = verification.current?.state ?? "unset";
  const savedState = verification.current?.state ?? "unverified";
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 80 });
  const [selectedState, setSelectedState] = useState<VerificationState>(
    savedState,
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [contributionDraft, setContributionDraft] =
    useState<ContributionDraft | null>(null);
  const [savingContribution, setSavingContribution] = useState(false);
  const [contributionError, setContributionError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedContributionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const openPopover = useCallback(
    (button: HTMLButtonElement) => {
      const rect = button.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 32);
      setPosition({
        left: Math.max(
          16,
          Math.min(rect.left, window.innerWidth - width - 16),
        ),
        top: Math.max(
          16,
          Math.min(rect.bottom + 8, window.innerHeight - 500),
        ),
      });
      setSelectedState(savedState);
      setNote("");
      setError("");
      setContributionDraft(null);
      setContributionError("");
      setOpen(true);
    },
    [savedState],
  );

  const revealContribution = useCallback(
    (contributionId: string) => {
      if (!triggerRef.current) return;
      openPopover(triggerRef.current);
      openedContributionIdRef.current = contributionId;
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          const contribution = document.getElementById(
            `ce-contribution-${contributionId}`,
          );
          if (!contribution) return;
          contribution.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          contribution.classList.remove("ce-target-highlight");
          void contribution.offsetWidth;
          contribution.classList.add("ce-target-highlight");
          window.setTimeout(
            () =>
              contribution.classList.remove("ce-target-highlight"),
            1000,
          );
        }),
      );
    },
    [openPopover],
  );

  useEffect(() => {
    const contributionId = new URLSearchParams(
      window.location.search,
    ).get("contribution");
    if (
      !contributionId ||
      contributionId === openedContributionIdRef.current ||
      !contributions.some(
        (contribution) => contribution.id === contributionId,
      )
    ) {
      return;
    }
    revealContribution(contributionId);
  }, [contributions, revealContribution]);

  useEffect(() => {
    const openLinkedContribution = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          contributionId: string;
          stableKey: string;
        }>
      ).detail;
      if (
        detail.stableKey !== verification.stableKey ||
        !contributions.some(
          (contribution) => contribution.id === detail.contributionId,
        )
      ) {
        return;
      }
      revealContribution(detail.contributionId);
    };
    window.addEventListener(
      "core-exam:open-contribution",
      openLinkedContribution,
    );
    return () =>
      window.removeEventListener(
        "core-exam:open-contribution",
        openLinkedContribution,
      );
  }, [
    contributions,
    revealContribution,
    verification.stableKey,
  ]);

  const save = async () => {
    setSaving(true);
    setError("");
    const supabase = createCoreExamBrowserClient();
    const { error: saveError } = await supabase.rpc(
      "core_exam_record_verification",
      {
        new_state: selectedState,
        target_content_node_id: verification.nodeId,
        verification_note: note.trim() || null,
      },
    );
    setSaving(false);
    if (saveError) {
      setError("We couldn’t update this verification.");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  const startContribution = (
    kind: ContributionKind,
    contribution: ContentContribution | null = null,
  ) => {
    setContributionError("");
    setContributionDraft({
      contribution,
      kind,
      plainText: contribution?.plainText ?? "",
      visibility: contribution?.visibility ?? "group",
    });
  };

  const saveContribution = async () => {
    if (!contributionDraft?.plainText.trim()) return;
    setSavingContribution(true);
    setContributionError("");
    const supabase = createCoreExamBrowserClient();
    const plainText = contributionDraft.plainText.trim();
    const body = {
      content: [
        {
          content: [{ text: plainText, type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
    };
    const { error: saveError } = contributionDraft.contribution
      ? await supabase.rpc("core_exam_save_contribution_revision", {
          base_revision_id:
            contributionDraft.contribution.currentRevisionId,
          contribution_body: body,
          contribution_edit_summary: null,
          contribution_plain_text: plainText,
          contribution_visibility: contributionDraft.visibility,
          target_contribution_id: contributionDraft.contribution.id,
        })
      : await supabase.rpc("core_exam_create_contribution", {
          contribution_body: body,
          contribution_edit_summary: null,
          contribution_kind: contributionDraft.kind,
          contribution_plain_text: plainText,
          contribution_visibility: contributionDraft.visibility,
          target_content_node_id: verification.nodeId,
        });
    setSavingContribution(false);
    if (saveError) {
      setContributionError(
        saveError.code === "40001"
          ? "This contribution changed elsewhere. Reload and review it before saving."
          : "We couldn’t save this contribution.",
      );
      return;
    }
    setContributionDraft(null);
    router.refresh();
  };

  const accessibleState = verification.current
    ? `${STATE_LABELS[verification.current.state]} by ${verification.current.actorName}`
    : "Not yet verified";

  return (
    <>
      <button
        aria-label={`Verification status: ${accessibleState}`}
        className={
          showLabel
            ? "ce-verification-trigger ce-verification-trigger-label"
            : "ce-verification-trigger"
        }
        data-state={currentState}
        id={`ce-content-${verification.stableKey}`}
        onClick={(event) => openPopover(event.currentTarget)}
        ref={triggerRef}
        title={accessibleState}
        type="button"
      >
        <span aria-hidden="true">
          {currentState === "verified" ? (
            <VerificationCheck />
          ) : (
            STATE_SYMBOLS[currentState]
          )}
        </span>
        {showLabel && <span>{accessibleState}</span>}
      </button>
      {open &&
        createPortal(
          <div className="ce-verification-layer">
            <button
              aria-label="Close verification"
              className="ce-verification-backdrop"
              onClick={() => setOpen(false)}
              type="button"
            />
            <section
              aria-label="Verification"
              aria-modal="true"
              className="ce-verification-popover"
              role="dialog"
              style={position}
            >
              <header>
                <div>
                  <p className="ce-eyebrow">Shared status</p>
                  <h3>Verification</h3>
                </div>
                <button onClick={() => setOpen(false)} type="button">
                  Close
                </button>
              </header>

              {verification.current ? (
                <div className="ce-verification-current">
                  <strong>
                    {STATE_LABELS[verification.current.state]} by{" "}
                    <span style={hueNameStyle(verification.current.actorColor)}>
                      {verification.current.actorName}
                    </span>
                  </strong>
                  <time dateTime={verification.current.createdAt}>
                    {formatVerificationTime(verification.current.createdAt)}
                  </time>
                  {verification.current.note && (
                    <p>{verification.current.note}</p>
                  )}
                </div>
              ) : (
                <p className="ce-verification-empty">
                  No one has verified this yet.
                </p>
              )}

              <div
                aria-label="Verification state"
                className="ce-verification-states"
                role="group"
              >
                {(
                  ["verified", "flagged", "unverified"] as VerificationState[]
                ).map((state) => (
                  <button
                    aria-pressed={selectedState === state}
                    data-state={state}
                    key={state}
                    onClick={() => setSelectedState(state)}
                    type="button"
                  >
                    {STATE_LABELS[state]}
                  </button>
                ))}
              </div>

              <label htmlFor={`ce-verification-note-${verification.nodeId}`}>
                Add a note (optional)
              </label>
              <textarea
                id={`ce-verification-note-${verification.nodeId}`}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter" &&
                    !saving
                  ) {
                    event.preventDefault();
                    void save();
                  }
                }}
                rows={3}
                value={note}
              />
              <div className="ce-verification-actions">
                <span>{error}</span>
                <button disabled={saving} onClick={save} type="button">
                  {saving ? "Saving…" : "Update verification"}
                </button>
              </div>

              {verification.history.length > 0 && (
                <details className="ce-verification-history">
                  <summary>
                    Verification history
                    <span>{verification.history.length}</span>
                  </summary>
                  <ol>
                    {verification.history.map((event) => (
                      <li key={event.id}>
                        <div>
                          <strong>{STATE_LABELS[event.state]}</strong>
                          <span>
                            <span style={hueNameStyle(event.actorColor)}>
                              {event.actorName}
                            </span>{" "}
                            ·{" "}
                            <time dateTime={event.createdAt}>
                              {formatVerificationTime(event.createdAt)}
                            </time>
                          </span>
                        </div>
                        {event.note && <p>{event.note}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              <section className="ce-contributions">
                <header>
                  <div>
                    <p className="ce-eyebrow">Alongside the canon</p>
                    <h4>Notes and definitions</h4>
                  </div>
                  <div>
                    <button
                      onClick={() => startContribution("note")}
                      type="button"
                    >
                      Add note
                    </button>
                    <button
                      onClick={() => startContribution("definition")}
                      type="button"
                    >
                      Add definition
                    </button>
                  </div>
                </header>

                {contributionDraft && (
                  <div className="ce-contribution-editor">
                    <strong>
                      {contributionDraft.contribution
                        ? `Edit ${contributionDraft.kind}`
                        : `Add ${contributionDraft.kind}`}
                    </strong>
                    <textarea
                      aria-label={`${
                        contributionDraft.kind === "note"
                          ? "Note"
                          : "Definition"
                      } text`}
                      maxLength={10000}
                      onChange={(event) =>
                        setContributionDraft((current) =>
                          current
                            ? {
                                ...current,
                                plainText: event.target.value,
                              }
                            : current,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          (event.metaKey || event.ctrlKey) &&
                          event.key === "Enter" &&
                          !savingContribution
                        ) {
                          event.preventDefault();
                          void saveContribution();
                        }
                      }}
                      rows={4}
                      value={contributionDraft.plainText}
                    />
                    <div className="ce-contribution-visibility">
                      {(
                        [
                          ["group", "Share With Group"],
                          ["private", "Keep Private"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          aria-pressed={
                            contributionDraft.visibility === value
                          }
                          key={value}
                          onClick={() =>
                            setContributionDraft((current) =>
                              current
                                ? { ...current, visibility: value }
                                : current,
                            )
                          }
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p>
                      Notes are shared with the group unless you make them
                      private.
                    </p>
                    <div className="ce-contribution-editor-actions">
                      <span>{contributionError}</span>
                      <div>
                        <button
                          onClick={() => setContributionDraft(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={
                            savingContribution ||
                            !contributionDraft.plainText.trim()
                          }
                          onClick={saveContribution}
                          type="button"
                        >
                          {savingContribution
                            ? "Saving…"
                            : contributionDraft.contribution
                              ? "Save revision"
                              : `Add ${contributionDraft.kind}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {contributions.length === 0 ? (
                  <p className="ce-contributions-empty">
                    No notes or definitions yet.
                  </p>
                ) : (
                  <div className="ce-contribution-list">
                    {contributions.map((contribution) => (
                      <article
                        id={`ce-contribution-${contribution.id}`}
                        key={contribution.id}
                      >
                        <header>
                          <div>
                            <strong>
                              {contribution.isMine
                                ? contribution.kind === "note"
                                  ? "My note"
                                  : "My definition"
                                : contribution.kind === "note"
                                  ? `${contribution.authorName}’s note`
                                  : `${contribution.authorName}’s definition`}
                            </strong>
                            <span>{contribution.visibility}</span>
                          </div>
                          <time dateTime={contribution.editedAt}>
                            {formatVerificationTime(
                              contribution.editedAt,
                            )}
                          </time>
                        </header>
                        <p>{contribution.plainText}</p>
                        {contribution.isMine && (
                          <button
                            onClick={() =>
                              startContribution(
                                contribution.kind,
                                contribution,
                              )
                            }
                            type="button"
                          >
                            Edit
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
