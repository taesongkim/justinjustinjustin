"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { TodoItem } from "../lib/types";
import { formatDuration } from "../lib/types";

// ─── Types ────────────────────────────────────────────────────

interface FocusModalProps {
  item: TodoItem;
  onToggleCaution: () => void;
  onUpdateDuration: (seconds: number) => void;
  onComplete: () => void;
  onClose: () => void;
}

// ─── Stopwatch Button ─────────────────────────────────────────

function StopwatchButton({
  label,
  onClick,
  color,
  children,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
      }}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        border: "none",
        background: "rgba(255, 255, 255, 0.04)",
        color: color ?? "var(--nt-text-secondary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────

export default function FocusModal({
  item,
  onToggleCaution,
  onUpdateDuration,
  onComplete,
  onClose,
}: FocusModalProps) {
  const [elapsed, setElapsed] = useState(item.duration ?? 0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(elapsed);

  // Keep ref in sync so cleanup callbacks can read the latest value
  elapsedRef.current = elapsed;

  // ─── Interval management ───────────────────────────────────

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const handlePause = useCallback(() => {
    stopInterval();
    onUpdateDuration(elapsedRef.current);
  }, [stopInterval, onUpdateDuration]);

  const handleReset = useCallback(() => {
    stopInterval();
    setElapsed(0);
    onUpdateDuration(0);
  }, [stopInterval, onUpdateDuration]);

  const handleStop = useCallback(() => {
    stopInterval();
    onUpdateDuration(elapsedRef.current);
    onComplete();
  }, [stopInterval, onUpdateDuration, onComplete]);

  const handleClose = useCallback(() => {
    // If running, pause and save before closing
    if (intervalRef.current) {
      stopInterval();
      onUpdateDuration(elapsedRef.current);
    }
    onClose();
  }, [stopInterval, onUpdateDuration, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  return (
    <motion.div
      key="focus-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <motion.div
        key="focus-modal-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 320,
          background: "rgba(30, 30, 30, 0.15)",
          backdropFilter: "blur(7px)",
          WebkitBackdropFilter: "blur(7px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 6,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--nt-text-primary)",
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {item.text || "Untitled"}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255, 255, 255, 0.08)",
          }}
        />

        {/* Stopwatch Display */}
        <div
          style={{
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif",
              color: isRunning ? "var(--nt-text-primary)" : "var(--nt-text-secondary)",
              letterSpacing: "0.05em",
              lineHeight: 1,
              transition: "color 0.15s",
            }}
          >
            {formatDuration(elapsed)}
          </div>
        </div>

        {/* Stopwatch Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {/* Start / Pause */}
          {isRunning ? (
            <StopwatchButton label="Pause" onClick={handlePause}>
              {/* Pause icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            </StopwatchButton>
          ) : (
            <StopwatchButton label="Start" onClick={startTimer} color="#4ade80">
              {/* Play icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.5a.5.5 0 0 1 .77-.42l9 5.5a.5.5 0 0 1 0 .84l-9 5.5A.5.5 0 0 1 4 13.5V2.5z" />
              </svg>
            </StopwatchButton>
          )}

          {/* Reset */}
          <StopwatchButton label="Reset" onClick={handleReset}>
            {/* Reset / counter-clockwise arrow icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 2.5v4h4" />
              <path d="M2.9 10a5.5 5.5 0 1 0 1.1-4.5L2.5 6.5" />
            </svg>
          </StopwatchButton>

          {/* Stop (complete) */}
          <StopwatchButton
            label="Stop and complete"
            onClick={handleStop}
            color={elapsed > 0 ? "#fb923c" : undefined}
          >
            {/* Check mark icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8.5 L6.5 12 L13 4" />
            </svg>
          </StopwatchButton>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255, 255, 255, 0.08)",
          }}
        />

        {/* Caution button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCaution();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.caution
                  ? "rgba(251, 146, 60, 0.15)"
                  : "rgba(255, 255, 255, 0.08)";
                const tip = e.currentTarget.parentElement?.querySelector(
                  "[data-tooltip]"
                ) as HTMLElement | null;
                if (tip) tip.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                const tip = e.currentTarget.parentElement?.querySelector(
                  "[data-tooltip]"
                ) as HTMLElement | null;
                if (tip) tip.style.opacity = "0";
              }}
              aria-label="Toggle caution"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
                padding: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
              >
                <path
                  d="M9 2L16.5 15.5H1.5L9 2Z"
                  stroke={item.caution ? "#fb923c" : "var(--nt-text-muted)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={item.caution ? "rgba(251, 146, 60, 0.15)" : "none"}
                />
                <path
                  d="M9 7V10"
                  stroke={item.caution ? "#fb923c" : "var(--nt-text-muted)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="9"
                  cy="12.5"
                  r="0.75"
                  fill={item.caution ? "#fb923c" : "var(--nt-text-muted)"}
                />
              </svg>
            </button>
            {/* Styled tooltip */}
            <div
              data-tooltip
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(20, 20, 20, 0.9)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                lineHeight: 1.4,
                color: "var(--nt-text-secondary)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                opacity: 0,
                transition: "opacity 0.12s",
              }}
            >
              Toggle Caution
              <span style={{ display: "block", fontSize: 11, color: "var(--nt-text-muted)", marginTop: 1 }}>
                Highlight items needing attention
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
