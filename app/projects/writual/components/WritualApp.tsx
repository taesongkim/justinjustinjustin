'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Practice,
  PracticeFlow,
  SessionRecord,
  PracticeType,
  PracticeSettings,
  Page,
  DEFAULT_MANTRA_SETTINGS,
  DEFAULT_PROMPT_SETTINGS,
} from '../lib/types';
import { localStorageAdapter } from '../lib/storage';
import { generateId } from '../lib/utils';
import PracticeLibrary from './library/PracticeLibrary';
import MantraEditor from './editor/MantraEditor';
import PromptEditor from './editor/PromptEditor';
import MantraSession from './session/MantraSession';
import PromptSession from './session/PromptSession';

// ─── Context ────────────────────────────────────────────

interface WritualContextValue {
  practices: Practice[];
  flows: PracticeFlow[];
  sessions: SessionRecord[];
  page: Page;

  navigate: (page: Page) => void;
  createPractice: (
    type: PracticeType,
    title: string,
    content: string,
    settings: PracticeSettings
  ) => Practice;
  updatePractice: (id: string, updates: Partial<Practice>) => void;
  deletePractice: (id: string) => void;
  recordSession: (session: Omit<SessionRecord, 'id'>) => void;
}

const WritualContext = createContext<WritualContextValue | null>(null);

export function useWritual() {
  const ctx = useContext(WritualContext);
  if (!ctx) throw new Error('useWritual must be used within WritualApp');
  return ctx;
}

// ─── Storage Instance ───────────────────────────────────

const storage = localStorageAdapter;

// ─── App ────────────────────────────────────────────────

export default function WritualApp() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [flows, setFlows] = useState<PracticeFlow[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [page, setPage] = useState<Page>({ name: 'library' });
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    setPractices(storage.loadPractices());
    setFlows(storage.loadFlows());
    setSessions(storage.loadSessions());
    setLoaded(true);
  }, []);

  // Persist practices when they change
  useEffect(() => {
    if (loaded) storage.savePractices(practices);
  }, [practices, loaded]);

  useEffect(() => {
    if (loaded) storage.saveFlows(flows);
  }, [flows, loaded]);

  // ── Actions ─────────────────────────────────────────

  const navigate = useCallback((p: Page) => setPage(p), []);

  const createPractice = useCallback(
    (type: PracticeType, title: string, content: string, settings: PracticeSettings) => {
      const now = Date.now();
      const practice: Practice = {
        id: generateId(),
        type,
        title,
        content,
        settings,
        createdAt: now,
        updatedAt: now,
      };
      setPractices((prev) => [...prev, practice]);
      return practice;
    },
    []
  );

  const updatePractice = useCallback(
    (id: string, updates: Partial<Practice>) => {
      setPractices((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
        )
      );
    },
    []
  );

  const deletePractice = useCallback((id: string) => {
    setPractices((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const recordSession = useCallback(
    (session: Omit<SessionRecord, 'id'>) => {
      const record: SessionRecord = { ...session, id: generateId() };
      storage.appendSession(record);
      setSessions((prev) => [...prev, record]);
    },
    []
  );

  // ── Context value ───────────────────────────────────

  const value = useMemo<WritualContextValue>(
    () => ({
      practices,
      flows,
      sessions,
      page,
      navigate,
      createPractice,
      updatePractice,
      deletePractice,
      recordSession,
    }),
    [practices, flows, sessions, page, navigate, createPractice, updatePractice, deletePractice, recordSession]
  );

  // ── Render ──────────────────────────────────────────

  if (!loaded) return null;

  return (
    <WritualContext.Provider value={value}>
      <div className="writual">
        <div className="writual-shell">
          <Nav />
          <PageContent />
        </div>
      </div>
    </WritualContext.Provider>
  );
}

// ─── Navigation ─────────────────────────────────────────

function Nav() {
  const { page, navigate } = useWritual();

  return (
    <nav className="writual-nav">
      <span className="writual-nav-title">Writual</span>
      <button
        className="writual-nav-link"
        data-active={page.name === 'library'}
        onClick={() => navigate({ name: 'library' })}
      >
        Library
      </button>
    </nav>
  );
}

// ─── Page Router ────────────────────────────────────────

function PageContent() {
  const { page, practices } = useWritual();

  switch (page.name) {
    case 'library':
      return <PracticeLibrary />;

    case 'editor': {
      const type = page.type ?? 'mantra';
      const existing = page.practiceId
        ? practices.find((p) => p.id === page.practiceId)
        : undefined;

      if (type === 'prompt') {
        return <PromptEditor practice={existing} />;
      }
      return <MantraEditor practice={existing} />;
    }

    case 'session': {
      const practice = practices.find((p) => p.id === page.practiceId);
      if (!practice) return <div className="w-empty">Practice not found.</div>;

      if (practice.type === 'prompt') {
        return <PromptSession practice={practice} />;
      }
      return <MantraSession practice={practice} />;
    }

    default:
      return <PracticeLibrary />;
  }
}
