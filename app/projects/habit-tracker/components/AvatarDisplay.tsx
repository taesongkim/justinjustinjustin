"use client";

import { useState } from "react";
import type { AvatarGif, AvatarMood, AvatarMoodEntry, DateString } from "../lib/types";
import { AVATAR_MOODS, DEFAULT_AVATAR_MOOD } from "../lib/types";
import * as svc from "../lib/service";

interface AvatarDisplayProps {
  userId: string;
  currentDate: DateString;
  todayDate: DateString;
  avatarGifs: AvatarGif[];
  avatarMoods: AvatarMoodEntry[];
  onMoodChanged: () => void;
}

export default function AvatarDisplay({
  userId,
  currentDate,
  todayDate,
  avatarGifs,
  avatarMoods,
  onMoodChanged,
}: AvatarDisplayProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const userGifs = avatarGifs.filter((g) => g.user_id === userId);
  const gifByMood = new Map(userGifs.map((g) => [g.mood, g]));
  const moodEntry = avatarMoods.find((m) => m.user_id === userId);

  // Use explicit mood if set, otherwise fall back to default (walking)
  const effectiveMood: AvatarMood = moodEntry?.mood ?? DEFAULT_AVATAR_MOOD;
  const isExplicit = !!moodEntry;

  // If user has no GIFs uploaded at all, don't show anything
  if (userGifs.length === 0) return null;

  // Resolve the GIF to display: explicit mood first, then default, then first available
  const activeGif = gifByMood.get(effectiveMood) ?? null;
  const gifUrl = activeGif ? svc.getAvatarGifUrl(activeGif.storage_path) : null;

  // Available moods: only those the user has uploaded a GIF for
  const availableMoods = AVATAR_MOODS.filter((m) => gifByMood.has(m.value));

  async function handleSelectMood(mood: AvatarMood) {
    setPickerOpen(false);
    try {
      await svc.setAvatarMood(userId, currentDate, mood);
      onMoodChanged();
    } catch (err) {
      console.error("Failed to set avatar mood:", err);
    }
  }

  async function handleResetToDefault() {
    setPickerOpen(false);
    try {
      await svc.clearAvatarMood(userId, currentDate);
      onMoodChanged();
    } catch (err) {
      console.error("Failed to reset avatar mood:", err);
    }
  }

  return (
    <div className="ht-avatar-display">
      {gifUrl ? (
        <button
          className="ht-avatar-gif-btn"
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Change mood"
        >
          <img src={gifUrl} alt={effectiveMood} className="ht-avatar-gif" />
        </button>
      ) : (
        availableMoods.length > 0 && (
          <button
            className="ht-avatar-set-mood-btn"
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="Set mood"
          >
            Set mood
          </button>
        )
      )}

      {pickerOpen && (
        <div className="ht-avatar-picker">
          {availableMoods.map(({ value, label }) => {
            const gif = gifByMood.get(value)!;
            const isActive = value === effectiveMood;
            return (
              <button
                key={value}
                className={`ht-avatar-picker-item ${isActive ? "ht-avatar-picker-active" : ""}`}
                onClick={() => handleSelectMood(value)}
                title={label}
              >
                <img
                  src={svc.getAvatarGifUrl(gif.storage_path)}
                  alt={label}
                  className="ht-avatar-picker-thumb"
                />
              </button>
            );
          })}
          {isExplicit && (
            <button
              className="ht-avatar-picker-clear"
              onClick={handleResetToDefault}
              title="Reset to default"
            >
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
