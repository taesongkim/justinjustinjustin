'use client';

import { useState } from 'react';
import { useWritual } from '../WritualApp';
import { Practice, PracticeFavorite, PromptSettings, DEFAULT_PROMPT_SETTINGS, FAVORITE_COLORS } from '../../lib/types';

interface PromptEditorProps {
  practice?: Practice;
}

export default function PromptEditor({ practice }: PromptEditorProps) {
  const { createPractice, updatePractice, deletePractice, navigate } = useWritual();

  const existingSettings = practice?.settings as PromptSettings | undefined;

  const [title, setTitle] = useState(practice?.title ?? '');
  const [prompt, setPrompt] = useState(practice?.content ?? '');
  const [settings, setSettings] = useState<PromptSettings>(
    existingSettings ?? { ...DEFAULT_PROMPT_SETTINGS }
  );
  const [favorite, setFavorite] = useState<PracticeFavorite>(
    practice?.favorite ?? { enabled: false, color: FAVORITE_COLORS[0].value }
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
        favorite,
      });
    } else {
      const p = createPractice('prompt', title.trim(), prompt.trim(), settings);
      if (favorite.enabled) updatePractice(p.id, { favorite });
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

        <div className="w-toggle-row">
          <span style={{ fontSize: 13 }}>Show Info Panel by Default</span>
          <button
            className="w-toggle"
            data-on={settings.infoPanelVisible}
            onClick={() => updateSetting('infoPanelVisible', !settings.infoPanelVisible)}
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
            <div className="w-toggle-row">
              <span style={{ fontSize: 13 }}>Target word count</span>
              <input
                className="w-input"
                type="number"
                min={1}
                value={settings.targetWordCount ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateSetting('targetWordCount', 0);
                  } else {
                    updateSetting('targetWordCount', Math.max(1, parseInt(val) || 0));
                  }
                }}
                onBlur={() => {
                  if (!settings.targetWordCount || settings.targetWordCount < 1) {
                    updateSetting('targetWordCount', 1);
                  }
                }}
                style={{ width: 100, textAlign: 'right' }}
              />
            </div>
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
            disabled={!title.trim() || !prompt.trim()}
          >
            {practice ? 'Save Changes' : 'Create Practice'}
          </button>
        </div>
      </div>
    </div>
  );
}
