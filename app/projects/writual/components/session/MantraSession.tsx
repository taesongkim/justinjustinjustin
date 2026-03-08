'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, MantraSettings } from '../../lib/types';
import { checkCompletion, formatTime } from '../../lib/utils';
import { useTimer } from '../../lib/hooks';

interface MantraSessionProps {
  practice: Practice;
}

export default function MantraSession({ practice }: MantraSessionProps) {
  const { navigate, recordSession } = useWritual();
  const raw = practice.settings as MantraSettings & Record<string, unknown>;
  const settings: MantraSettings = {
    ...raw,
    completionDetection: raw.completionDetection ?? true,
    leniency: { ...(raw.leniency ?? { ignoreCaps: false }), ignorePunctuation: false },
  };

  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [startTimestamp] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { elapsedMs, reset } = useTimer(started && !complete);

  const ghostText = practice.content;

  // Check completion on input change
  const { isComplete, correctCount } = checkCompletion(
    input,
    ghostText,
    settings.completionDetection ? settings.leniency : { ignoreCaps: false, ignorePunctuation: false }
  );

  // Auto-detect completion
  useEffect(() => {
    if (settings.completionDetection && isComplete && !complete) {
      setComplete(true);
    }
  }, [isComplete, settings.completionDetection, complete]);

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
      durationMs: elapsedMs,
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

  // Delay initial focus so the slide-in animation isn't interrupted
  useEffect(() => {
    const id = setTimeout(() => textareaRef.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);

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
            <span className="session-timer">{formatTime(elapsedMs)}</span>
          )}
          <button className="w-btn w-btn-sm" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Typing Area */}
      <div className="mantra-container w-material-1">
        {practice.favorite?.enabled && (
          <div className="w-session-fav-bar" style={{ background: practice.favorite.color, color: practice.favorite.color }} />
        )}
        <div className="mantra-overlay">
          <div className="mantra-overlay-ghost mantra-ghost" style={settings.ghostVisible ? undefined : { visibility: 'hidden' }}>{ghostText}</div>
          {/* Styled character overlay — only when completion detection is on */}
          {settings.completionDetection && input.length > 0 && (
            <div className="mantra-char-overlay" aria-hidden="true">
              <span className="mantra-chars-correct">
                {input.slice(0, correctCount)}
              </span>
              {correctCount < input.length && (
                <span className="mantra-chars-error">
                  {input.slice(correctCount)}
                </span>
              )}
            </div>
          )}
          <textarea
            ref={textareaRef}
            className={`mantra-overlay-input${settings.completionDetection ? ' mantra-input-transparent' : ''}`}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            disabled={complete}
            spellCheck={false}
            rows={1}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="w-form-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        {!settings.completionDetection && !complete && (
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

