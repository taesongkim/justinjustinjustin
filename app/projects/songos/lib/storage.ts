import { TodoItem, Tab, generateId, createTodoItem, AppEvent, Vision, AppName, getLocalTimezone } from "./types";

// ─── Storage Interface ────────────────────────────────────────
// Swap this implementation for a real backend later.
// The rest of the app only depends on this interface.

export interface TodoStorage {
  loadTodos(): TodoItem[];
  saveTodos(todos: TodoItem[]): void;
  loadNote(): string;
  saveNote(note: string): void;
  loadTabs(): Tab[];
  saveTabs(tabs: Tab[]): void;
  loadActiveTabId(): string;
  saveActiveTabId(id: string): void;
}

// ─── localStorage Implementation ──────────────────────────────

const TODOS_KEY = "songos-todos";
const NOTE_KEY = "songos-note";
const TABS_KEY = "songos-tabs";
const ACTIVE_TAB_KEY = "songos-active-tab";

export const localStorageAdapter: TodoStorage = {
  loadTodos(): TodoItem[] {
    try {
      const data = localStorage.getItem(TODOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTodos(todos: TodoItem[]): void {
    try {
      localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error("Failed to save todos:", e);
    }
  },

  loadNote(): string {
    try {
      return localStorage.getItem(NOTE_KEY) || "";
    } catch {
      return "";
    }
  },

  saveNote(note: string): void {
    try {
      localStorage.setItem(NOTE_KEY, note);
    } catch (e) {
      console.error("Failed to save note:", e);
    }
  },

  loadTabs(): Tab[] {
    try {
      const data = localStorage.getItem(TABS_KEY);
      if (data) return JSON.parse(data);

      // Migration: if no tabs exist but legacy todos do, migrate them
      const legacyTodos = localStorage.getItem(TODOS_KEY);
      const legacyNote = localStorage.getItem(NOTE_KEY);
      if (legacyTodos) {
        const todos: TodoItem[] = JSON.parse(legacyTodos);
        if (todos.length > 0) {
          const tab: Tab = {
            id: generateId(),
            name: "Tasks",
            todos,
            note: legacyNote || "",
            expandedIds: [],
          };
          return [tab];
        }
      }

      return [];
    } catch {
      return [];
    }
  },

  saveTabs(tabs: Tab[]): void {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    } catch (e) {
      console.error("Failed to save tabs:", e);
    }
  },

  loadActiveTabId(): string {
    try {
      return localStorage.getItem(ACTIVE_TAB_KEY) || "";
    } catch {
      return "";
    }
  },

  saveActiveTabId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, id);
    } catch (e) {
      console.error("Failed to save active tab ID:", e);
    }
  },
};

// ─── Events Storage ──────────────────────────────────────────

const EVENTS_KEY = "songos-events";

export const eventsStorage = {
  load(): AppEvent[] {
    try {
      const data = localStorage.getItem(EVENTS_KEY);
      if (!data) return [];
      const events: AppEvent[] = JSON.parse(data);
      // Migrate: backfill timezone for events created before timezone support
      const localTz = getLocalTimezone();
      let migrated = false;
      for (const e of events) {
        if (!e.timezone) {
          e.timezone = localTz;
          migrated = true;
        }
      }
      if (migrated) {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
      }
      return events;
    } catch {
      return [];
    }
  },
  save(events: AppEvent[]): void {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch (e) {
      console.error("Failed to save events:", e);
    }
  },
};

// ─── Visions Storage ─────────────────────────────────────────

const VISIONS_KEY = "songos-visions";

export const visionsStorage = {
  load(): Vision[] {
    try {
      const data = localStorage.getItem(VISIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  save(visions: Vision[]): void {
    try {
      localStorage.setItem(VISIONS_KEY, JSON.stringify(visions));
    } catch (e) {
      console.error("Failed to save visions:", e);
    }
  },
};

// ─── Shell Preferences ───────────────────────────────────────

const ACTIVE_APP_KEY = "songos-active-app";
const NAV_EXPANDED_KEY = "songos-nav-expanded";

export const shellStorage = {
  loadActiveApp(): AppName {
    try {
      const val = localStorage.getItem(ACTIVE_APP_KEY);
      if (val === "tasks" || val === "events" || val === "visions") return val;
      return "tasks";
    } catch {
      return "tasks";
    }
  },
  saveActiveApp(app: AppName): void {
    try {
      localStorage.setItem(ACTIVE_APP_KEY, app);
    } catch {}
  },
  loadNavExpanded(): boolean {
    try {
      return localStorage.getItem(NAV_EXPANDED_KEY) === "true";
    } catch {
      return false;
    }
  },
  saveNavExpanded(expanded: boolean): void {
    try {
      localStorage.setItem(NAV_EXPANDED_KEY, String(expanded));
    } catch {}
  },
};
