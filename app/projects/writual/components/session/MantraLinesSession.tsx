'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWritual } from '../WritualApp';
import {
  Practice,
  MantraLinesSettings,
  DEFAULT_MANTRA_LINES_SETTINGS,
} from '../../lib/types';
import { checkCompletion, formatTime } from '../../lib/utils';
import { useTimer } from '../../lib/hooks';

interface MantraLinesSessionProps {
  practice: Practice;
}

interface LineState {
  input: string;
  started: boolean;
  complete: boolean;
  startTime: number | null;
  elapsedMs: number;
}

function createEmptyLine(): LineState {
  return { input: '', started: false, complete: false, startTime: null, elapsedMs: 0 };
}

export default function MantraLinesSession({ practice }: MantraLinesSessionProps) {
  const { navigate, recordSession } = useWritual();
  const raw = practice.settings as MantraLinesSettings & Record<string, unknown>;
  const settings: MantraLinesSettings = {
    ...DEFAULT_MANTRA_LINES_SETTINGS,
    ...raw,
    leniency: raw.leniency ?? { ignoreCaps: false, ignorePunctuation: false },
  };

  const ghostText = practice.content;
  const lineCount = settings.lineCount;

  const [lines, setLines] = useState<LineState[]>(() =>
    Array.from({ length: lineCount }, createEmptyLine)
  );
  const [currentLine, setCurrentLine] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [startTimestamp] = useState(Date.now());

  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const lineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer
  const { elapsedMs: sessionElapsedMs } = useTimer(sessionStarted && !sessionComplete);

  // Per-line timer tick
  useEffect(() => {
    if (!settings.lineTimerEnabled) return;
    lineTimerRef.current = setInterval(() => {
      setLines((prev) =>
        prev.map((line, i) => {
          if (i === currentLine && line.started && !line.complete && line.startTime) {
            return { ...line, elapsedMs: Date.now() - line.startTime };
          }
          return line;
        })
      );
    }, 47);
    return () => {
      if (lineTimerRef.current) clearInterval(lineTimerRef.current);
    };
  }, [currentLine, settings.lineTimerEnabled]);

  // Focus current line (delay initial focus so slide-in animation isn't interrupted)
  const hasFocusedRef = useRef(false);
  useEffect(() => {
    if (sessionComplete) return;
    if (!hasFocusedRef.current) {
      // First focus — delay past slide animation
      const id = setTimeout(() => {
        inputRefs.current[currentLine]?.focus();
        hasFocusedRef.current = true;
      }, 350);
      return () => clearTimeout(id);
    }
    inputRefs.current[currentLine]?.focus();
  }, [currentLine, sessionComplete]);

  const completedCount = lines.filter((l) => l.complete).length;

  const handleLineInput = useCallback(
    (index: number, value: string) => {
      if (index !== currentLine || sessionComplete) return;

      // Intercept Enter key — advance to next line
      if (value.endsWith('\n')) {
        const trimmed = value.slice(0, -1);
        // Update the line with trimmed value first
        setLines((prev) =>
          prev.map((l, i) =>
            i === index ? { ...l, input: trimmed, complete: true } : l
          )
        );
        // Advance
        if (index < lineCount - 1) {
          setCurrentLine(index + 1);
        } else {
          setSessionComplete(true);
        }
        return;
      }

      if (!sessionStarted) setSessionStarted(true);

      setLines((prev) =>
        prev.map((l, i) => {
          if (i !== index) return l;
          const updated = { ...l, input: value };
          if (!l.started) {
            updated.started = true;
            updated.startTime = Date.now();
          }
          return updated;
        })
      );

      // Auto-complete via completion detection
      if (settings.completionDetection) {
        const { isComplete } = checkCompletion(value, ghostText, settings.leniency);
        if (isComplete) {
          setLines((prev) =>
            prev.map((l, i) =>
              i === index ? { ...l, input: value, complete: true, started: true, startTime: l.startTime ?? Date.now() } : l
            )
          );
          // Only advance automatically if autoAdvance is on
          if (settings.autoAdvance) {
            if (index < lineCount - 1) {
              setCurrentLine(index + 1);
            } else {
              setSessionComplete(true);
            }
          }
        }
      }
    },
    [currentLine, sessionComplete, sessionStarted, lineCount, ghostText, settings.completionDetection, settings.leniency, settings.autoAdvance]
  );

  const handleDone = () => {
    recordSession({
      practiceId: practice.id,
      startedAt: startTimestamp,
      endedAt: Date.now(),
      durationMs: sessionElapsedMs,
    });
    navigate({ name: 'library' });
  };

  const handleReset = () => {
    setLines(Array.from({ length: lineCount }, createEmptyLine));
    setCurrentLine(0);
    setSessionStarted(false);
    setSessionComplete(false);
  };

  return (
    <div className="w-stack">
      {/* Header */}
      <div className="session-header">
        <div>
          <h2 className="w-section-title">{practice.title}</h2>
          <span style={{ fontSize: 12, color: 'var(--w-text-muted)' }}>
            {completedCount} / {lineCount} lines
          </span>
        </div>
        <div className="session-meta">
          {sessionComplete && <span className="completion-badge">Complete</span>}
          {settings.sessionTimerEnabled && (
            <span className="session-timer">{formatTime(sessionElapsedMs)}</span>
          )}
          <button className="w-btn w-btn-sm" onClick={handleReset}>
            Reset
          </button>
          <button
            className="w-btn w-btn-sm"
            onClick={() => navigate({ name: 'library' })}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Lines */}
      <div className="mantra-lines-list">
        {lines.map((line, i) => (
          <MantraLine
            key={i}
            index={i}
            line={line}
            ghostText={ghostText}
            settings={settings}
            isCurrent={i === currentLine}
            onInput={handleLineInput}
            inputRef={(el) => { inputRefs.current[i] = el; }}
          />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="w-form-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        {sessionComplete && (
          <button className="w-btn w-btn-primary" onClick={handleDone}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Single Line ────────────────────────────────────────

function MantraLine({
  index,
  line,
  ghostText,
  settings,
  isCurrent,
  onInput,
  inputRef,
}: {
  index: number;
  line: LineState;
  ghostText: string;
  settings: MantraLinesSettings;
  isCurrent: boolean;
  onInput: (index: number, value: string) => void;
  inputRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const leniency = settings.completionDetection
    ? settings.leniency
    : { ignoreCaps: false, ignorePunctuation: false };
  const { correctCount } = checkCompletion(line.input, ghostText, leniency);

  return (
    <div
      className="mantra-line"
      data-active={isCurrent}
      data-complete={line.complete}
    >
      <div className="mantra-line-number">
        {index + 1}
      </div>
      <div className="mantra-line-content">
        <div className="mantra-container">
          <div className="mantra-overlay">
            {settings.ghostVisible && !line.complete && (
              <div className="mantra-overlay-ghost mantra-ghost">{ghostText}</div>
            )}
            {settings.completionDetection && line.input.length > 0 && (
              <div className="mantra-char-overlay" aria-hidden="true">
                <span className="mantra-chars-correct">
                  {line.input.slice(0, correctCount)}
                </span>
                {correctCount < line.input.length && (
                  <span className="mantra-chars-error">
                    {line.input.slice(correctCount)}
                  </span>
                )}
              </div>
            )}
            <textarea
              ref={inputRef}
              className={`mantra-overlay-input${settings.completionDetection ? ' mantra-input-transparent' : ''}`}
              value={line.input}
              onChange={(e) => onInput(index, e.target.value)}
              disabled={(!isCurrent) || (line.complete && settings.autoAdvance)}
              spellCheck={false}
              rows={1}
            />
          </div>
        </div>
      </div>
      <div className="mantra-line-meta">
        {line.complete && <span className="completion-badge">done</span>}
        {settings.lineTimerEnabled && line.started && (
          <span style={{ fontSize: 11, color: 'var(--w-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {formatTime(line.elapsedMs)}
          </span>
        )}
      </div>
    </div>
  );
}
