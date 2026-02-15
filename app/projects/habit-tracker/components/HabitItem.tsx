"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Habit } from "../lib/types";

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
  const [justChecked, setJustChecked] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleToggle() {
    const next = !habit.checked;
    if (next) {
      setJustChecked(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setJustChecked(false), 400);
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

      {/* Pulse on check */}
      <AnimatePresence>
        {justChecked && (
          <motion.div
            className="ht-check-pulse"
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
