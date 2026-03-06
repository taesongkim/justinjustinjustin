'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, PromptSettings, DEFAULT_PROMPT_SETTINGS } from '../../lib/types';
import { countWords, formatTime } from '../../lib/utils';
import { useTimer, useCopyToClipboard } from '../../lib/hooks';
import WritualEditor from './PromptEditor.tiptap';

interface PromptSessionProps {
  practice: Practice;
}

export default function PromptSession({ practice }: PromptSessionProps) {
  const { navigate, recordSession } = useWritual();

  // Migrate old settings that lack new fields
  const raw = practice.settings as PromptSettings & Record<string, unknown>;
  const settings: PromptSettings = {
    ...DEFAULT_PROMPT_SETTINGS,
    ...raw,
    completionDetection: raw.completionDetection ?? false,
    targetWordCount: raw.targetWordCount ?? 200,
  };

  const [content, setContent] = useState('');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState(0);
  const hasAutoCompleted = useRef(false);

  const { elapsedMs } = useTimer(started && !complete);
  const { copied, copy } = useCopyToClipboard();

  const wordCount = countWords(content);

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
      if (!started) {
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

  // Word count progress for completion detection
  const showProgress = settings.completionDetection && started && !complete;
  const progressPct = settings.completionDetection
    ? Math.min(100, Math.round((wordCount / settings.targetWordCount) * 100))
    : 0;

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

      {/* Word count progress bar */}
      {showProgress && (
        <div className="prompt-progress">
          <div className="prompt-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Shortcuts hint */}
      {!complete && (
        <div className="md-shortcuts-hint">
          <span># heading</span>
          <span>- list</span>
          <span>1. numbered</span>
          <span>&gt; quote</span>
          <span>---</span>
          <span>⌘B bold</span>
          <span>⌘I italic</span>
        </div>
      )}

      {/* TipTap editor — live inline formatting */}
      <WritualEditor
        onUpdate={handleUpdate}
        disabled={complete}
        placeholder="Start writing..."
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
