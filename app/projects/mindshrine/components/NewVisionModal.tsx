"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createVision } from "../lib/service";
import type { Vision } from "../lib/types";
import ShrineButton from "./ShrineButton";

type Step = "title" | "description" | "submitting" | "received";

// Fade up into position, fade out in place (no movement)
const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

// ── Pencil edit icon (matches ShrineScreen edit button) ──
function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="rgba(200, 180, 255, 0.9)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
    </svg>
  );
}

export default function NewVisionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (v: Vision) => void;
}) {
  const [step, setStep] = useState<Step>("title");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [showSubmitDelay, setShowSubmitDelay] = useState(false);
  // Gate to delay description step content until Continue button has fully exited
  const [descContentReady, setDescContentReady] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const createdVisionRef = useRef<Vision | null>(null);

  // Reset everything when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("title");
        setTitle("");
        setDescription("");
        setError("");
        setShowSubmitDelay(false);
        setDescContentReady(false);
        createdVisionRef.current = null;
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-focus title when modal opens
  useEffect(() => {
    if (open && step === "title") {
      const t = setTimeout(() => titleRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [open, step]);

  // Auto-focus description when stepping to it
  useEffect(() => {
    if (step === "description" && descContentReady) {
      const t = setTimeout(() => descRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [step, descContentReady]);

  // Show submit button after a delay even if description is empty (optional field)
  useEffect(() => {
    if (step === "description") {
      setShowSubmitDelay(false);
      const t = setTimeout(() => setShowSubmitDelay(true), 1200);
      return () => clearTimeout(t);
    }
  }, [step]);

  // When entering description step, delay content until Continue has exited
  useEffect(() => {
    if (step === "description") {
      setDescContentReady(false);
      const t = setTimeout(() => setDescContentReady(true), 350);
      return () => clearTimeout(t);
    } else {
      setDescContentReady(false);
    }
  }, [step]);

  // ── Step handlers ──

  const advanceToDescription = useCallback(() => {
    if (!title.trim()) return;
    setStep("description");
  }, [title]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    setStep("submitting");
    setError("");

    try {
      const vision = await createVision(title.trim(), description.trim());
      createdVisionRef.current = vision;
      setStep("received");

      setTimeout(() => {
        onCreated(vision);
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create vision");
      setStep("description");
    }
  }, [title, description, onCreated, onClose]);

  const goBackToTitle = useCallback(() => {
    setStep("title");
    setError("");
  }, []);

  // ── Keyboard handler ──

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (step === "submitting" || step === "received") return;
        onClose();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (step === "title" && title.trim()) {
          advanceToDescription();
        } else if (step === "description") {
          handleSubmit();
        }
      }
    },
    [step, title, advanceToDescription, handleSubmit, onClose]
  );

  const promptText =
    step === "title" || step === "submitting" || step === "received"
      ? "Please share the title of your vision."
      : "Please record any clarifying details.";

  const showContinue = step === "title" && title.trim().length > 0;
  const showSubmitBtn =
    step === "description" && descContentReady && (description.trim().length > 0 || showSubmitDelay);

  const showTitle = step === "title" || step === "description";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => {
              if (step !== "submitting" && step !== "received") onClose();
            }}
          />

          {/* ── Content ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="fixed inset-0 z-50 pointer-events-none"
            onKeyDown={handleKeyDown}
          >
            <div
              className="absolute left-1/2 top-1/2 pointer-events-auto"
              style={{
                transform: "translate(-50%, -50%)",
                width: "100%",
                maxWidth: 512,
                padding: "0 32px",
              }}
            >
              {/* ── Prompt text — positioned above the title ── */}
              <div className="absolute left-0 right-0" style={{ bottom: "100%", paddingBottom: 24, paddingLeft: 32, paddingRight: 32 }}>
                <AnimatePresence mode="wait">
                  {(step === "title" || step === "description") && (
                    <motion.p
                      key={step === "title" ? "prompt-title" : "prompt-desc"}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="text-xs tracking-[0.15em] uppercase text-center select-none"
                      style={{ color: "rgba(200, 180, 255, 0.4)" }}
                    >
                      {promptText}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Title row — anchor at vertical center, never unmounts between steps ── */}
              <AnimatePresence>
                {showTitle && (
                  <motion.div
                    key="title-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full"
                  >
                    {step === "title" ? (
                      <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-center text-xl md:text-2xl bg-transparent outline-none"
                        style={{
                          fontFamily: "var(--font-crimson-pro), serif",
                          fontWeight: 200,
                          color: "rgba(255, 255, 255, 0.85)",
                          caretColor: "rgba(160, 140, 255, 0.6)",
                          padding: "8px 0",
                        }}
                        autoComplete="off"
                      />
                    ) : (
                      /* Title stays centered; pencil floats next to text via inline-flex wrapper */
                      <div className="flex justify-center" style={{ padding: "8px 0" }}>
                        <span
                          className="inline-flex items-center gap-2 text-xl md:text-2xl select-none"
                          style={{
                            fontFamily: "var(--font-crimson-pro), serif",
                            fontWeight: 200,
                            color: "rgba(255, 255, 255, 0.55)",
                          }}
                        >
                          {title}
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.25 }}
                            whileHover={{ opacity: 0.7 }}
                            transition={{ duration: 0.3 }}
                            className="shrink-0 cursor-pointer"
                            style={{ background: "none", border: "none", padding: 4 }}
                            onClick={goBackToTitle}
                            title="Edit title"
                          >
                            <PencilIcon />
                          </motion.button>
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── "Vision received." — replaces title at the same position ── */}
              <AnimatePresence>
                {step === "received" && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center text-lg select-none w-full"
                    style={{
                      fontFamily: "var(--font-crimson-pro), serif",
                      fontWeight: 200,
                      color: "rgba(200, 180, 255, 0.7)",
                      padding: "8px 0",
                    }}
                  >
                    Vision received.
                  </motion.p>
                )}
              </AnimatePresence>

              {/* ── Below-title zone — description, error, buttons ── */}
              <div className="absolute left-0 right-0" style={{ top: "100%", paddingTop: 24, paddingLeft: 32, paddingRight: 32 }}>
                {/* Continue button (step 1) — fades out in place before description appears */}
                <AnimatePresence>
                  {showContinue && (
                    <motion.div
                      {...fadeUp}
                      transition={{ duration: 0.3 }}
                      className="flex justify-center"
                    >
                      <ShrineButton variant="purple" onClick={advanceToDescription}>
                        Continue
                      </ShrineButton>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description textarea (step 2 — delayed until Continue exits) */}
                <AnimatePresence>
                  {step === "description" && descContentReady && (
                    <motion.div
                      {...fadeUp}
                      transition={{ duration: 0.35 }}
                      className="w-full"
                    >
                      <textarea
                        ref={descRef}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full text-center text-sm bg-transparent outline-none resize-none"
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          padding: "8px 12px",
                          lineHeight: 1.6,
                          caretColor: "rgba(160, 140, 255, 0.6)",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400/80 text-xs text-center mt-3"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button (step 2) */}
                <AnimatePresence>
                  {showSubmitBtn && (
                    <motion.div
                      {...fadeUp}
                      transition={{ duration: 0.3 }}
                      className="flex justify-center mt-6"
                    >
                      <ShrineButton variant="purple" onClick={handleSubmit}>
                        Submit
                      </ShrineButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
