"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { Card as CardType } from "../lib/types";
import { formatDate } from "../lib/service";
import HabitItem from "./HabitItem";
import AddHabitInput from "./AddHabitInput";

interface CardProps {
  card: CardType;
  userName: string;
  onToggleHabit: (habitId: string, checked: boolean) => void;
  onAddHabit: (cardId: string, text: string) => void;
  onRemoveHabit: (habitId: string) => void;
  onReorderHabits: (cardId: string, orderedIds: string[]) => void;
  onUpdateNote: (cardId: string, text: string) => void;
  onDeleteUser: (userId: string) => void;
  isToday: boolean;
}

export default function Card({
  card,
  userName,
  onToggleHabit,
  onAddHabit,
  onRemoveHabit,
  onReorderHabits,
  onUpdateNote,
  onDeleteUser,
  isToday,
}: CardProps) {
  const [note, setNote] = useState(card.note);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync note from props when card changes
  useEffect(() => {
    setNote(card.note);
  }, [card.note, card.id]);

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNote(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdateNote(card.id, val);
      }, 500);
    },
    [card.id, onUpdateNote]
  );

  function handleDragEnd() {
    if (dragId && dragOverId && dragId !== dragOverId) {
      const ids = card.habits.map((h) => h.id);
      const fromIdx = ids.indexOf(dragId);
      const toIdx = ids.indexOf(dragOverId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const reordered = [...ids];
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, dragId);
        onReorderHabits(card.id, reordered);
      }
    }
    setDragId(null);
    setDragOverId(null);
  }

  return (
    <div className={`ht-card ${isToday ? "ht-card-today" : ""}`}>
      {/* Header */}
      <div className="ht-card-header">
        <div>
          <h3 className="ht-card-name">{userName}</h3>
          <p className="ht-card-date">{formatDate(card.date)}</p>
        </div>
        <button
          className="ht-card-menu-btn"
          onClick={() => setShowDeleteConfirm(true)}
          aria-label={`Delete user ${userName}`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="3" r="1.2" fill="currentColor" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
            <circle cx="8" cy="13" r="1.2" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="ht-delete-confirm">
          <p>Delete {userName} and all their data?</p>
          <div className="ht-delete-confirm-actions">
            <button
              className="ht-delete-confirm-cancel"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="ht-delete-confirm-delete"
              onClick={() => onDeleteUser(card.user_id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Habits */}
      <div className="ht-habit-list">
        <AnimatePresence initial={false}>
          {card.habits.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              onToggle={onToggleHabit}
              onRemove={onRemoveHabit}
              onDragStart={setDragId}
              onDragOver={setDragOverId}
              onDragEnd={handleDragEnd}
              isDragging={dragId === habit.id}
              isDragTarget={dragOverId === habit.id}
            />
          ))}
        </AnimatePresence>
      </div>

      <AddHabitInput onAdd={(text) => onAddHabit(card.id, text)} />

      {/* Notes */}
      <textarea
        className="ht-note"
        value={note}
        onChange={handleNoteChange}
        placeholder="Notes for today..."
        rows={2}
      />
    </div>
  );
}
