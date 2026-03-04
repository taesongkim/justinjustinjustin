'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import {
  Practice,
  MantraSettings,
  DEFAULT_MANTRA_SETTINGS,
  LeniencyLevel,
  TypingMode,
  CompletionMode,
} from '../../lib/types';

interface MantraEditorProps {
  practice?: Practice;
}

export default function MantraEditor({ practice }: MantraEditorProps) {
  const { createPractice, updatePractice, navigate } = useWritual();

  const existingSettings = practice?.settings as MantraSettings | undefined;

  const [title, setTitle] = useState(practice?.title ?? '');
  const [phrase, setPhrase] = useState(practice?.content ?? '');
  const [settings, setSettings] = useState<MantraSettings>(
    existingSettings ?? { ...DEFAULT_MANTRA_SETTINGS }
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
      });
    } else {
      createPractice('mantra', title.trim(), phrase.trim(), settings);
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

        <div className="w-field">
          <label className="w-label">Typing mode</label>
          <select
            className="w-select"
            value={settings.typingMode}
            onChange={(e) => updateSetting('typingMode', e.target.value as TypingMode)}
          >
            <option value="replace">Replace (chars fade as you type)</option>
            <option value="overlay">Overlay (type over ghost text)</option>
          </select>
        </div>

        <div className="w-field">
          <label className="w-label">Completion detection</label>
          <select
            className="w-select"
            value={settings.completionMode}
            onChange={(e) => updateSetting('completionMode', e.target.value as CompletionMode)}
          >
            <option value="auto">Auto-detect</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {settings.completionMode === 'auto' && (
          <div className="w-field">
            <label className="w-label">Leniency</label>
            <select
              className="w-select"
              value={settings.leniencyLevel}
              onChange={(e) =>
                updateSetting('leniencyLevel', e.target.value as LeniencyLevel)
              }
            >
              <option value="exact">Exact match</option>
              <option value="ignore-case">Ignore capitalization</option>
              <option value="ignore-punctuation">Ignore punctuation</option>
            </select>
          </div>
        )}
      </div>

      <hr className="w-divider" />

      <div className="w-form-row" style={{ justifyContent: 'flex-end' }}>
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
  );
}
