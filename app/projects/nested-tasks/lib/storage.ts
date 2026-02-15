import { TodoItem } from "./types";

// ─── Storage Interface ────────────────────────────────────────
// Swap this implementation for a real backend later.
// The rest of the app only depends on this interface.

export interface TodoStorage {
  loadTodos(): TodoItem[];
  saveTodos(todos: TodoItem[]): void;
  loadNote(): string;
  saveNote(note: string): void;
}

// ─── localStorage Implementation ──────────────────────────────

const TODOS_KEY = "nested-tasks-todos";
const NOTE_KEY = "nested-tasks-note";

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
};
