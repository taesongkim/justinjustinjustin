'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Practice,
  PracticeFlow,
  SessionRecord,
  Highlight,
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
import Highlights from './highlights/Highlights';
import HighlightModal from './highlights/HighlightModal';

// ─── Context ────────────────────────────────────────────

interface InfoPanelData {
  title: string;
  prompt: string;
  instructions?: string;
  sessionsCompleted: number;
  lastSessionDate: string | null;
}

interface WritualContextValue {
  practices: Practice[];
  flows: PracticeFlow[];
  sessions: SessionRecord[];
  highlights: Highlight[];
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
  addHighlight: (text: string) => void;
  deleteHighlight: (id: string) => void;

  // Info panel (rendered at writual level, controlled by PromptSession)
  showInfoPanel: boolean;
  setShowInfoPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  infoPanelData: InfoPanelData | null;
  setInfoPanelData: (data: InfoPanelData | null) => void;
  infoPanelRect: { top: number; height: number } | null;
  setInfoPanelRect: (rect: { top: number; height: number } | null) => void;
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
    case 'highlights':
      return '#highlights';
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
    case 'highlights':
      return { name: 'highlights' };
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
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [page, setPage] = useState<Page>({ name: 'library' });
  const [loaded, setLoaded] = useState(false);
  const [highlightModalOpen, setHighlightModalOpen] = useState(false);
  const [highlightInitialText, setHighlightInitialText] = useState('');
  const [slideDirection, setSlideDirection] = useState(0); // 0=none, 1=enter session, -1=exit session
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [infoPanelData, setInfoPanelData] = useState<InfoPanelData | null>(null);
  const [infoPanelRect, setInfoPanelRect] = useState<{ top: number; height: number } | null>(null);
  const priorFocusRef = useRef<{ el: HTMLElement; start: number | null; end: number | null } | null>(null);
  const pageRef = useRef<Page>(page);

