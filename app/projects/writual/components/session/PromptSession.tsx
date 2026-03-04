'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, PromptSettings } from '../../lib/types';
import { countWords, formatTime } from '../../lib/utils';
import { useTimer, useCopyToClipboard } from '../../lib/hooks';

interface PromptSessionProps {
  practice: Practice;
}

export default function PromptSession({ practice }: PromptSessionProps) {
  const { navigate, recordSession } = useWritual();
  const settings = practice.settings as PromptSettings;

  const [content, setContent] = useState('');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [startTimestamp] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { elapsedMs } = useTimer(started && !complete);
  const { copied, copy } = useCopyToClipboard();

  const wordCount = countWords(content);

  const handleInput = useCallback(
    (value: string) => {
      if (complete) return;
      if (!started) setStarted(true);
      setContent(value);
    },
    [started, complete]
  );

  const handleComplete = () => {
    setComplete(true);
    recordSession({
      practiceId: practice.id,
      startedAt: startTimestamp,
      endedAt: Date.now(),
      durationMs: elapsedMs,
      content,
    });
  };

  const handleDone = () => {
    navigate({ name: 'library' });
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [content]);

  return (
    <div className="w-stack">
      {/* Header */}
      <div className="session-header">
        <div>
          <h2 className="w-section-title">{practice.title}</h2>
        </div>
        <div className="session-meta">
          {complete && <span className="completion-badge">Complete</span>}
          {settings.wordCountEnabled && (
            <span style={{ fontSize: 12 }}>{wordCount} words</span>
          )}
          {settings.timerEnabled && (
            <span className="session-timer">{formatTime(elapsedMs)}</span>
          )}
          <button
            className="w-btn w-btn-sm"
            onClick={() => copy(content)}
            disabled={!content}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            className="w-btn w-btn-sm"
            onClick={() => navigate({ name: 'library' })}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Prompt display */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ color: 'var(--w-text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
          {practice.content}
        </p>
        {settings.instructions && (
          <p
            style={{
              color: 'var(--w-text-muted)',
              fontSize: 13,
              lineHeight: 1.5,
              marginTop: 8,
            }}
          >
            {settings.instructions}
          </p>
        )}
      </div>

      <hr className="w-divider" />

      {/* Writing area */}
      <textarea
        ref={textareaRef}
        className="prompt-writing-area"
        value={content}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Start writing..."
        disabled={complete}
        autoFocus
        spellCheck
        rows={12}
      />

      {/* Bottom controls */}
      <div className="w-form-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
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
  );
}
