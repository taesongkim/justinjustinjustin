"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 1–5 self-assessment scale. Index 0 = level 1.
export const CONFIDENCE_LABELS = [
  "Uncertain",
  "Working on it",
  "Answered Confidently",
  "Memorized",
  "Able to Teach",
] as const;

export const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const;

// A horizontal 1–5 track with ring notches and a draggable, snapping handle.
// Per-level state (1 faint · 2 pulsing · 3 solid · 4 glow · 5 rings) is driven
// by [data-level] in CSS. The handle expands on hover/drag for an easy grab and
// drops back to rest the instant a drag is released; it only expands again on a
// fresh hover (leave + re-enter) or another grab.
export function ConfidenceSlider({
  value,
  onChange,
  className,
  ariaLabel = "Your confidence",
  interactive = true,
}: {
  value: number | null;
  onChange?: (level: number) => void;
  className?: string;
  ariaLabel?: string;
  interactive?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragLevelRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  // After a release the handle stays at rest even though the cursor is still
  // over it; a new hover (leave + re-enter) or grab clears this.
  const [suppressed, setSuppressed] = useState(false);
  const [dragLevel, setDragLevel] = useState<number | null>(null);
  const [moveTick, setMoveTick] = useState(0);
  const [settling, setSettling] = useState(false);
  // Tooltip is portaled to <body> (fixed) so the card's overflow can't clip it.
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const shownLevel = dragLevel ?? value ?? 1;
  const active = dragging || (hovering && !suppressed);
  const percentFor = (level: number) => ((level - 1) / 4) * 100;

  const levelFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const clamped = Math.min(1, Math.max(0, ratio));
    return Math.round(clamped * 4) + 1;
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive) return;
    event.preventDefault();
    setSuppressed(false);
    setDragging(true);
    const next = levelFromClientX(event.clientX);
    if (next) {
      dragLevelRef.current = next;
      setDragLevel(next);
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const next = levelFromClientX(event.clientX);
      if (next && next !== dragLevelRef.current) {
        dragLevelRef.current = next;
        setDragLevel(next);
        // Each notch change replays the "move" ripple (keyed remount).
        setMoveTick((tick) => tick + 1);
      }
    };
    const finish = (event: PointerEvent) => {
      const landed =
        levelFromClientX(event.clientX) ?? dragLevelRef.current ?? value ?? 1;
      setDragging(false);
      setDragLevel(null);
      dragLevelRef.current = null;
      // Drop the expansion immediately and fire the settle ripple on release.
      setSuppressed(true);
      setSettling(true);
      if (landed !== value) onChange?.(landed);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [dragging, levelFromClientX, onChange, value]);

  // Track the tooltip to the handle's viewport position while active.
  useEffect(() => {
    if (!active || !trackRef.current) {
      setTooltipPos(null);
      return;
    }
    const rect = trackRef.current.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + (percentFor(shownLevel) / 100) * rect.width,
      y: rect.top,
    });
    // percentFor is a pure inline helper; shownLevel/active drive recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, shownLevel]);

  return (
    <div
      className={`ce-confidence${className ? ` ${className}` : ""}`}
      data-level={shownLevel}
      data-active={active || undefined}
      data-dragging={dragging || undefined}
      data-settling={settling || undefined}
      data-unset={value == null && dragLevel == null ? "true" : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setSuppressed(false);
      }}
    >
      <div className="ce-confidence-track" ref={trackRef}>
        <span className="ce-confidence-rail" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="ce-confidence-rail-fill"
          style={{ width: `${percentFor(shownLevel)}%` }}
        />
        {CONFIDENCE_LEVELS.map((level) => (
          <span
            aria-hidden="true"
            className="ce-confidence-notch"
            data-filled={shownLevel > level || undefined}
            key={level}
            style={{ left: `${percentFor(level)}%` }}
          />
        ))}
        <button
          aria-label={`${ariaLabel}: ${CONFIDENCE_LABELS[shownLevel - 1]} (${shownLevel} of 5)`}
          className="ce-confidence-handle"
          disabled={!interactive}
          onPointerDown={onPointerDown}
          style={{ left: `${percentFor(shownLevel)}%` }}
          type="button"
        >
          <span className="ce-confidence-core" aria-hidden="true" />
          <span className="ce-confidence-glow" aria-hidden="true" />
          <span className="ce-confidence-rings" aria-hidden="true" />
          {dragging && (
            <span
              aria-hidden="true"
              className="ce-confidence-move"
              key={moveTick}
            />
          )}
          <span
            aria-hidden="true"
            className="ce-confidence-settle"
            onAnimationEnd={() => setSettling(false)}
          />
        </button>
      </div>
      {active &&
        tooltipPos &&
        createPortal(
          <span
            className="ce-confidence-tooltip"
            role="status"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            {CONFIDENCE_LABELS[shownLevel - 1]}
          </span>,
          document.body,
        )}
    </div>
  );
}
