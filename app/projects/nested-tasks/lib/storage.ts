import { TodoItem, Tab, generateId, createTodoItem } from "./types";

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

const TODOS_KEY = "nested-tasks-todos";
const NOTE_KEY = "nested-tasks-note";
const TABS_KEY = "nested-tasks-tabs";
const ACTIVE_TAB_KEY = "nested-tasks-active-tab";

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
