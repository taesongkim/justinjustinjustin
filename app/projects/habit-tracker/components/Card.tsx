"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { Card as CardType } from "../lib/types";
import { formatWeekday, formatShortDate } from "../lib/service";
import HabitItem from "./HabitItem";
import AddHabitInput from "./AddHabitInput";

interface CardProps {
  card: CardType;
  userName: string;
  userGoals: string;
  onToggleHabit: (habitId: string, checked: boolean) => void;
  onAddHabit: (cardId: string, text: string) => void;
  onRemoveHabit: (habitId: string) => void;
  onReorderHabits: (cardId: string, orderedIds: string[]) => void;
  onUpdateNote: (cardId: string, text: string) => void;
  onUpdateGoals: (userId: string, goals: string) => void;
  isToday: boolean;
}

export default function Card({
  card,
  userName,
  userGoals,
  onToggleHabit,
  onAddHabit,
  onRemoveHabit,
  onReorderHabits,
  onUpdateNote,
  onUpdateGoals,
  isToday,
}: CardProps) {
  const [note, setNote] = useState(card.note);
  const [goals, setGoals] = useState(userGoals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const noteDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const goalsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNote(card.note);
  }, [card.note, card.id]);

  useEffect(() => {
    setGoals(userGoals);
  }, [userGoals]);

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNote(val);
      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
      noteDebounceRef.current = setTimeout(() => {
        onUpdateNote(card.id, val);
      }, 500);
    },
    [card.id, onUpdateNote]
  );

  const handleGoalsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setGoals(val);
      if (goalsDebounceRef.current) clearTimeout(goalsDebounceRef.current);
      goalsDebounceRef.current = setTimeout(() => {
        onUpdateGoals(card.user_id, val);
      }, 500);
    },
    [card.user_id, onUpdateGoals]
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
    <div className={`ht-card ${isToday ? "ht-card-today" : ""} ${card.habits.length > 0 && card.habits.every((h) => h.checked) ? "ht-card-complete" : ""}`}>
      {/* Header */}
      <div className="ht-card-header">
        <span className="ht-card-name">{userName}</span>
        <div className="ht-card-date-block">
          <p className="ht-card-weekday">{formatWeekday(card.date)}</p>
          <p className="ht-card-date">{formatShortDate(card.date)}</p>
        </div>
      </div>

      {/* Goals */}
      <textarea
        className="ht-goals"
        value={goals}
        onChange={handleGoalsChange}
        placeholder="Goals & commitments..."
        rows={2}
      />

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
