"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppName, AppEvent, Vision } from "../lib/types";
import { eventsStorage, visionsStorage, shellStorage } from "../lib/storage";
import LeftNavPanel from "./LeftNavPanel";
import NestedTodoApp from "./NestedTodoApp";
import EventsJournal from "./EventsJournal";
import VisionShelf from "./VisionShelf";

export default function SongOSShell() {
  // ─── Shell State ─────────────────────────────────────────────
  const [activeApp, setActiveApp] = useState<AppName>("tasks");
  const [navExpanded, setNavExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ─── Events & Visions State ──────────────────────────────────
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);

  // ─── Load from Storage on Mount ──────────────────────────────
  useEffect(() => {
    setActiveApp(shellStorage.loadActiveApp());
    setNavExpanded(shellStorage.loadNavExpanded());
    setEvents(eventsStorage.load());
    setVisions(visionsStorage.load());
    setMounted(true);
  }, []);

  // ─── Debounced Save Helpers ──────────────────────────────────
  const eventsSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const visionsSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleEventsChange = useCallback((newEvents: AppEvent[]) => {
    setEvents(newEvents);
    if (eventsSaveTimeout.current) clearTimeout(eventsSaveTimeout.current);
    eventsSaveTimeout.current = setTimeout(() => {
      eventsStorage.save(newEvents);
    }, 300);
  }, []);

  const handleVisionsChange = useCallback((newVisions: Vision[]) => {
    setVisions(newVisions);
    if (visionsSaveTimeout.current) clearTimeout(visionsSaveTimeout.current);
    visionsSaveTimeout.current = setTimeout(() => {
      visionsStorage.save(newVisions);
    }, 300);
  }, []);

  const handleAppChange = useCallback((app: AppName) => {
    setActiveApp(app);
    shellStorage.saveActiveApp(app);
  }, []);

  const handleToggleNav = useCallback(() => {
    setNavExpanded((prev) => {
      const next = !prev;
      shellStorage.saveNavExpanded(next);
      return next;
    });
  }, []);

  // ─── Don't render until hydrated ────────────────────────────
  if (!mounted) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--nt-bg)",
        color: "var(--nt-text-primary)",
      }}
    >
      <LeftNavPanel
        expanded={navExpanded}
        activeApp={activeApp}
        onToggleExpanded={handleToggleNav}
        onAppChange={handleAppChange}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.2s ease",
        }}
      >
        {activeApp === "tasks" && <NestedTodoApp />}
        {activeApp === "events" && (
          <EventsJournal
            events={events}
            visions={visions}
            onEventsChange={handleEventsChange}
          />
        )}
        {activeApp === "visions" && (
          <VisionShelf
            visions={visions}
            onVisionsChange={handleVisionsChange}
          />
        )}
      </main>
    </div>
  );
}
