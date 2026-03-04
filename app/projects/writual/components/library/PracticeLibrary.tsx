'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import PracticeCard from './PracticeCard';
import { PracticeType } from '../../lib/types';

export default function PracticeLibrary() {
  const { practices, navigate } = useWritual();
  const [showNewMenu, setShowNewMenu] = useState(false);

  const handleNew = (type: PracticeType) => {
    setShowNewMenu(false);
    navigate({ name: 'editor', type });
  };

  return (
    <div className="w-stack">
      <div className="w-section-header">
        <h2 className="w-section-title">Practices</h2>
        <div style={{ position: 'relative' }}>
          <button
            className="w-btn"
            onClick={() => setShowNewMenu(!showNewMenu)}
          >
            + New
          </button>
          {showNewMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--w-surface)',
                border: '1px solid var(--w-border)',
                borderRadius: 'var(--w-radius-sm)',
                overflow: 'hidden',
                zIndex: 10,
                minWidth: 160,
              }}
            >
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--w-text)',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--w-surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
                onClick={() => handleNew('mantra')}
              >
                Mantra
              </button>
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--w-text)',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--w-surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
                onClick={() => handleNew('prompt')}
              >
                Prompt
              </button>
            </div>
          )}
        </div>
      </div>

      {practices.length === 0 ? (
        <div className="w-empty">
          <p style={{ marginBottom: 12 }}>No practices yet.</p>
          <p style={{ fontSize: 13 }}>
            Create your first practice to get started.
          </p>
        </div>
      ) : (
        <div className="w-card-grid">
          {practices.map((p) => (
            <PracticeCard key={p.id} practice={p} />
          ))}
        </div>
      )}
    </div>
  );
}
