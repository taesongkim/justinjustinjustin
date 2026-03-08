'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, PromptSettings, DEFAULT_PROMPT_SETTINGS } from '../../lib/types';
import { countWords, formatTime } from '../../lib/utils';
import { useTimer, useCopyToClipboard } from '../../lib/hooks';
import WritualEditor from './PromptEditor.tiptap';

interface PromptSessionProps {
  practice: Practice;
}

export default function PromptSession({ practice }: PromptSessionProps) {
  const { navigate, recordSession, sessions, showInfoPanel, setShowInfoPanel, setInfoPanelData, setInfoPanelRect } = useWritual();

  // Migrate old settings that lack new fields
  const raw = practice.settings as PromptSettings & Record<string, unknown>;
  const settings: PromptSettings = {
    ...DEFAULT_PROMPT_SETTINGS,
    ...raw,
    completionDetection: raw.completionDetection ?? false,
    targetWordCount: raw.targetWordCount ?? 200,
    infoPanelVisible: raw.infoPanelVisible ?? false,
  };

  const [content, setContent] = useState('');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [paused, setPaused] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [sessionOpenedAt] = useState(() => new Date());
  type PrivacyLevel = 'off' | 'peek' | 'full';
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('off');
  const [fadePrivacyInstant, setFadePrivacyInstant] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const [privacyToast, setPrivacyToast] = useState<string | null>(null);
  const privacyToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const privacyToastKey = useRef(0);

  const privacyLabels: Record<PrivacyLevel, string> = {
    off: 'privacy off',
    peek: 'peek privacy on',
    full: 'full privacy on',
  };

  const showPrivacyToast = useCallback((level: PrivacyLevel) => {
    if (privacyToastTimer.current) clearTimeout(privacyToastTimer.current);
    privacyToastKey.current += 1;
    setPrivacyToast(privacyLabels[level]);
    privacyToastTimer.current = setTimeout(() => {
      setPrivacyToast(null);
      privacyToastTimer.current = null;
    }, 600);
  }, []);
  const hasAutoCompleted = useRef(false);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  const { elapsedMs } = useTimer(started && !complete && !paused);
  const { copied, copy } = useCopyToClipboard();

  const wordCount = countWords(content);
  const practiceSessions = useMemo(() => sessions.filter(s => s.practiceId === practice.id), [sessions, practice.id]);

  const doComplete = useCallback((text: string, elapsed: number, stamp: number) => {
    recordSession({
      practiceId: practice.id,
      startedAt: stamp,
      endedAt: Date.now(),
      durationMs: elapsed,
      content: text,
    });
  }, [practice.id, recordSession]);

  const handleUpdate = useCallback(
    (markdown: string) => {
      if (complete) return;
      if (!started && markdown.trim().length > 0) {
        setStarted(true);
        setStartTimestamp(Date.now());
      }
      setContent(markdown);
    },
    [started, complete]
  );

  // Auto-complete when word count target is reached
  useEffect(() => {
    if (
      settings.completionDetection &&
      started &&
      !complete &&
      !hasAutoCompleted.current &&
      wordCount >= settings.targetWordCount
    ) {
      hasAutoCompleted.current = true;
      setComplete(true);
      doComplete(content, elapsedMs, startTimestamp);
    }
  }, [wordCount, settings.completionDetection, settings.targetWordCount, started, complete, content, elapsedMs, startTimestamp, doComplete]);

  const handleComplete = () => {
    if (complete) return;
    setComplete(true);
    doComplete(content, elapsedMs, startTimestamp);
  };

  const handleDone = () => {
    navigate({ name: 'library' });
  };

  // Set initial info panel visibility from settings (delay until page slide completes)
  useEffect(() => {
    if (settings.infoPanelVisible) {
      const t = setTimeout(() => setShowInfoPanel(true), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set info panel data on mount, clear on unmount
  useEffect(() => {
    setInfoPanelData({
      title: practice.title,
      prompt: practice.content,
      instructions: settings.instructions,
      sessionsCompleted: practiceSessions.length,
      lastSessionDate: practiceSessions.length > 0
        ? new Date(practiceSessions[practiceSessions.length - 1].startedAt).toLocaleDateString()
        : null,
    });
    return () => {
      setShowInfoPanel(false);
      setInfoPanelData(null);
      setInfoPanelRect(null);
    };
  }, [practice.title, practice.content, settings.instructions, practiceSessions, setInfoPanelData, setShowInfoPanel, setInfoPanelRect]);

  // Track editor area position for the info panel
  useEffect(() => {
    const el = editorAreaRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setInfoPanelRect({ top: rect.top, height: rect.height, left: rect.left });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setInfoPanelRect]);

  // Cmd+Shift+P cycles privacy: off → peek → full → off
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setPrivacyLevel(prev => {
          if (prev === 'off') { showPrivacyToast('peek'); return 'peek'; }
          if (prev === 'peek') {
            setSkipTransition(true);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setSkipTransition(false));
            });
            showPrivacyToast('full');
            return 'full';
          }
          showPrivacyToast('off');
          return 'off';
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Word count progress for completion detection
  const showProgress = settings.completionDetection && !complete;
  const progressPct = settings.completionDetection
    ? Math.min(100, (wordCount / settings.targetWordCount) * 100)
    : 0;

  return (
    <div className="prompt-session-layout">
      {/* Header */}
      <div className="session-header">
        <div className="session-header-left">
          <h2 className="w-section-title">{practice.title}</h2>
          <button
            className="session-info-toggle"
            onClick={() => setShowInfoPanel((o: boolean) => !o)}
            aria-label="Toggle prompt info"
          >
            i
          </button>
        </div>
        <div className="session-header-center">
          <div className="privacy-slider" data-level={privacyLevel} title="Privacy (⌘⇧P)">
            {privacyToast && (
              <span key={privacyToastKey.current} className="privacy-toast">{privacyToast}</span>
            )}
            <div className="privacy-slider-thumb" />
            <button
              className="privacy-slider-opt"
              data-active={privacyLevel === 'off'}
              onClick={() => { setPrivacyLevel('off'); showPrivacyToast('off'); }}
              aria-label="Visible"
            >
              {/* Eye open — circle iris */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              className="privacy-slider-opt"
              data-active={privacyLevel === 'peek'}
              onClick={() => {
                if (privacyLevel === 'full') {
                  // full → peek: start chars already blurred
                  setFadePrivacyInstant(true);
                  setSkipTransition(true);
                  setPrivacyLevel('peek');
                  setTimeout(() => {
                    setFadePrivacyInstant(false);
                    requestAnimationFrame(() => setSkipTransition(false));
                  }, 80);
                } else {
                  setPrivacyLevel('peek');
                }
                showPrivacyToast('peek');
              }}
              aria-label="Peek privacy"
            >
              {/* Eye open — sparkle iris */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <line x1="12" y1="9" x2="12" y2="15" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="10" y1="10" x2="14" y2="14" />
                <line x1="14" y1="10" x2="10" y2="14" />
              </svg>
            </button>
            <button
              className="privacy-slider-opt"
              data-active={privacyLevel === 'full'}
              onClick={() => {
                if (privacyLevel === 'peek') {
                  // peek → full: instant transition
                  setSkipTransition(true);
                  setPrivacyLevel('full');
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => setSkipTransition(false));
                  });
                } else {
                  setPrivacyLevel('full');
                }
                showPrivacyToast('full');
              }}
              aria-label="Full privacy"
            >
              {/* Eye closed */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
        </div>
        <div className="session-header-right">
          {complete && <span className="completion-badge">Complete</span>}
          <span className="session-timestamp">
            {sessionOpenedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* TipTap editor — live inline formatting */}
      <div className="prompt-editor-area" ref={editorAreaRef} data-blurred={privacyLevel === 'full'} data-no-transition={skipTransition || undefined} style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
        <WritualEditor
          onUpdate={handleUpdate}
          disabled={complete}
          placeholder="Start writing..."
          fadePrivacy={privacyLevel === 'peek'}
          fadePrivacyInstant={fadePrivacyInstant}
        />
        <div className={`privacy-texture-overlay${privacyLevel !== 'off' ? ' privacy-texture-visible' : ''}`} />
      </div>

      {/* Word count progress bar */}
      {showProgress && (
        <div className="prompt-progress">
          <div className="prompt-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Bottom controls */}
      <div className="session-bottom-controls">
        <div className="session-bottom-left">
          {settings.wordCountEnabled && (
            <span style={{ fontSize: 12 }}>
              {wordCount}{settings.completionDetection ? ` / ${settings.targetWordCount}` : ''} words
            </span>
          )}
          {!settings.wordCountEnabled && settings.completionDetection && (
            <span style={{ fontSize: 12 }}>
              {wordCount} / {settings.targetWordCount} words
            </span>
          )}
          {settings.timerEnabled && (
            <>
              <button
                className="w-btn w-btn-sm w-btn-ghost"
                onClick={() => setPaused((p) => !p)}
                disabled={!started || complete}
                style={{ minWidth: 52 }}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <span className="session-timer" style={paused ? { opacity: 0.4 } : undefined}>
                {formatTime(elapsedMs)}
              </span>
            </>
          )}
        </div>
        <div className="session-bottom-right">
          <button
            className="w-btn w-btn-sm"
            onClick={() => copy(content)}
            disabled={!content}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {!complete ? (
            <button
              className="w-btn w-btn-primary"
              onClick={handleComplete}
              disabled={!content.trim()}
            >
              Complete
            </button>
          ) : (
            <button className="w-btn w-btn-primary" onClick={handleDone}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
