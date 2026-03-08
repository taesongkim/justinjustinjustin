'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import BorderGlow from './BorderGlow';

interface HighlightModalProps {
  open: boolean;
  initialText?: string;
  onClose: () => void;
  onSave: (text: string) => void;
}

type SavePhase = 'idle' | 'delight' | 'exit';

const EXIT_DURATION = 200;

export default function HighlightModal({ open, initialText, onClose, onSave }: HighlightModalProps) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<SavePhase>('idle');
  const [chromeFade, setChromeFade] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const savedTextRef = useRef('');

  // Populate with initial text (from selection) or clear when modal opens
  useEffect(() => {
    if (open) {
      setText(initialText || '');
      setPhase('idle');
      setChromeFade(false);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.selectionStart = el.selectionEnd = el.value.length;
        }
      });
    }
  }, [open, initialText]);

  // Exit phase timer
  useEffect(() => {
    if (phase !== 'exit') return;

    const timer = setTimeout(() => {
      onSave(savedTextRef.current);
      setText('');
      setPhase('idle');
      setChromeFade(false);
      onClose();
    }, EXIT_DURATION);

    return () => clearTimeout(timer);
  }, [phase, onSave, onClose]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || phase !== 'idle') return;
    savedTextRef.current = trimmed;
    setPhase('delight');
  }, [text, phase]);

  // BorderGlow travel complete → start chrome fade
  const handleHoldStart = useCallback(() => {
    setChromeFade(true);
  }, []);

  // BorderGlow hold complete → move to exit
  const handleGlowComplete = useCallback(() => {
    setPhase('exit');
  }, []);

  // Handle keyboard shortcuts inside modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase !== 'idle') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [onClose, handleSave, phase]
  );

  if (!open) return null;

  const saving = phase !== 'idle';
  const chromeClass = chromeFade ? 'highlight-chrome-fade' : '';
  const inputClass = [
    'highlight-modal-input',
    phase === 'delight' || phase === 'exit' ? 'highlight-input-delight' : '',
    phase === 'exit' ? 'highlight-input-exit' : '',
    chromeFade && phase !== 'exit' ? 'highlight-input-compensate' : '',
  ].filter(Boolean).join(' ');

  return createPortal(
    <div
      className="highlight-modal-backdrop"
      onClick={saving ? undefined : onClose}
    >
      <div
        className={`highlight-modal ${chromeFade ? 'highlight-modal-saving' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={`highlight-modal-header ${chromeClass}`}>
          <span className="highlight-modal-title">Save Highlight</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>esc to close</span>
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={inputRef}
            className={inputClass}
            value={text}
            onChange={(e) => { if (!saving) setText(e.target.value); }}
            placeholder="Type a phrase to save..."
            rows={3}
            readOnly={saving}
            style={{ width: '100%', display: 'block' }}
          />
          {saving && (
            <BorderGlow
              active={phase === 'delight'}
              radius={6}
              speed={3}
              tailFrac={0.35}
              holdMs={400}
              color="#ffffff"
              onHoldStart={handleHoldStart}
              onComplete={handleGlowComplete}
            />
          )}
          {saving && (
            <span className={`highlight-timestamp ${phase === 'exit' ? 'highlight-timestamp-exit' : ''}`}>
              Saved on {new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
        </div>
        <div className={`highlight-modal-footer ${chromeClass}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>
              ⌘↵ to save
            </span>
            <button
              className="w-btn w-btn-primary w-btn-sm"
              onClick={handleSave}
              disabled={!text.trim() || saving}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
