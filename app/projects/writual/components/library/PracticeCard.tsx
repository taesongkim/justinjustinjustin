'use client';

import { useWritual } from '../WritualApp';
import { Practice, isMantraSettings } from '../../lib/types';

interface PracticeCardProps {
  practice: Practice;
}

export default function PracticeCard({ practice }: PracticeCardProps) {
  const { navigate, deletePractice } = useWritual();

  const typeLabel = practice.type === 'mantra' ? 'Mantra' : 'Prompt';
  const preview =
    practice.content.length > 80
      ? practice.content.slice(0, 80) + '...'
      : practice.content;

  return (
    <div className="w-card">
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--w-text)',
            }}
          >
            {practice.title}
          </h3>
          <span
            style={{
              fontSize: 11,
              color: 'var(--w-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            {typeLabel}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--w-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {preview}
        </p>
      </div>

      <div className="w-form-row">
        <button
          className="w-btn w-btn-sm w-btn-primary"
          onClick={() => navigate({ name: 'session', practiceId: practice.id })}
        >
          Start
        </button>
        <button
          className="w-btn w-btn-sm"
          onClick={() =>
            navigate({
              name: 'editor',
              practiceId: practice.id,
              type: practice.type,
            })
          }
        >
          Edit
        </button>
        <button
          className="w-btn w-btn-sm w-btn-ghost"
          onClick={() => {
            if (confirm('Delete this practice?')) {
              deletePractice(practice.id);
            }
          }}
          style={{ color: 'var(--w-text-muted)', marginLeft: 'auto' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
