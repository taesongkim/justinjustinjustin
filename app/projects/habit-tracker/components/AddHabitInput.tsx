"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AddHabitInputProps {
  onAdd: (text: string) => void;
}

export default function AddHabitInput({ onAdd }: AddHabitInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setText("");
      setIsOpen(false);
    }
  }

  return (
    <div className="ht-add-habit">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="input"
            className="ht-add-habit-input-row"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <input
              ref={inputRef}
              type="text"
              className="ht-add-habit-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!text.trim()) setIsOpen(false);
              }}
              placeholder="New habit..."
              autoFocus
            />
          </motion.div>
        ) : (
          <motion.button
            key="button"
            className="ht-add-habit-btn"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M8 2v12M2 8h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Add habit</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
