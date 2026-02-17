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

// ─── Preview Card (read-only, low opacity) ──────────────────────────

function PreviewCard({ card, userName, userGoals }: { card: CardType; userName: string; userGoals: string }) {
  return (
    <div className="ht-card">
      <div className="ht-card-header">
        <span className="ht-card-name">{userName}</span>
        <div className="ht-card-date-block">
          <p className="ht-card-weekday">{svc.formatWeekday(card.date)}</p>
          <p className="ht-card-date">{svc.formatShortDate(card.date)}</p>
        </div>
      </div>
      {userGoals && (
        <div className="ht-goals" style={{ pointerEvents: "none", minHeight: "unset" }}>
          {userGoals}
        </div>
      )}
      <div className="ht-habit-list">
        {card.habits.map((habit) => (
          <div key={habit.id} className="ht-habit-item" style={{ cursor: "default" }}>
            <div
              className={`ht-checkbox ${habit.checked ? "ht-checkbox-checked" : ""}`}
              style={{ pointerEvents: "none" }}
            >
              {habit.checked && (
                <svg viewBox="0 0 24 24" className="ht-checkmark">
                  <path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className={`ht-habit-text ${habit.checked ? "ht-habit-checked-text" : ""}`}>
              {habit.text}
            </span>
          </div>
        ))}
      </div>
      {card.note && (
        <div className="ht-note" style={{ pointerEvents: "none", minHeight: "unset" }}>
          {card.note}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function HabitTracker() {
  const reducedMotion = usePrefersReducedMotion();
  const transitionDuration = reducedMotion ? 0 : 0.2;

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(svc.today());
  const [cards, setCards] = useState<Map<string, CardType>>(new Map());
  const [prevDayCards, setPrevDayCards] = useState<Map<string, CardType>>(new Map());
  const [nextDayCards, setNextDayCards] = useState<Map<string, CardType>>(new Map());
  const [loading, setLoading] = useState(true);
  const [mobileUserIdx, setMobileUserIdx] = useState(0);
  const [dayDirection, setDayDirection] = useState(0); // -1 past, 1 future
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const newUserInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Load adjacent day cards (read-only, no lazy creation — just fetch what exists)
  const loadAdjacentCards = useCallback(
    async (date: string) => {
      const prevDate = svc.shiftDate(date, -1);
      const nextDate = svc.shiftDate(date, 1);
      try {
        const [prev, next] = await Promise.all([
          svc.getCardsForDate(prevDate),
          svc.getCardsForDate(nextDate),
        ]);
        const prevMap = new Map<string, CardType>();
        prev.forEach((c) => prevMap.set(c.user_id, c));
        setPrevDayCards(prevMap);

        const nextMap = new Map<string, CardType>();
        next.forEach((c) => nextMap.set(c.user_id, c));
        setNextDayCards(nextMap);
      } catch {
        setPrevDayCards(new Map());
        setNextDayCards(new Map());
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
      await loadAdjacentCards(currentDate);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload cards when date changes
  useEffect(() => {
    if (users.length > 0) {
      loadCardsForDate(currentDate);
      loadAdjacentCards(currentDate);
    }
  }, [currentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time subscriptions ─────────────────────────────────────

  useEffect(() => {
    const unsub = svc.subscribeToChanges(
      () => {
        loadCardsForDate(currentDate);
        loadAdjacentCards(currentDate);
      },
      () => {
        loadCardsForDate(currentDate);
        loadAdjacentCards(currentDate);
      },
      () => loadUsers().then(() => {
        loadCardsForDate(currentDate);
        loadAdjacentCards(currentDate);
      })
    );
    return unsub;
  }, [currentDate, loadCardsForDate, loadUsers, loadAdjacentCards]);

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

  async function handleUpdateGoals(userId: string, goals: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, goals } : u))
    );
    await svc.updateUserGoals(userId, goals);
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

  // ── Render helpers ────────────────────────────────────────────────

  const isToday = currentDate === svc.today();
  const hasPrev = prevDayCards.size > 0;

  function renderPreviewRow(dayCards: Map<string, CardType>, position: "top" | "bottom") {
    const isEmpty = dayCards.size === 0;
    // For bottom (future) position, show dotted placeholder if no cards exist
    if (isEmpty && position === "top") return null;
    return (
      <div
        className={`ht-preview-row ht-preview-${position}`}
        onClick={position === "top" ? goToPrevDay : goToNextDay}
      >
        <div className="ht-preview-row-inner">
          {isEmpty ? (
            <div className="ht-preview-placeholder-wrapper">
              <div className="ht-preview-placeholder" />
            </div>
          ) : (
            users.map((user, i) => {
              const card = dayCards.get(user.id);
              if (!card) return null;
              return (
                <div
                  key={user.id}
                  className={`ht-card-wrapper ${
                    i !== mobileUserIdx ? "ht-card-hidden-mobile" : ""
                  }`}
                >
                  <PreviewCard card={card} userName={user.name} userGoals={user.goals ?? ""} />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderUserPeek(direction: "left" | "right") {
    const targetIdx = direction === "left" ? mobileUserIdx - 1 : mobileUserIdx + 1;
    if (targetIdx < 0 || targetIdx >= users.length) return null;
    const user = users[targetIdx];
    return (
      <button
        className={`ht-peek-user ht-peek-user-${direction}`}
        onClick={direction === "left" ? prevUser : nextUser}
        aria-label={`View ${user.name}'s card`}
      >
        <span className="ht-peek-user-label">{user.name}</span>
      </button>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="ht-loading">
        <div className="ht-spinner" />
      </div>
    );
  }

  return (
    <div className="ht-container">
      {/* Top-right toolbar */}
      <div className="ht-toolbar">
        <button
          className="ht-toolbar-btn"
          onClick={() => { setAddingUser(true); setMenuOpen(false); }}
          aria-label="Add person"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="ht-menu-wrapper">
          <button
            className="ht-toolbar-btn"
            onClick={() => { setMenuOpen((v) => !v); setAddingUser(false); }}
            aria-label="Menu"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="3" r="1.2" fill="currentColor" />
              <circle cx="8" cy="8" r="1.2" fill="currentColor" />
              <circle cx="8" cy="13" r="1.2" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="ht-menu-dropdown">
              <p className="ht-menu-heading">Remove person</p>
              {users.map((u) => (
                <div key={u.id} className="ht-menu-user-row">
                  {confirmDeleteId === u.id ? (
                    <>
                      <span className="ht-menu-confirm-text">Delete {u.name}?</span>
                      <button
                        className="ht-menu-confirm-yes"
                        onClick={() => { handleDeleteUser(u.id); setConfirmDeleteId(null); setMenuOpen(false); }}
                      >
                        Yes
                      </button>
                      <button
                        className="ht-menu-confirm-no"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ht-menu-user-name">{u.name}</span>
                      <button
                        className="ht-menu-delete-btn"
                        onClick={() => setConfirmDeleteId(u.id)}
                        aria-label={`Delete ${u.name}`}
                      >
                        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <p className="ht-menu-empty">No users yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add user popover */}
      {addingUser && (
        <div className="ht-add-user-popover">
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
              onClick={() => { setAddingUser(false); setNewUserName(""); }}
            >
              Cancel
            </button>
            <button className="ht-add-user-confirm" onClick={handleCreateUser}>
              Add
            </button>
          </div>
        </div>
      )}

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

      {/* Preview: previous day */}
      {hasPrev && renderPreviewRow(prevDayCards, "top")}

      {/* Side peek cards for mobile user navigation */}
      {renderUserPeek("left")}
      {renderUserPeek("right")}

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
                    userGoals={user.goals ?? ""}
                    onToggleHabit={handleToggleHabit}
                    onAddHabit={handleAddHabit}
                    onRemoveHabit={handleRemoveHabit}
                    onReorderHabits={handleReorderHabits}
                    onUpdateNote={handleUpdateNote}
                    onUpdateGoals={handleUpdateGoals}
                    isToday={isToday}
                  />
                </div>
              );
            })}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Preview: next day (shows dotted placeholder if no cards exist yet) */}
      {renderPreviewRow(nextDayCards, "bottom")}
    </div>
  );
}