  // Load from storage on mount + read initial hash
  useEffect(() => {
    setPractices(storage.loadPractices());
    setFlows(storage.loadFlows());
    setSessions(storage.loadSessions());
    setHighlights(storage.loadHighlights());

    // Restore page from hash if present
    if (typeof window !== 'undefined' && window.location.hash) {
      const initial = hashToPage(window.location.hash);
      setPage(initial);
      pageRef.current = initial;
    }

    setLoaded(true);
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      const next: Page = hash ? hashToPage(hash) : { name: 'library' };
      const current = pageRef.current;
      if (next.name === 'session' && current.name !== 'session') {
        setSlideDirection(1);
      } else if (next.name !== 'session' && current.name === 'session') {
        setSlideDirection(-1);
      } else {
        setSlideDirection(0);
      }
      setPage(next);
      pageRef.current = next;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl+Shift+H → open highlight modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const selected = window.getSelection()?.toString().trim() || '';
        // Capture current focus + cursor position before modal steals focus
        const active = document.activeElement as HTMLElement | null;
        if (active && (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)) {
          priorFocusRef.current = { el: active, start: active.selectionStart, end: active.selectionEnd };
        } else if (active) {
          priorFocusRef.current = { el: active, start: null, end: null };
        }
        setHighlightInitialText(selected);
        setHighlightModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    const current = pageRef.current;
    // Compute slide direction: entering session → 1, leaving session → -1, otherwise 0
    if (p.name === 'session' && current.name !== 'session') {
      setSlideDirection(1);
    } else if (p.name !== 'session' && current.name === 'session') {
      setSlideDirection(-1);
      // Reset info panel when leaving session
      setShowInfoPanel(false);
      setInfoPanelData(null);
      setInfoPanelRect(null);
    } else {
      setSlideDirection(0);
    }
    setPage(p);
    pageRef.current = p;
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

  const addHighlight = useCallback((text: string) => {
    const highlight: Highlight = { id: generateId(), text, createdAt: Date.now() };
    storage.appendHighlight(highlight);
    setHighlights((prev) => [...prev, highlight]);
  }, []);

  const deleteHighlight = useCallback((id: string) => {
    storage.deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── Context value ───────────────────────────────────

  const value = useMemo<WritualContextValue>(
    () => ({
      practices,
      flows,
      sessions,
      highlights,
      page,
      navigate,
      createPractice,
      updatePractice,
      deletePractice,
      recordSession,
      deleteSession,
      addHighlight,
      deleteHighlight,
      showInfoPanel,
      setShowInfoPanel,
      infoPanelData,
      setInfoPanelData,
      infoPanelRect,
      setInfoPanelRect,
    }),
    [practices, flows, sessions, highlights, page, navigate, createPractice, updatePractice, deletePractice, recordSession, deleteSession, addHighlight, deleteHighlight, showInfoPanel, infoPanelData, infoPanelRect]
  );

  // ── Render ──────────────────────────────────────────

  if (!loaded) return null;

  return (
    <WritualContext.Provider value={value}>
      <div className="writual">
        <AnimatePresence mode="sync" initial={false} custom={slideDirection}>
          <motion.div
            key={page.name === 'session' ? 'session' : 'main'}
            className="writual-slide"
            custom={slideDirection}
            initial="enter"
            animate="center"
            exit="exit"
            variants={{
              enter: (dir: number) => ({
                x: dir === 0 ? 0 : `${dir * 100}%`,
              }),
              center: {
                x: 0,
              },
              exit: (dir: number) => ({
                x: dir === 0 ? 0 : `${dir * -100}%`,
              }),
            }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {page.name === 'session' && <StageExit />}
            {page.name === 'session' && practices.find(p => p.id === page.practiceId)?.type === 'prompt' && <StageShortcuts />}
            <div className="writual-shell">
              <SlidePanel page={page} />
            </div>
          </motion.div>
        </AnimatePresence>
        {/* Info panel — plain div with CSS transitions (no framer-motion, preserves backdrop-filter in Chrome) */}
        {infoPanelData && infoPanelRect && (
          <div
            className="session-info-stage"
            data-open={showInfoPanel}
            style={{ top: infoPanelRect.top, height: infoPanelRect.height }}
          >
            <span className="session-info-title">{infoPanelData.title}</span>
            <div className="session-info-section">
              <span className="session-info-label">PROMPT</span>
              <p className="session-info-prompt">{infoPanelData.prompt}</p>
            </div>
            {infoPanelData.instructions && (
              <div className="session-info-section">
                <span className="session-info-label">ADDITIONAL INFO</span>
                <p className="session-info-instructions">{infoPanelData.instructions}</p>
              </div>
            )}
            <div className="session-info-section session-info-stats">
              <span className="session-info-label">STATS</span>
              <div className="session-info-stat-row">
                <span>Sessions Completed:</span>
                <span>{infoPanelData.sessionsCompleted}</span>
              </div>
              <div className="session-info-stat-row">
                <span>Last Session:</span>
                <span>{infoPanelData.lastSessionDate ?? '—'}</span>
              </div>
            </div>
          </div>
        )}
        <HighlightModal
          open={highlightModalOpen}
          initialText={highlightInitialText}
          onClose={() => {
            setHighlightModalOpen(false);
            setHighlightInitialText('');
            // Restore prior focus + cursor position
            const prior = priorFocusRef.current;
            if (prior) {
              requestAnimationFrame(() => {
                prior.el.focus();
                if (prior.start !== null && (prior.el instanceof HTMLTextAreaElement || prior.el instanceof HTMLInputElement)) {
                  prior.el.selectionStart = prior.start;
                  prior.el.selectionEnd = prior.end ?? prior.start;
                }
              });
              priorFocusRef.current = null;
            }
          }}
          onSave={addHighlight}
        />
      </div>
    </WritualContext.Provider>
  );
}

// ─── Navigation ─────────────────────────────────────────

function Nav({ page }: { page: Page }) {
  const { navigate } = useWritual();

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
      <button
        className="writual-nav-link"
        data-active={page.name === 'highlights'}
        onClick={() => navigate({ name: 'highlights' })}
      >
        Highlights
      </button>
    </nav>
  );
}

// ─── Stage-level Exit Button ─────────────────────────────

function StageExit() {
  const { navigate } = useWritual();
  return (
    <button
      className="w-btn w-btn-sm w-btn-ghost session-exit-stage"
      onClick={() => navigate({ name: 'library' })}
    >
      Exit
    </button>
  );
}

// ─── Stage-level Shortcuts Hint ──────────────────────────

function StageShortcuts() {
  const [open, setOpen] = useState(false);
  return (
    <div className="session-shortcuts-stage">
      <button
        className="session-shortcuts-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Formatting shortcuts"
      >
        ?
      </button>
      {open && (
        <div className="session-shortcuts-popover">
          <span># heading</span>
          <span>- list</span>
          <span>1. numbered</span>
          <span>&gt; quote</span>
          <span>---</span>
          <span>⌘B bold</span>
          <span>⌘I italic</span>
        </div>
      )}
    </div>
  );
}

// ─── Slide Panel ─────────────────────────────────────────
// AnimatePresence preserves the exiting component's last render,
// so we don't need to freeze the page — just pass it through.

function SlidePanel({ page }: { page: Page }) {
  return (
    <>
      {page.name !== 'session' && <Nav page={page} />}
      <PageContent page={page} />
    </>
  );
}

// ─── Page Router ────────────────────────────────────────

function PageContent({ page }: { page: Page }) {
  const { practices } = useWritual();

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

    case 'highlights':
      return <Highlights />;

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
