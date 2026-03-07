import { Practice, PracticeFlow, SessionRecord, Highlight } from './types';

// ─── Storage Interface ──────────────────────────────────

export interface WritualStorage {
  loadPractices(): Practice[];
  savePractices(practices: Practice[]): void;

  loadFlows(): PracticeFlow[];
  saveFlows(flows: PracticeFlow[]): void;

  loadSessions(): SessionRecord[];
  appendSession(session: SessionRecord): void;
  deleteSession(id: string): void;

  loadHighlights(): Highlight[];
  appendHighlight(highlight: Highlight): void;
  deleteHighlight(id: string): void;
}

// ─── Keys ───────────────────────────────────────────────

const PRACTICES_KEY = 'writual-practices';
const FLOWS_KEY = 'writual-flows';
const SESSIONS_KEY = 'writual-sessions';
const HIGHLIGHTS_KEY = 'writual-highlights';

// ─── localStorage Adapter ───────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[writual] Failed to save ${key}:`, e);
  }
}

export const localStorageAdapter: WritualStorage = {
  loadPractices: () => safeGet<Practice[]>(PRACTICES_KEY, []),
  savePractices: (p) => safeSet(PRACTICES_KEY, p),

  loadFlows: () => safeGet<PracticeFlow[]>(FLOWS_KEY, []),
  saveFlows: (f) => safeSet(FLOWS_KEY, f),

  loadSessions: () => safeGet<SessionRecord[]>(SESSIONS_KEY, []),
  appendSession: (s) => {
    const sessions = safeGet<SessionRecord[]>(SESSIONS_KEY, []);
    sessions.push(s);
    safeSet(SESSIONS_KEY, sessions);
  },
  deleteSession: (id) => {
    const sessions = safeGet<SessionRecord[]>(SESSIONS_KEY, []);
    safeSet(SESSIONS_KEY, sessions.filter((s) => s.id !== id));
  },

  loadHighlights: () => safeGet<Highlight[]>(HIGHLIGHTS_KEY, []),
  appendHighlight: (h) => {
    const highlights = safeGet<Highlight[]>(HIGHLIGHTS_KEY, []);
    highlights.push(h);
    safeSet(HIGHLIGHTS_KEY, highlights);
  },
  deleteHighlight: (id) => {
    const highlights = safeGet<Highlight[]>(HIGHLIGHTS_KEY, []);
    safeSet(HIGHLIGHTS_KEY, highlights.filter((h) => h.id !== id));
  },
};
