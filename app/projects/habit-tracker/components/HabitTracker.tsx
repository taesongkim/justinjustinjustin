"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User, Card as CardType, Journey, AvatarGif, AvatarMoodEntry } from "../lib/types";
import * as svc from "../lib/service";
import Card from "./Card";
import JourneyManager from "./JourneyManager";
import JourneyProgressBar from "./JourneyProgressBar";
import AvatarManager from "./AvatarManager";
import AvatarDisplay from "./AvatarDisplay";

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
  const [timezone, setTimezoneState] = useState(svc.getTimezone());
  const [currentDate, setCurrentDate] = useState(svc.today(timezone));
  const [cards, setCards] = useState<Map<string, CardType>>(new Map());
  const [prevDayCards, setPrevDayCards] = useState<Map<string, CardType>>(new Map());
  const [nextDayCards, setNextDayCards] = useState<Map<string, CardType>>(new Map());
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeyRefreshKey, setJourneyRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileUserIdx, setMobileUserIdx] = useState(0);
  const [dayDirection, setDayDirection] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const newUserInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [avatarGifs, setAvatarGifs] = useState<AvatarGif[]>([]);
  const [avatarMoods, setAvatarMoods] = useState<AvatarMoodEntry[]>([]);

  const todayDate = svc.today(timezone);

  function handleTimezoneChange(tz: string) {
    svc.setTimezone(tz);
    setTimezoneState(tz);
    const newToday = svc.today(tz);
    // If user was viewing today, shift to new today
    if (currentDate === svc.today(timezone)) {
      setCurrentDate(newToday);
    }
  }

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

  const loadJourneys = useCallback(async () => {
    try {
      const j = await svc.getAllJourneys();
      setJourneys(j);
    } catch (e) {
      console.error("Failed to load journeys:", e);
    }
  }, []);

  const loadAvatarGifs = useCallback(async () => {
    try {
      const gifs = await svc.getAllAvatarGifs();
      setAvatarGifs(gifs);
    } catch (e) {
      console.error("Failed to load avatar gifs:", e);
    }
  }, []);

  const loadAvatarMoods = useCallback(async (date: string) => {
    try {
      const moods = await svc.getAvatarMoodsForDate(date);
      setAvatarMoods(moods);
    } catch (e) {
      console.error("Failed to load avatar moods:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const u = await svc.getUsers();
      setUsers(u);
      if (u.length > 0) {
        await loadCardsForDate(currentDate, u);
      }
      await Promise.all([loadAdjacentCards(currentDate), loadJourneys(), loadAvatarGifs(), loadAvatarMoods(currentDate)]);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload cards when date changes
  useEffect(() => {
    if (users.length > 0) {
      loadCardsForDate(currentDate);
      loadAdjacentCards(currentDate);
    }
    loadAvatarMoods(currentDate);
  }, [currentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time subscriptions ─────────────────────────────────────

  useEffect(() => {
    const unsub = svc.subscribeToChanges(
      () => {
        loadCardsForDate(currentDate);
        loadAdjacentCards(currentDate);
        setJourneyRefreshKey((k) => k + 1);
      },
      () => {
        loadCardsForDate(currentDate);
        loadAdjacentCards(currentDate);
        setJourneyRefreshKey((k) => k + 1);
      },
      () => loadUsers().then(() => {
        loadCardsForDate(currentDate);
        loadAdjacentCards(currentDate);
      }),
      () => {
        loadJourneys();
        setJourneyRefreshKey((k) => k + 1);
      },
      () => {
        loadAvatarGifs();
        loadAvatarMoods(currentDate);
      }
    );
    return unsub;
  }, [currentDate, loadCardsForDate, loadUsers, loadAdjacentCards, loadJourneys, loadAvatarGifs, loadAvatarMoods]);

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
    const t = svc.today(timezone);
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
    setJourneyRefreshKey((k) => k + 1);
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
    setJourneyRefreshKey((k) => k + 1);
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
    setJourneyRefreshKey((k) => k + 1);
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
    setJourneys((prev) => prev.filter((j) => j.user_id !== userId));
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

  // ── Journey handlers ──────────────────────────────────────────

  function handleJourneyCreated(journey: Journey) {
    setJourneys((prev) => [...prev, journey]);
    setJourneyRefreshKey((k) => k + 1);
  }

  function handleJourneyDeleted(journeyId: string) {
    setJourneys((prev) => prev.filter((j) => j.id !== journeyId));
    setJourneyRefreshKey((k) => k + 1);
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

  const isToday = currentDate === todayDate;
  const hasPrev = prevDayCards.size > 0;

  function renderPreviewRow(dayCards: Map<string, CardType>, position: "top" | "bottom") {
    const isEmpty = dayCards.size === 0;
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
      {/* Unified settings menu (desktop only) */}
      <div className="ht-toolbar">
        <div className="ht-menu-wrapper">
          <button
            className="ht-toolbar-btn"
            onClick={() => {
              setMenuOpen((v) => !v);
              setAddingUser(false);
              setConfirmDeleteId(null);
              setExpandedUserId(null);
            }}
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
          {menuOpen && (
            <div className="ht-menu-dropdown">
              {/* Add person section */}
              {addingUser ? (
                <div className="ht-menu-add-user">
                  <input
                    ref={newUserInputRef}
                    type="text"
                    className="ht-menu-add-input"
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
                  <div className="ht-menu-add-actions">
                    <button
                      onClick={() => { setAddingUser(false); setNewUserName(""); }}
                    >
                      Cancel
                    </button>
                    <button className="ht-menu-add-confirm" onClick={handleCreateUser}>
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="ht-menu-add-btn"
                  onClick={() => setAddingUser(true)}
                >
                  + Add person
                </button>
              )}

              {/* Per-user sections */}
              {users.length > 0 && <div className="ht-menu-divider" />}

              {users.map((u) => (
                <div key={u.id} className="ht-menu-user-section">
                  <div className="ht-menu-user-header">
                    <button
                      className={`ht-menu-user-toggle ${expandedUserId === u.id ? "ht-expanded" : ""}`}
                      onClick={() =>
                        setExpandedUserId((prev) => (prev === u.id ? null : u.id))
                      }
                    >
                      <span className="ht-menu-toggle-arrow">▶</span>
                      <span className="ht-menu-user-name">{u.name}</span>
                    </button>
                    {confirmDeleteId === u.id ? (
                      <span className="ht-menu-delete-confirm">
                        <button
                          className="ht-menu-confirm-yes"
                          onClick={() => { handleDeleteUser(u.id); setConfirmDeleteId(null); }}
                        >
                          Delete
                        </button>
                        <button
                          className="ht-menu-confirm-no"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        className="ht-menu-delete-btn"
                        onClick={() => setConfirmDeleteId(u.id)}
                        aria-label={`Delete ${u.name}`}
                      >
                        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {expandedUserId === u.id && (
                    <div className="ht-menu-user-settings">
                      <p className="ht-menu-settings-label">Journeys</p>
                      <JourneyManager
                        userId={u.id}
                        journeys={journeys}
                        onCreated={handleJourneyCreated}
                        onDeleted={handleJourneyDeleted}
                      />
                      <p className="ht-menu-settings-label" style={{ marginTop: 8 }}>Avatar GIFs</p>
                      <AvatarManager
                        userId={u.id}
                        avatarGifs={avatarGifs}
                        onChanged={loadAvatarGifs}
                      />
                    </div>
                  )}
                </div>
              ))}

              {users.length === 0 && (
                <p className="ht-menu-empty">No users yet</p>
              )}

              {/* Timezone setting */}
              <div className="ht-menu-divider" />
              <div className="ht-menu-tz">
                <label className="ht-menu-tz-label" htmlFor="ht-tz-select">
                  Timezone
                </label>
                <select
                  id="ht-tz-select"
                  className="ht-menu-tz-select"
                  value={timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                >
                  <option value="Pacific/Honolulu">Hawaii</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="America/Los_Angeles">Pacific</option>
                  <option value="America/Denver">Mountain</option>
                  <option value="America/Chicago">Central</option>
                  <option value="America/New_York">Eastern</option>
                  <option value="America/Sao_Paulo">Brasilia</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Central Europe</option>
                  <option value="Europe/Helsinki">Eastern Europe</option>
                  <option value="Asia/Dubai">Gulf</option>
                  <option value="Asia/Kolkata">India</option>
                  <option value="Asia/Shanghai">China</option>
                  <option value="Asia/Tokyo">Japan</option>
                  <option value="Australia/Sydney">Sydney</option>
                  <option value="Pacific/Auckland">New Zealand</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Side peek buttons for mobile user navigation */}
      {renderUserPeek("left")}
      {renderUserPeek("right")}

      {/* Preview: previous day (fixed position, fades quickly with date change) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`prev-${currentDate}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.1, ease: "easeOut" }}
        >
          {hasPrev && renderPreviewRow(prevDayCards, "top")}
        </motion.div>
      </AnimatePresence>

      {/* Main cards area */}
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
                  <AvatarDisplay
                    userId={user.id}
                    currentDate={currentDate}
                    todayDate={todayDate}
                    avatarGifs={avatarGifs}
                    avatarMoods={avatarMoods}
                    onMoodChanged={() => loadAvatarMoods(currentDate)}
                  />
                  <JourneyProgressBar
                    userId={user.id}
                    currentDate={currentDate}
                    todayDate={todayDate}
                    journeys={journeys}
                    refreshKey={journeyRefreshKey}
                  />
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

      {/* Preview: next day (fixed position, fades quickly with date change) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`next-${currentDate}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.1, ease: "easeOut" }}
        >
          {renderPreviewRow(nextDayCards, "bottom")}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
