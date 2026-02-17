"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Habit } from "../lib/types";

// ─── Spiral dot type ────────────────────────────────────────────────

type SparkDot = {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  delay: number;
  size: number;
};

function makeDots(seed: number): SparkDot[] {
  // Simple seeded pseudo-random so each click looks different
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; };

  return Array.from({ length: 12 }, (_, i) => {
    const baseAngle = (i / 12) * 360;
    const angle = baseAngle + rand() * 60 - 30; // scatter ±30° from even spacing
    const rad = (angle * Math.PI) / 180;
    const startDist = 9 + rand() * 3;            // 9–12px from center
    const endDist = startDist + 3 + rand() * 6;  // 3–9px further out
    return {
      id: `${seed}-${i}`,
      startX: Math.cos(rad) * startDist,
      startY: Math.sin(rad) * startDist,
      x: Math.cos(rad) * endDist,
      y: Math.sin(rad) * endDist,
      delay: rand() * 0.12,                      // random delay 0–120ms
      size: 2 + rand() * 2.5,                    // 2–4.5px
    };
  });
}

// ─── Component ──────────────────────────────────────────────────────

interface HabitItemProps {
  habit: Habit;
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragTarget: boolean;
}

export default function HabitItem({
  habit,
  onToggle,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragTarget,
}: HabitItemProps) {
  const [dots, setDots] = useState<SparkDot[]>([]);
  const seedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleToggle() {
    const next = !habit.checked;
    if (next) {
      seedRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      setDots(makeDots(seedRef.current));
      timerRef.current = setTimeout(() => setDots([]), 500);
    }
    onToggle(habit.id, next);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`ht-habit-item ${isDragging ? "ht-habit-dragging" : ""} ${
        isDragTarget ? "ht-habit-drag-target" : ""
      }`}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(habit.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(habit.id);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd();
      }}
    >
      <button
        className={`ht-checkbox ${habit.checked ? "ht-checkbox-checked" : ""}`}
        onClick={handleToggle}
        aria-label={`Mark "${habit.text}" as ${habit.checked ? "incomplete" : "complete"}`}
        style={{ position: "relative", overflow: "visible" }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="ht-checkmark"
          aria-hidden="true"
        >
          <AnimatePresence>
            {habit.checked && (
              <motion.path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </motion.svg>
        {dots.map((d) => (
          <span
            key={d.id}
            className="ht-spiral-dot"
            style={{
              "--spiral-sx": `${d.startX}px`,
              "--spiral-sy": `${d.startY}px`,
              "--spiral-x": `${d.x}px`,
              "--spiral-y": `${d.y}px`,
              "--spiral-delay": `${d.delay}s`,
              width: d.size,
              height: d.size,
            } as React.CSSProperties}
          />
        ))}
      </button>

      <span
        className={`ht-habit-text ${habit.checked ? "ht-habit-checked-text" : ""}`}
      >
        {habit.text}
      </span>

      <button
        className="ht-habit-remove"
        onClick={() => onRemove(habit.id)}
        aria-label={`Remove habit "${habit.text}"`}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

    </motion.div>
  );
}
