"use client";

import { useRef } from "react";
import type { AvatarGif, AvatarMood } from "../lib/types";
import { AVATAR_MOODS } from "../lib/types";
import * as svc from "../lib/service";

interface AvatarManagerProps {
  userId: string;
  avatarGifs: AvatarGif[];
  onChanged: () => void;
}

export default function AvatarManager({ userId, avatarGifs, onChanged }: AvatarManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingMoodRef = useRef<AvatarMood | null>(null);

  const userGifs = avatarGifs.filter((g) => g.user_id === userId);
  const gifByMood = new Map(userGifs.map((g) => [g.mood, g]));

  function handleSlotClick(mood: AvatarMood) {
    pendingMoodRef.current = mood;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const mood = pendingMoodRef.current;
    if (!file || !mood) return;

    try {
      await svc.uploadAvatarGif(userId, mood, file);
      onChanged();
    } catch (err) {
      console.error("Failed to upload avatar GIF:", err);
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
    pendingMoodRef.current = null;
  }

  async function handleDelete(mood: AvatarMood) {
    try {
      await svc.deleteAvatarGif(userId, mood);
      onChanged();
    } catch (err) {
      console.error("Failed to delete avatar GIF:", err);
    }
  }

  return (
    <div className="ht-avatar-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gif,image/gif"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />
      <div className="ht-avatar-grid">
        {AVATAR_MOODS.map(({ value, label }) => {
          const gif = gifByMood.get(value);
          return (
            <div key={value} className="ht-avatar-slot">
              {gif ? (
                <div className="ht-avatar-slot-filled">
                  <img
                    src={svc.getAvatarGifUrl(gif.storage_path)}
                    alt={label}
                    className="ht-avatar-thumb"
                  />
                  <div className="ht-avatar-slot-actions">
                    <button
                      className="ht-avatar-replace-btn"
                      onClick={() => handleSlotClick(value)}
                      title="Replace"
                    >
                      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                        <path d="M10 1L1 10M10 1H4M10 1v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                    <button
                      className="ht-avatar-delete-btn"
                      onClick={() => handleDelete(value)}
                      title="Delete"
                    >
                      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="ht-avatar-slot-empty"
                  onClick={() => handleSlotClick(value)}
                  title={`Upload ${label} GIF`}
                >
                  +
                </button>
              )}
              <span className="ht-avatar-slot-label">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
