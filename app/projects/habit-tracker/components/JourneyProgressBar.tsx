"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Journey, DayStatus, DateString } from "../lib/types";
import * as svc from "../lib/service";

// ─── Mini sparkle for journey dots ──────────────────────────────────

type MiniSpark = {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  delay: number;
  size: number;
};

function makeMiniSparks(seed: number): MiniSpark[] {
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; };

  return Array.from({ length: 6 }, (_, i) => {
    const baseAngle = (i / 6) * 360;
    const angle = baseAngle + rand() * 60 - 30;
    const rad = (angle * Math.PI) / 180;
    const startDist = 3 + rand() * 2;
    const endDist = startDist + 2 + rand() * 4;
    return {
      id: `${seed}-${i}`,
      startX: Math.cos(rad) * startDist,
      startY: Math.sin(rad) * startDist,
      x: Math.cos(rad) * endDist,
      y: Math.sin(rad) * endDist,
      delay: rand() * 0.08,
      size: 1.5 + rand() * 1.5,
    };
  });
}

const STATUS_COLORS: Record<DayStatus, string> = {
  completed: "#4caf50",
  missed: "#d44",
  future: "#999",
};

// Color for today's "future" dot (white)
const TODAY_FUTURE_COLOR = "#ffffff";

// ─── Component ──────────────────────────────────────────────────────

interface JourneyProgressBarProps {
  userId: string;
  /** The date the card is currently showing */
  currentDate: DateString;
  /** What "today" is (timezone-aware) */
  todayDate: DateString;
  journeys: Journey[];
  refreshKey: number;
}

export default function JourneyProgressBar({
  userId,
  currentDate,
  todayDate,
  journeys,
  refreshKey,
}: JourneyProgressBarProps) {
  const [statuses, setStatuses] = useState<Map<DateString, DayStatus>>(new Map());
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [sparks, setSparks] = useState<Map<string, { dots: MiniSpark[]; color: string }>>(new Map());
  const prevStatusesRef = useRef<Map<DateString, DayStatus>>(new Map());
  const sparkSeedRef = useRef(0);
  const sparkTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadProgress = useCallback(async () => {
    const userJourneys = journeys.filter((j) => j.user_id === userId);
    const active = svc.getActiveJourney(userJourneys, currentDate);
    setActiveJourney(active);
    if (!active) {
      setStatuses(new Map());
      return;
    }
    try {
      const progress = await svc.getJourneyProgress(userId, active, todayDate);
      setStatuses(progress);
    } catch (e) {
      console.error("Failed to load journey progress:", e);
    }
  }, [userId, currentDate, todayDate, journeys]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress, refreshKey]);

  // Detect status changes and trigger sparkles
  useEffect(() => {
    if (statuses.size === 0) return;
    const prev = prevStatusesRef.current;
    const newSparks = new Map<string, { dots: MiniSpark[]; color: string }>();

    statuses.forEach((status, date) => {
      const prevStatus = prev.get(date);
      if (prevStatus !== undefined && prevStatus !== status) {
        sparkSeedRef.current += 1;
        // For today's dot turning "future" (unchecked), spark is white
        const isToday = date === todayDate;
        const color = (isToday && status === "future") ? TODAY_FUTURE_COLOR : STATUS_COLORS[status];
        newSparks.set(date, {
          dots: makeMiniSparks(sparkSeedRef.current),
          color,
        });
      }
    });

    if (newSparks.size > 0) {
      setSparks((s) => {
        const merged = new Map(s);
        newSparks.forEach((v, k) => merged.set(k, v));
        return merged;
      });

      newSparks.forEach((_, date) => {
        const existing = sparkTimersRef.current.get(date);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setSparks((s) => {
            const next = new Map(s);
            next.delete(date);
            return next;
          });
          sparkTimersRef.current.delete(date);
        }, 500);
        sparkTimersRef.current.set(date, timer);
      });
    }

    prevStatusesRef.current = new Map(statuses);
  }, [statuses, todayDate]);

  if (!activeJourney || statuses.size === 0) return null;

  // Convert map to ordered array
  const days: { date: DateString; status: DayStatus }[] = [];
  const cursor = new Date(activeJourney.start_date + "T12:00:00");
  const end = new Date(activeJourney.end_date + "T12:00:00");
  while (cursor <= end) {
    const d = svc.toDateString(cursor) as DateString;
    days.push({ date: d, status: statuses.get(d) ?? "future" });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Determine the color for a given dot (for triangle matching)
  function dotColor(date: DateString, status: DayStatus): string {
    if (date === todayDate && status === "future") return TODAY_FUTURE_COLOR;
    return STATUS_COLORS[status];
  }

  return (
    <div className="ht-journey-bar">
      <div className="ht-journey-dots">
        {days.map((d) => {
          const spark = sparks.get(d.date);
          const isToday = d.date === todayDate;
          const isViewing = d.date === currentDate;
          return (
            <span
              key={d.date}
              className={`ht-journey-dot ht-journey-dot-${d.status}${isToday ? " ht-journey-dot-today" : ""}`}
              title={`${d.date}: ${d.status}`}
            >
              {/* Triangle arrow for the date the card is showing */}
              {isViewing && (
                <svg
                  className="ht-journey-arrow"
                  viewBox="0 0 6 4"
                  width="5"
                  height="3"
                  aria-hidden="true"
                >
                  <path d="M0 0l3 4 3-4z" fill={dotColor(d.date, d.status)} />
                </svg>
              )}
              {d.status === "missed" && (
                <svg viewBox="0 0 6 6" width="100%" height="100%" aria-hidden="true">
                  <path d="M1.2 1.2l3.6 3.6M4.8 1.2l-3.6 3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}
              {spark && spark.dots.map((dot) => (
                <span
                  key={dot.id}
                  className="ht-spiral-dot"
                  style={{
                    "--spiral-sx": `${dot.startX}px`,
                    "--spiral-sy": `${dot.startY}px`,
                    "--spiral-x": `${dot.x}px`,
                    "--spiral-y": `${dot.y}px`,
                    "--spiral-delay": `${dot.delay}s`,
                    background: spark.color,
                    width: dot.size,
                    height: dot.size,
                  } as React.CSSProperties}
                />
              ))}
            </span>
          );
        })}
      </div>
    </div>
  );
}
