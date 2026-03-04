'use client';

import { useMemo } from 'react';
import { useWritual } from '../WritualApp';
import { SessionRecord, Practice, PracticeType } from '../../lib/types';
import { formatTime } from '../../lib/utils';
import { useCopyToClipboard } from '../../lib/hooks';

// ─── Helpers for resolving title/type ──────────────────
// Use snapshot fields first, fall back to live practice lookup

function resolveTitle(session: SessionRecord, practice?: Practice): string {
  return session.practiceTitle ?? practice?.title ?? 'Untitled Practice';
}

function resolveType(session: SessionRecord, practice?: Practice): PracticeType | 'unknown' {
  return session.practiceType ?? practice?.type ?? 'unknown';
}

function typeLabel(type: PracticeType | 'unknown'): string {
  if (type === 'mantra') return 'Mantra';
  if (type === 'mantra-lines') return 'Mantra Lines';
  if (type === 'prompt') return 'Prompt';
  return '—';
}

// ─── History List ──────────────────────────────────────

export default function SessionHistory() {
  const { sessions, practices, page, navigate, deleteSession } = useWritual();

  const selectedId = page.name === 'history' ? page.sessionId : undefined;

  const practiceMap = useMemo(() => {
    const map = new Map<string, Practice>();
    for (const p of practices) map.set(p.id, p);
    return map;
  }, [practices]);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt - a.startedAt),
    [sessions]
  );

  const grouped = useMemo(() => {
    const groups: { label: string; sessions: SessionRecord[] }[] = [];
    let currentLabel = '';

    for (const s of sorted) {
      const label = formatDateLabel(s.startedAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, sessions: [] });
      }
      groups[groups.length - 1].sessions.push(s);
    }

    return groups;
  }, [sorted]);

  // Detail view
  if (selectedId) {
    const session = sessions.find((s) => s.id === selectedId);
    if (!session) {
      return (
        <div className="w-stack">
          <div className="w-empty">Session not found.</div>
          <button className="w-btn" onClick={() => navigate({ name: 'history' })}>
            Back to History
          </button>
        </div>
      );
    }
    return (
      <SessionDetail
        session={session}
        practice={practiceMap.get(session.practiceId)}
        onBack={() => navigate({ name: 'history' })}
        onDelete={() => {
          if (confirm('Delete this session?')) {
            deleteSession(session.id);
            navigate({ name: 'history' });
          }
        }}
      />
    );
  }

  // List view
  return (
    <div className="w-stack">
      <div className="w-section-header">
        <h2 className="w-section-title">Session History</h2>
        <span style={{ fontSize: 12, color: 'var(--w-text-muted)' }}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="w-empty">
          No sessions yet. Complete a practice to see your history here.
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="w-stack" style={{ gap: 4 }}>
            <div className="history-date-label">{group.label}</div>
            {group.sessions.map((s) => (
              <HistoryRow
                key={s.id}
                session={s}
                practice={practiceMap.get(s.practiceId)}
                onClick={() => navigate({ name: 'history', sessionId: s.id })}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ─── History Row ───────────────────────────────────────

function HistoryRow({
  session,
  practice,
  onClick,
}: {
  session: SessionRecord;
  practice?: Practice;
  onClick: () => void;
}) {
  const title = resolveTitle(session, practice);
  const type = resolveType(session, practice);
  const time = formatTimeOfDay(session.startedAt);
  const duration = formatTime(session.durationMs);
  const hasContent = !!session.content;

  return (
    <button className="history-row" onClick={onClick}>
      <div className="history-row-left">
        <span className="history-row-type">{typeLabel(type)}</span>
        <span className="history-row-title">{title}</span>
      </div>
      <div className="history-row-right">
        {hasContent && <span className="history-row-badge">✎</span>}
        <span className="history-row-duration">{duration}</span>
        <span className="history-row-time">{time}</span>
      </div>
    </button>
  );
}

// ─── Session Detail ────────────────────────────────────

function SessionDetail({
  session,
  practice,
  onBack,
  onDelete,
}: {
  session: SessionRecord;
  practice?: Practice;
  onBack: () => void;
  onDelete: () => void;
}) {
  const { copied, copy } = useCopyToClipboard();
  const title = resolveTitle(session, practice);
  const type = resolveType(session, practice);

  const dateStr = new Date(session.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = formatTimeOfDay(session.startedAt);
  const duration = formatTime(session.durationMs);

  return (
    <div className="w-stack">
      {/* Header */}
      <div className="session-header">
        <div>
          <h2 className="w-section-title">{title}</h2>
        </div>
        <div className="session-meta">
          <button
            className="w-btn w-btn-sm w-btn-ghost"
            onClick={onDelete}
            style={{ color: 'var(--w-text-muted)' }}
          >
            Delete
          </button>
          <button className="w-btn w-btn-sm" onClick={onBack}>
            Back
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="history-detail-meta">
        <div className="history-detail-row">
          <span className="history-detail-label">Type</span>
          <span>{typeLabel(type)}</span>
        </div>
        <div className="history-detail-row">
          <span className="history-detail-label">Date</span>
          <span>{dateStr}</span>
        </div>
        <div className="history-detail-row">
          <span className="history-detail-label">Time</span>
          <span>{timeStr}</span>
        </div>
        <div className="history-detail-row">
          <span className="history-detail-label">Duration</span>
          <span className="session-timer">{duration}</span>
        </div>
      </div>

      {/* Content (prompt sessions) */}
      {session.content && (
        <>
          <hr className="w-divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="w-label">Session Writing</span>
            <button
              className="w-btn w-btn-sm"
              onClick={() => copy(session.content!)}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="history-content-block">
            {session.content}
          </div>
        </>
      )}

      {/* Practice reference */}
      {practice && (
        <>
          <hr className="w-divider" />
          <div className="history-detail-row">
            <span className="history-detail-label">Practice</span>
            <span style={{ color: 'var(--w-text-secondary)', fontSize: 14 }}>
              {practice.content.length > 80
                ? practice.content.slice(0, 80) + '…'
                : practice.content}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - target.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeOfDay(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
