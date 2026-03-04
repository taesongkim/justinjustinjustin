'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, MantraSettings, isMantraSettings } from '../../lib/types';
import { checkCompletion, formatTime } from '../../lib/utils';
import { useTimer } from '../../lib/hooks';

interface MantraSessionProps {
  practice: Practice;
}

export default function MantraSession({ practice }: MantraSessionProps) {
  const { navigate, recordSession } = useWritual();
  const settings = practice.settings as MantraSettings;

  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [startTimestamp] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { elapsed, reset } = useTimer(started && !complete);

  const ghostText = practice.content;

  // Check completion on input change
  const { isComplete, correctCount } = checkCompletion(
    input,
    ghostText,
    settings.completionMode === 'auto' ? settings.leniencyLevel : 'exact'
  );

  // Auto-detect completion
  useEffect(() => {
    if (settings.completionMode === 'auto' && isComplete && !complete) {
      setComplete(true);
    }
  }, [isComplete, settings.completionMode, complete]);

  const handleInput = useCallback(
    (value: string) => {
      if (complete) return;
      if (!started) setStarted(true);
      setInput(value);
    },
    [started, complete]
  );

  const handleManualComplete = () => {
    setComplete(true);
  };

  const handleDone = () => {
    recordSession({
      practiceId: practice.id,
      startedAt: startTimestamp,
      endedAt: Date.now(),
      durationMs: elapsed * 1000,
    });
    navigate({ name: 'library' });
  };

  const handleReset = () => {
    setInput('');
    setStarted(false);
    setComplete(false);
    reset();
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, []);

  useEffect(adjustHeight, [input, adjustHeight]);

  return (
    <div className="w-stack">
      {/* Header */}
      <div className="session-header">
        <div>
          <h2 className="w-section-title">{practice.title}</h2>
        </div>
        <div className="session-meta">
          {complete && <span className="completion-badge">Complete</span>}
          {settings.timerEnabled && (
            <span className="session-timer">{formatTime(elapsed)}</span>
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

      {/* Typing Area */}
      <div className="mantra-container">
        {settings.typingMode === 'replace' ? (
          <ReplaceMode
            ghostText={ghostText}
            input={input}
            correctCount={correctCount}
            ghostVisible={settings.ghostVisible}
            onInput={handleInput}
            complete={complete}
            textareaRef={textareaRef}
          />
        ) : (
          <OverlayMode
            ghostText={ghostText}
            input={input}
            ghostVisible={settings.ghostVisible}
            onInput={handleInput}
            complete={complete}
            textareaRef={textareaRef}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="w-form-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        {settings.completionMode === 'manual' && !complete && (
          <button className="w-btn" onClick={handleManualComplete}>
            Mark Complete
          </button>
        )}
        {complete && (
          <button className="w-btn w-btn-primary" onClick={handleDone}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Replace Mode ───────────────────────────────────────

function ReplaceMode({
  ghostText,
  input,
  correctCount,
  ghostVisible,
  onInput,
  complete,
  textareaRef,
}: {
  ghostText: string;
  input: string;
  correctCount: number;
  ghostVisible: boolean;
  onInput: (value: string) => void;
  complete: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="mantra-replace">
      {ghostVisible && (
        <div className="mantra-replace-ghost mantra-ghost">
          {/* Typed portion (invisible in ghost) */}
          <span style={{ visibility: 'hidden' }}>
            {ghostText.slice(0, correctCount)}
          </span>
          {/* Remaining ghost */}
          <span>{ghostText.slice(correctCount)}</span>
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="mantra-replace-input"
        value={input}
        onChange={(e) => onInput(e.target.value)}
        disabled={complete}
        autoFocus
        spellCheck={false}
        rows={1}
      />
    </div>
  );
}

// ─── Overlay Mode ───────────────────────────────────────

function OverlayMode({
  ghostText,
  input,
  ghostVisible,
  onInput,
  complete,
  textareaRef,
}: {
  ghostText: string;
  input: string;
  ghostVisible: boolean;
  onInput: (value: string) => void;
  complete: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="mantra-overlay">
      {ghostVisible && (
        <div className="mantra-overlay-ghost mantra-ghost">{ghostText}</div>
      )}
      <textarea
        ref={textareaRef}
        className="mantra-overlay-input"
        value={input}
        onChange={(e) => onInput(e.target.value)}
        disabled={complete}
        autoFocus
        spellCheck={false}
        rows={1}
      />
    </div>
  );
}
