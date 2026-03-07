'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface HighlightModalProps {
  open: boolean;
  initialText?: string;
  onClose: () => void;
  onSave: (text: string) => void;
}

export default function HighlightModal({ open, initialText, onClose, onSave }: HighlightModalProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Populate with initial text (from selection) or clear when modal opens
  useEffect(() => {
    if (open) {
      setText(initialText || '');
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.selectionStart = el.selectionEnd = el.value.length;
        }
      });
    }
  }, [open, initialText]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setText('');
    onClose();
  }, [text, onSave, onClose]);

  // Handle keyboard shortcuts inside modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [onClose, handleSave]
  );

  if (!open) return null;

  return createPortal(
    <div className="highlight-modal-backdrop" onClick={onClose}>
      <div
        className="highlight-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="highlight-modal-header">
          <span className="highlight-modal-title">Save Highlight</span>
          <button className="w-btn w-btn-sm" onClick={onClose}>
            Esc
          </button>
        </div>
        <textarea
          ref={inputRef}
          className="highlight-modal-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a phrase to save..."
          rows={3}
        />
        <div className="highlight-modal-footer">
          <span style={{ fontSize: 11, color: 'var(--w-text-muted)' }}>
            ⌘↵ to save
          </span>
          <button
            className="w-btn w-btn-primary w-btn-sm"
            onClick={handleSave}
            disabled={!text.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
