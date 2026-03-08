'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import {
  Practice,
  MantraLinesSettings,
  DEFAULT_MANTRA_LINES_SETTINGS,
} from '../../lib/types';

interface MantraLinesEditorProps {
  practice?: Practice;
}

export default function MantraLinesEditor({ practice }: MantraLinesEditorProps) {
  const { createPractice, updatePractice, deletePractice, navigate } = useWritual();

  const existingSettings = practice?.settings as (MantraLinesSettings & Record<string, unknown>) | undefined;
  const migratedSettings: MantraLinesSettings | undefined = existingSettings
    ? {
        ...DEFAULT_MANTRA_LINES_SETTINGS,
        ...existingSettings,
        leniency: { ...(existingSettings.leniency ?? { ignoreCaps: false }), ignorePunctuation: false },
      }
    : undefined;

  const [title, setTitle] = useState(practice?.title ?? '');
  const [phrase, setPhrase] = useState(practice?.content ?? '');
  const [settings, setSettings] = useState<MantraLinesSettings>(
    migratedSettings ?? { ...DEFAULT_MANTRA_LINES_SETTINGS }
  );

  const updateSetting = <K extends keyof MantraLinesSettings>(
    key: K,
    value: MantraLinesSettings[K]
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
      });
    } else {
      createPractice('mantra-lines', title.trim(), phrase.trim(), settings);
    }
    navigate({ name: 'library' });
  };

  return (
    <div className="w-stack">
      <div className="w-section-header">
        <h2 className="w-section-title">
          {practice ? 'Edit Mantra Lines' : 'New Mantra Lines'}
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
          placeholder="e.g. 108 repetitions"
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

      <div className="w-field">
        <label className="w-label">Number of lines</label>
        <input
          className="w-input"
          type="number"
          min={1}
          max={1000}
          value={settings.lineCount}
          onChange={(e) => updateSetting('lineCount', Math.max(1, parseInt(e.target.value) || 1))}
          style={{ width: 120 }}
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
          <span style={{ fontSize: 13 }}>Session timer</span>
          <button
            className="w-toggle"
            data-on={settings.sessionTimerEnabled}
            onClick={() => updateSetting('sessionTimerEnabled', !settings.sessionTimerEnabled)}
          />
        </div>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Per-line timer</span>
          <button
            className="w-toggle"
            data-on={settings.lineTimerEnabled}
            onClick={() => updateSetting('lineTimerEnabled', !settings.lineTimerEnabled)}
          />
        </div>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Auto-advance on completion</span>
          <button
            className="w-toggle"
            data-on={settings.autoAdvance}
            onClick={() => updateSetting('autoAdvance', !settings.autoAdvance)}
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
