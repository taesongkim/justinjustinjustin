"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User, Card as CardType } from "../lib/types";
import * as svc from "../lib/service";
import Card from "./Card";

// ─── Reduced motion helper ──────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ─── Main Component ─────────────────────────────────────────────────

export default function HabitTracker() {
  const reducedMotion = usePrefersReducedMotion();
  const transitionDuration = reducedMotion ? 0 : 0.2;

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(svc.today());
  const [cards, setCards] = useState<Map<string, CardType>>(new Map());
  const [loading, setLoading] = useState(true);
  const [mobileUserIdx, setMobileUserIdx] = useState(0);
  const [dayDirection, setDayDirection] = useState(0); // -1 past, 1 future
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const newUserInputRef = useRef<HTMLInputElement>(null);

  // Track whether earlier/later cards exist for peek hints
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    try {
      const u = await svc.getUsers();
      setUsers(u);
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  }, []);

  const loadCardsForDate = useCallback(
    async (date: string, userList?: User[]) => {
      const u = userList ?? users;
      if (u.length === 0) {
        setCards(new Map());
        return;
      }
      try {
        const fetched = await svc.ensureCardsForDate(u, date);
        const map = new Map<string, CardType>();
        fetched.forEach((c) => map.set(c.user_id, c));
        setCards(map);
      } catch (e) {
        console.error("Failed to load cards:", e);
      }
    },
    [users]
  );

  // Check if adjacent days have any existing cards (for peek visibility)
  const checkAdjacentDays = useCallback(
    async (date: string) => {
      const prev = svc.shiftDate(date, -1);
      const next = svc.shiftDate(date, 1);
      try {
        const [prevCards, nextCards] = await Promise.all([
          svc.getCardsForDate(prev),
          svc.getCardsForDate(next),
        ]);
        setHasPrev(prevCards.length > 0);
        // Future days always peekable (lazy creation means they can be created)
        setHasNext(true);
      } catch {
        setHasPrev(false);
        setHasNext(true);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const u = await svc.getUsers();
      setUsers(u);
      if (u.length > 0) {
        await loadCardsForDate(currentDate, u);
      }
      await checkAdjacentDays(currentDate);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload cards when date changes
  useEffect(() => {
    if (users.length > 0) {
      loadCardsForDate(currentDate);
      checkAdjacentDays(currentDate);
    }
  }, [currentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time subscriptions ─────────────────────────────────────

  useEffect(() => {
    const unsub = svc.subscribeToChanges(
      () => loadCardsForDate(currentDate),
      () => loadCardsForDate(currentDate),
      () => loadUsers().then(() => loadCardsForDate(currentDate))
    );
    return unsub;
  }, [currentDate, loadCardsForDate, loadUsers]);

  // ── Day navigation ──────────────────────────────────────────────

  function goToPrevDay() {
    setDayDirection(-1);
    setCurrentDate((d) => svc.shiftDate(d, -1));
  }

  function goToNextDay() {
    setDayDirection(1);
    setCurrentDate((d) => svc.shiftDate(d, 1));
  }

  function goToToday() {
    const t = svc.today();
    setDayDirection(currentDate > t ? -1 : 1);
    setCurrentDate(t);
  }

  // ── Mobile user navigation ─────────────────────────────────────

  function prevUser() {
    setMobileUserIdx((i) => Math.max(0, i - 1));
  }

  function nextUser() {
    setMobileUserIdx((i) => Math.min(users.length - 1, i + 1));
  }

  // Clamp mobile index when users change
  useEffect(() => {
    if (mobileUserIdx >= users.length) {
      setMobileUserIdx(Math.max(0, users.length - 1));
    }
  }, [users.length, mobileUserIdx]);

  // ── Card action handlers ────────────────────────────────────────

  async function handleToggleHabit(habitId: string, checked: boolean) {
    // Optimistic update
    setCards((prev) => {
      const next = new Map(prev);
      for (const [uid, card] of next) {
        const habit = card.habits.find((h) => h.id === habitId);
        if (habit) {
          next.set(uid, {
            ...card,
            habits: card.habits.map((h) =>
              h.id === habitId ? { ...h, checked } : h
            ),
          });
          break;
        }
      }
      return next;
    });
    await svc.toggleHabit(habitId, checked);
  }

  async function handleAddHabit(cardId: string, text: string) {
    const habit = await svc.addHabit(cardId, text);
    setCards((prev) => {
      const next = new Map(prev);
      for (const [uid, card] of next) {
        if (card.id === cardId) {
          next.set(uid, { ...card, habits: [...card.habits, habit] });
          break;
        }
      }
      return next;
    });
  }

  async function handleRemoveHabit(habitId: string) {
    // Optimistic remove
    setCards((prev) => {
      const next = new Map(prev);
      for (const [uid, card] of next) {
        if (card.habits.some((h) => h.id === habitId)) {
          next.set(uid, {
            ...card,
            habits: card.habits.filter((h) => h.id !== habitId),
          });
          break;
        }
      }
      return next;
    });
    await svc.removeHabit(habitId);
  }

  async function handleReorderHabits(cardId: string, orderedIds: string[]) {
    // Optimistic reorder
    setCards((prev) => {
      const next = new Map(prev);
      for (const [uid, card] of next) {
        if (card.id === cardId) {
          const habitMap = new Map(card.habits.map((h) => [h.id, h]));
          const reordered = orderedIds
            .map((id, i) => {
              const h = habitMap.get(id);
              return h ? { ...h, sort_order: i } : null;
            })
            .filter(Boolean) as CardType["habits"];
          next.set(uid, { ...card, habits: reordered });
          break;
        }
      }
      return next;
    });
    await svc.reorderHabits(cardId, orderedIds);
  }

  async function handleUpdateNote(cardId: string, text: string) {
    await svc.updateNote(cardId, text);
  }

  async function handleDeleteUser(userId: string) {
    await svc.deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setCards((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }

  async function handleCreateUser() {
    const name = newUserName.trim();
    if (!name) return;
    const user = await svc.createUser(name);
    setUsers((prev) => [...prev, user]);
    setNewUserName("");
    setAddingUser(false);
    // Create first card for the new user
    const card = await svc.ensureCardExists(user.id, currentDate);
    setCards((prev) => {
      const next = new Map(prev);
      next.set(user.id, card);
      return next;
    });
  }

  // ── Day slide variants ──────────────────────────────────────────

  const dayVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: { y: 0, opacity: 1 },
    exit: (dir: number) => ({
      y: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  // ── Render ──────────────────────────────────────────────────────

  const isToday = currentDate === svc.today();

  if (loading) {
    return (
      <div className="ht-loading">
        <div className="ht-spinner" />
      </div>
    );
  }

  return (
    <div className="ht-container">
      {/* Day navigation header */}
      <div className="ht-day-nav">
        <button className="ht-nav-btn" onClick={goToPrevDay} aria-label="Previous day">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        <div className="ht-day-label">
          <span className="ht-day-label-text">{svc.formatDate(currentDate)}</span>
          {!isToday && (
            <button className="ht-today-btn" onClick={goToToday}>
              Today
            </button>
          )}
        </div>

        <button className="ht-nav-btn" onClick={goToNextDay} aria-label="Next day">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>

      {/* Mobile user navigation */}
      {users.length > 1 && (
        <div className="ht-mobile-user-nav">
          <button
            className="ht-mobile-nav-btn"
            onClick={prevUser}
            disabled={mobileUserIdx === 0}
            aria-label="Previous user"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <div className="ht-mobile-user-dots">
            {users.map((u, i) => (
              <button
                key={u.id}
                className={`ht-dot ${i === mobileUserIdx ? "ht-dot-active" : ""}`}
                onClick={() => setMobileUserIdx(i)}
                aria-label={`View ${u.name}`}
              />
            ))}
          </div>
          <button
            className="ht-mobile-nav-btn"
            onClick={nextUser}
            disabled={mobileUserIdx === users.length - 1}
            aria-label="Next user"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>
      )}

      {/* Peek hint: previous day */}
      {hasPrev && <div className="ht-peek ht-peek-top" onClick={goToPrevDay} />}

      {/* Cards area */}
      <div className="ht-cards-viewport">
        <AnimatePresence mode="wait" custom={dayDirection}>
          <motion.div
            key={currentDate}
            className="ht-cards-row"
            custom={dayDirection}
            variants={dayVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: transitionDuration, ease: "easeInOut" }}
          >
            {users.map((user, i) => {
              const card = cards.get(user.id);
              if (!card) return null;
              return (
                <div
                  key={user.id}
                  className={`ht-card-wrapper ${
                    i !== mobileUserIdx ? "ht-card-hidden-mobile" : ""
                  }`}
                >
                  <Card
                    card={card}
                    userName={user.name}
                    onToggleHabit={handleToggleHabit}
                    onAddHabit={handleAddHabit}
                    onRemoveHabit={handleRemoveHabit}
                    onReorderHabits={handleReorderHabits}
                    onUpdateNote={handleUpdateNote}
                    onDeleteUser={handleDeleteUser}
                    isToday={isToday}
                  />
                </div>
              );
            })}

            {/* Add user card */}
            <div className={`ht-card-wrapper ht-add-user-wrapper ${
              users.length > 0 && mobileUserIdx !== users.length ? "ht-card-hidden-mobile" : ""
            }`}>
              {addingUser ? (
                <div className="ht-card ht-add-user-card">
                  <input
                    ref={newUserInputRef}
                    type="text"
                    className="ht-add-user-input"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateUser();
                      if (e.key === "Escape") {
                        setAddingUser(false);
                        setNewUserName("");
                      }
                    }}
                    placeholder="Name"
                    autoFocus
                  />
                  <div className="ht-add-user-actions">
                    <button
                      className="ht-add-user-cancel"
                      onClick={() => {
                        setAddingUser(false);
                        setNewUserName("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="ht-add-user-confirm"
                      onClick={handleCreateUser}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="ht-card ht-add-user-btn-card"
                  onClick={() => setAddingUser(true)}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Add Person</span>
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Peek hint: next day */}
      {hasNext && <div className="ht-peek ht-peek-bottom" onClick={goToNextDay} />}
    </div>
  );
}
