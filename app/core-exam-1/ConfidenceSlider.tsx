"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// 1–5 self-assessment scale. Index 0 = level 1.
export const CONFIDENCE_LABELS = [
  "Uncertain",
  "Working on it",
  "Answered Confidently",
  "Memorized",
  "Able to Teach",
] as const;

export const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const;

export type ConfidenceMember = {
  id: string;
  name: string;
  color: string;
  level: number;
};

// A horizontal 1–5 track with ring notches. The viewer's own level is a
// draggable state-circle (styling per level is driven by [data-level] in CSS);
// other members show as read-only avatar-colored pips at their notches.
//
// Two distinct ripples: a "move" ripple fires from the expanded handle on each
// notch change during a drag (confirms movement); a "settle" ripple fires once
// after the handle has shrunk back to rest when the hover ends (confirms
// landing).
export function ConfidenceSlider({
  value,
  onChange,
  members = [],
  className,
  ariaLabel = "Your confidence",
  interactive = true,
}: {
  value: number | null;
  onChange?: (level: number) => void;
  members?: ConfidenceMember[];
  className?: string;
  ariaLabel?: string;
  interactive?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragLevelRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [dragLevel, setDragLevel] = useState<number | null>(null);
  const [moveTick, setMoveTick] = useState(0);
  const [settling, setSettling] = useState(false);

  // While dragging we preview dragLevel; otherwise show the committed value
  // (defaulting to 1 so an unset slider still has a visible resting handle).
  const shownLevel = dragLevel ?? value ?? 1;
  const active = dragging || hovering;
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

  // Settle ripple: when the hover/drag ends the handle snaps to rest with no
  // resize animation, so fire the ripple as soon as active goes false.
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) setSettling(true);
    wasActive.current = active;
  }, [active]);

  return (
    <div
      className={`ce-confidence${className ? ` ${className}` : ""}`}
      data-level={shownLevel}
      data-active={active || undefined}
      data-dragging={dragging || undefined}
      data-settling={settling || undefined}
      data-unset={value == null && dragLevel == null ? "true" : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
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
            data-filled={shownLevel >= level || undefined}
            key={level}
            style={{ left: `${percentFor(level)}%` }}
          />
        ))}
        {members.map((member) => (
          <span
            aria-hidden="true"
            className="ce-confidence-pip"
            key={member.id}
            style={
              {
                left: `${percentFor(member.level)}%`,
                "--pip": member.color,
              } as CSSProperties
            }
            title={`${member.name}: ${CONFIDENCE_LABELS[member.level - 1]}`}
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
      {active && (
        <span
          className="ce-confidence-tooltip"
          role="status"
          style={{ left: `${percentFor(shownLevel)}%` }}
        >
          {CONFIDENCE_LABELS[shownLevel - 1]}
        </span>
      )}
    </div>
  );
}
