'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import PracticeCard from './PracticeCard';
import { PracticeType } from '../../lib/types';

export default function PracticeLibrary() {
  const { practices, navigate, reorderPractice } = useWritual();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => { setDragIndex(null); setDropIndex(null); };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && index !== dragIndex) {
      setDropIndex(index);
    }
  };
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      reorderPractice(dragIndex, index);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

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
                onClick={() => handleNew('mantra-lines')}
              >
                Mantra Lines
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
          {practices.map((p, i) => (
            <div key={p.id} style={{ position: 'relative' }}>
              {dropIndex === i && dragIndex !== null && dragIndex > i && (
                <div className="drop-indicator drop-indicator-top" />
              )}
              <PracticeCard
                practice={p}
                index={i}
                isDragging={dragIndex === i}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
              {dropIndex === i && dragIndex !== null && dragIndex < i && (
                <div className="drop-indicator drop-indicator-bottom" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
