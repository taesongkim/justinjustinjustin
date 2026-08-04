import type { CSSProperties } from "react";

// The AI-Assistant is assigned this neutral (near-ink) avatar_color by the
// DB trigger instead of a palette hue. No human profile ever receives it, so
// it doubles as the marker that a member is the assistant.
export const ASSISTANT_AVATAR_COLOR = "#333b36";

// A member's stored avatar_color sits at a light tone that's great as an avatar
// background but too pale as text. Shift it to a legible name color — the mix
// target flips by theme (black on light, white on dark) via --ce-hue-mix, so
// names stay legible in both. Returns undefined when there's no color.
export function hueNameStyle(
  color: string | null | undefined,
): CSSProperties | undefined {
  if (!color) return undefined;
  // The assistant's neutral reads as near-ink on light / near-paper on dark via
  // the ink-strong token, rather than a muddy mid-grey.
  if (color.toLowerCase() === ASSISTANT_AVATAR_COLOR) {
    return { color: "var(--ce-ink-strong)" };
  }
  return {
    color: `color-mix(in oklch, ${color}, var(--ce-hue-mix) var(--ce-hue-mix-amt))`,
  };
}

// A faint wash of a member's hue over a message surface — the surface token
// tinted ~14% toward the hue, so it stays subtle and theme-aware. The assistant
// (neutral) gets no tint. Pass the element's own surface token as `surface`.
export function hueTintStyle(
  color: string | null | undefined,
  surface = "var(--ce-raised)",
): CSSProperties | undefined {
  if (!color) return undefined;
  if (color.toLowerCase() === ASSISTANT_AVATAR_COLOR) return undefined;
  return { background: `color-mix(in oklch, ${surface}, ${color} 14%)` };
}
