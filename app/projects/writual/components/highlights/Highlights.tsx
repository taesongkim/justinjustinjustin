'use client';

import { useMemo } from 'react';
import { useWritual } from '../WritualApp';
import { Highlight } from '../../lib/types';
import { useCopyToClipboard } from '../../lib/hooks';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86_400_000;

  if (diff < dayMs && d.getDate() === now.getDate()) {
    return 'Today · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now.getTime() - dayMs);
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) {
    return 'Yesterday · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Highlights() {
  const { highlights, deleteHighlight } = useWritual();
  const { copied, copy } = useCopyToClipboard();

  // Show newest first
  const sorted = useMemo(
    () => [...highlights].sort((a, b) => b.createdAt - a.createdAt),
    [highlights]
  );

  return (
    <div className="w-stack">
      <div className="session-header">
        <h2 className="w-section-title">Highlights</h2>
        <span style={{ fontSize: 12, color: 'var(--w-text-muted)' }}>
          {highlights.length} saved
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="w-empty">
          <p>No highlights yet.</p>
          <p style={{ fontSize: 13, color: 'var(--w-text-muted)', marginTop: 4 }}>
            Press <kbd style={{ fontSize: 11, padding: '2px 5px', borderRadius: 4, border: '1px solid var(--w-border)', background: 'rgba(255,255,255,0.05)' }}>⌘⇧H</kbd> anywhere to save a phrase.
          </p>
        </div>
      ) : (
        <div className="highlights-list">
          {sorted.map((h) => (
            <HighlightRow
              key={h.id}
              highlight={h}
              onCopy={() => copy(h.text)}
              onDelete={() => deleteHighlight(h.id)}
              copied={copied}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightRow({
  highlight,
  onCopy,
  onDelete,
  copied,
}: {
  highlight: Highlight;
  onCopy: () => void;
  onDelete: () => void;
  copied: boolean;
}) {
  return (
    <div className="highlight-row">
      <p className="highlight-text">{highlight.text}</p>
      <div className="highlight-meta">
        <span className="highlight-date">{formatDate(highlight.createdAt)}</span>
        <div className="highlight-actions">
          <button className="w-btn w-btn-sm" onClick={onCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            className="w-btn w-btn-sm"
            style={{ color: 'var(--w-error)' }}
            onClick={() => {
              if (confirm('Delete this highlight?')) onDelete();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
