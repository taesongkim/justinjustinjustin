'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, PromptSettings, DEFAULT_PROMPT_SETTINGS } from '../../lib/types';

interface PromptEditorProps {
  practice?: Practice;
}

export default function PromptEditor({ practice }: PromptEditorProps) {
  const { createPractice, updatePractice, navigate } = useWritual();

  const existingSettings = practice?.settings as PromptSettings | undefined;

  const [title, setTitle] = useState(practice?.title ?? '');
  const [prompt, setPrompt] = useState(practice?.content ?? '');
  const [settings, setSettings] = useState<PromptSettings>(
    existingSettings ?? { ...DEFAULT_PROMPT_SETTINGS }
  );

  const updateSetting = <K extends keyof PromptSettings>(
    key: K,
    value: PromptSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!title.trim() || !prompt.trim()) return;

    if (practice) {
      updatePractice(practice.id, {
        title: title.trim(),
        content: prompt.trim(),
        settings,
      });
    } else {
      createPractice('prompt', title.trim(), prompt.trim(), settings);
    }
    navigate({ name: 'library' });
  };

  return (
    <div className="w-stack">
      <div className="w-section-header">
        <h2 className="w-section-title">
          {practice ? 'Edit Prompt' : 'New Prompt'}
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
          placeholder="e.g. Morning reflection"
        />
      </div>

      <div className="w-field">
        <label className="w-label">Prompt</label>
        <textarea
          className="w-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What should the writer reflect on?"
          rows={3}
        />
      </div>

      <div className="w-field">
        <label className="w-label">Instructions / Context (optional)</label>
        <textarea
          className="w-textarea"
          value={settings.instructions}
          onChange={(e) => updateSetting('instructions', e.target.value)}
          placeholder="Any additional guidance for the writer..."
          rows={2}
        />
      </div>

      <hr className="w-divider" />

      <div className="w-stack w-stack-sm">
        <span className="w-label" style={{ marginBottom: 4 }}>Settings</span>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Timer</span>
          <button
            className="w-toggle"
            data-on={settings.timerEnabled}
            onClick={() => updateSetting('timerEnabled', !settings.timerEnabled)}
          />
        </div>

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Word count</span>
          <button
            className="w-toggle"
            data-on={settings.wordCountEnabled}
            onClick={() =>
              updateSetting('wordCountEnabled', !settings.wordCountEnabled)
            }
          />
        </div>
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
          disabled={!title.trim() || !prompt.trim()}
        >
          {practice ? 'Save Changes' : 'Create Practice'}
        </button>
      </div>
    </div>
  );
}
