'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import {
  Practice,
  PracticeFavorite,
  MantraSettings,
  DEFAULT_MANTRA_SETTINGS,
  FAVORITE_COLORS,
} from '../../lib/types';

interface MantraEditorProps {
  practice?: Practice;
}

export default function MantraEditor({ practice }: MantraEditorProps) {
  const { createPractice, updatePractice, deletePractice, navigate } = useWritual();

  // Migrate old settings shape (leniencyLevel string → leniency flags object)
  const existingSettings = practice?.settings as (MantraSettings & Record<string, unknown>) | undefined;
  const migratedSettings: MantraSettings | undefined = existingSettings
    ? {
        ...DEFAULT_MANTRA_SETTINGS,
        ...existingSettings,
        completionDetection: existingSettings.completionDetection ?? (existingSettings.completionMode === 'auto' || existingSettings.completionMode === undefined),
        leniency: { ...(existingSettings.leniency ?? { ignoreCaps: false }), ignorePunctuation: false },
      }
    : undefined;

  const [title, setTitle] = useState(practice?.title ?? '');
  const [phrase, setPhrase] = useState(practice?.content ?? '');
  const [settings, setSettings] = useState<MantraSettings>(
    migratedSettings ?? { ...DEFAULT_MANTRA_SETTINGS }
  );
  const [favorite, setFavorite] = useState<PracticeFavorite>(
    practice?.favorite ?? { enabled: false, color: FAVORITE_COLORS[0].value }
  );

  const updateSetting = <K extends keyof MantraSettings>(
    key: K,
    value: MantraSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!title.trim() || !phrase.trim()) return;

    if (practice) {
      updatePractice(practice.id, {
        title: title.trim(),
        content: phrase.trim(),
        settings,
        favorite,
      });
    } else {
      const p = createPractice('mantra', title.trim(), phrase.trim(), settings);
      if (favorite.enabled) updatePractice(p.id, { favorite });
    }
    navigate({ name: 'library' });
  };

  return (
    <div className="w-stack">
      <div className="w-section-header">
        <h2 className="w-section-title">
          {practice ? 'Edit Mantra' : 'New Mantra'}
        </h2>
        <button
          className="w-btn-ghost writual-nav-link"
          onClick={() => navigate({ name: 'library' })}
        >
          Cancel
        </button>
      </div>

      <div className="w-field">
        <label className="w-label">Title</label>
        <input
          className="w-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning affirmation"
        />
      </div>

      <div className="w-field">
        <label className="w-label">Phrase</label>
        <textarea
          className="w-textarea"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="Enter the mantra phrase..."
          rows={3}
        />
      </div>

      <hr className="w-divider" />

      <div className="w-stack w-stack-sm">
        <span className="w-label" style={{ marginBottom: 4 }}>Settings</span>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Show ghost text</span>
          <button
            className="w-toggle"
            data-on={settings.ghostVisible}
            onClick={() => updateSetting('ghostVisible', !settings.ghostVisible)}
          />
        </div>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Timer</span>
          <button
            className="w-toggle"
            data-on={settings.timerEnabled}
            onClick={() => updateSetting('timerEnabled', !settings.timerEnabled)}
          />
        </div>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Completion detection</span>
          <button
            className="w-toggle"
            data-on={settings.completionDetection}
            onClick={() => updateSetting('completionDetection', !settings.completionDetection)}
          />
        </div>

        {settings.completionDetection && (
          <div className="w-stack w-stack-sm" style={{ paddingLeft: 12, borderLeft: '1px solid var(--w-border)' }}>
            <span className="w-label">Leniency</span>
            <div className="w-toggle-row">
              <span style={{ fontSize: 13 }}>Ignore capitalization</span>
              <button
                className="w-toggle"
                data-on={settings.leniency.ignoreCaps}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    leniency: { ...prev.leniency, ignoreCaps: !prev.leniency.ignoreCaps },
                  }))
                }
              />
            </div>
            {/* Ignore punctuation — hidden for now */}
          </div>
        )}
      </div>

      <hr className="w-divider" />

      <div className="w-stack w-stack-sm">
        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Favorite</span>
          <button
            className="w-toggle"
            data-on={favorite.enabled}
            onClick={() => setFavorite((prev) => ({ ...prev, enabled: !prev.enabled }))}
          />
        </div>
        {favorite.enabled && (
          <div className="w-favorite-colors">
            {FAVORITE_COLORS.map((c) => (
              <button
                key={c.value}
                className="w-favorite-color-btn"
                data-selected={favorite.color === c.value || undefined}
                style={{ background: c.value }}
                onClick={() => setFavorite((prev) => ({ ...prev, color: c.value }))}
                aria-label={c.name}
              />
            ))}
          </div>
        )}
      </div>

      <hr className="w-divider" />

      <div className="w-form-row" style={{ justifyContent: 'space-between' }}>
        {practice ? (
          <button
            className="w-btn w-btn-ghost"
            style={{ color: 'var(--w-error)' }}
            onClick={() => {
              if (confirm('Delete this practice? Session history will be preserved.')) {
                deletePractice(practice.id);
                navigate({ name: 'library' });
              }
            }}
          >
            Delete
          </button>
        ) : <span />}
        <div className="w-form-row">
          <button
            className="w-btn"
            onClick={() => navigate({ name: 'library' })}
          >
            Cancel
          </button>
          <button
            className="w-btn w-btn-primary"
            onClick={handleSave}
            disabled={!title.trim() || !phrase.trim()}
          >
            {practice ? 'Save Changes' : 'Create Practice'}
          </button>
        </div>
      </div>
    </div>
  );
}
