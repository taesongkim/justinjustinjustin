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
import MantraLinesEditor from './editor/MantraLinesEditor';
import PromptEditor from './editor/PromptEditor';
import MantraSession from './session/MantraSession';
import MantraLinesSession from './session/MantraLinesSession';
import PromptSession from './session/PromptSession';
import SessionHistory from './history/SessionHistory';

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
  deleteSession: (id: string) => void;
}

const WritualContext = createContext<WritualContextValue | null>(null);

export function useWritual() {
  const ctx = useContext(WritualContext);
  if (!ctx) throw new Error('useWritual must be used within WritualApp');
  return ctx;
}

// ─── Storage Instance ───────────────────────────────────

const storage = localStorageAdapter;

// ─── Page ↔ Hash serialization ─────────────────────────

function pageToHash(p: Page): string {
  switch (p.name) {
    case 'library':
      return '#library';
    case 'editor': {
      const parts = ['#editor'];
      if (p.type) parts.push(p.type);
      if (p.practiceId) parts.push(p.practiceId);
      return parts.join('/');
    }
    case 'session':
      return `#session/${p.practiceId}`;
    case 'history':
      return p.sessionId ? `#history/${p.sessionId}` : '#history';
    case 'flow-builder':
      return p.flowId ? `#flow-builder/${p.flowId}` : '#flow-builder';
    default:
      return '#library';
  }
}

function hashToPage(hash: string): Page {
  const raw = hash.replace(/^#/, '');
  const parts = raw.split('/');
  const name = parts[0];

  switch (name) {
    case 'editor':
      return {
        name: 'editor',
        type: (parts[1] as PracticeType) || undefined,
        practiceId: parts[2] || undefined,
      };
    case 'session':
      return parts[1] ? { name: 'session', practiceId: parts[1] } : { name: 'library' };
    case 'history':
      return { name: 'history', sessionId: parts[1] || undefined };
    case 'flow-builder':
      return { name: 'flow-builder', flowId: parts[1] || undefined };
    default:
      return { name: 'library' };
  }
}

// ─── App ────────────────────────────────────────────────

export default function WritualApp() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [flows, setFlows] = useState<PracticeFlow[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [page, setPage] = useState<Page>({ name: 'library' });
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount + read initial hash
  useEffect(() => {
    setPractices(storage.loadPractices());
    setFlows(storage.loadFlows());
    setSessions(storage.loadSessions());

    // Restore page from hash if present
    if (typeof window !== 'undefined' && window.location.hash) {
      setPage(hashToPage(window.location.hash));
    }

    setLoaded(true);
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      setPage(hash ? hashToPage(hash) : { name: 'library' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Persist practices when they change
  useEffect(() => {
    if (loaded) storage.savePractices(practices);
  }, [practices, loaded]);

  useEffect(() => {
    if (loaded) storage.saveFlows(flows);
  }, [flows, loaded]);

  // ── Actions ─────────────────────────────────────────

  const navigate = useCallback((p: Page) => {
    setPage(p);
    const hash = pageToHash(p);
    window.history.pushState(null, '', hash);
  }, []);

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
      // Snapshot practice title/type so history survives practice deletion
      const practice = practices.find((p) => p.id === session.practiceId);
      const record: SessionRecord = {
        ...session,
        id: generateId(),
        practiceTitle: session.practiceTitle ?? practice?.title,
        practiceType: session.practiceType ?? practice?.type,
      };
      storage.appendSession(record);
      setSessions((prev) => [...prev, record]);
    },
    [practices]
  );

  const deleteSession = useCallback((id: string) => {
    storage.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

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
      deleteSession,
    }),
    [practices, flows, sessions, page, navigate, createPractice, updatePractice, deletePractice, recordSession, deleteSession]
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
      <button
        className="writual-nav-link"
        data-active={page.name === 'history'}
        onClick={() => navigate({ name: 'history' })}
      >
        History
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

      if (type === 'prompt') return <PromptEditor practice={existing} />;
      if (type === 'mantra-lines') return <MantraLinesEditor practice={existing} />;
      return <MantraEditor practice={existing} />;
    }

    case 'history':
      return <SessionHistory />;

    case 'session': {
      const practice = practices.find((p) => p.id === page.practiceId);
      if (!practice) return <div className="w-empty">Practice not found.</div>;

      if (practice.type === 'prompt') return <PromptSession practice={practice} />;
      if (practice.type === 'mantra-lines') return <MantraLinesSession practice={practice} />;
      return <MantraSession practice={practice} />;
    }

    default:
      return <PracticeLibrary />;
  }
}
