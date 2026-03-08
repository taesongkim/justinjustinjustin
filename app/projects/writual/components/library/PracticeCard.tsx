'use client';

import { useWritual } from '../WritualApp';
import { Practice } from '../../lib/types';

interface PracticeCardProps {
  practice: Practice;
}

export default function PracticeCard({ practice }: PracticeCardProps) {
  const { navigate } = useWritual();

  const typeLabels: Record<string, string> = {
    mantra: 'Mantra',
    'mantra-lines': 'Mantra Lines',
    prompt: 'Prompt',
  };
  const typeLabel = typeLabels[practice.type] ?? practice.type;
  const preview =
    practice.content.length > 80
      ? practice.content.slice(0, 80) + '...'
      : practice.content;

  return (
    <div className="practice-card-row">
      <div
        className="w-card"
        style={{ position: 'relative', cursor: 'pointer', flex: 1 }}
        onClick={() => navigate({ name: 'session', practiceId: practice.id })}
      >
        <button
          className="practice-card-edit"
          onClick={(e) => {
            e.stopPropagation();
            navigate({
              name: 'editor',
              practiceId: practice.id,
              type: practice.type,
            });
          }}
          aria-label="Edit practice"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>

        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              color: 'var(--w-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 6,
              display: 'block',
            }}
          >
            {typeLabel}
          </span>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--w-text)',
              marginBottom: 6,
              paddingRight: 28,
            }}
          >
            {practice.title}
          </h3>
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
      </div>

      <div className="practice-card-start">
        <span className="practice-card-start-text">START SESSION</span>
        <span className="practice-card-start-arrow">→</span>
      </div>
    </div>
  );
}
