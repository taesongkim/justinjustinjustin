import type { CSSProperties } from "react";

// The AI-Assistant is assigned this neutral (near-ink) avatar_color by the
// DB trigger instead of a palette hue. No human profile ever receives it, so
// it doubles as the marker that a member is the assistant. (Dark mode will
// flip this toward near-white at render time; the stored value stays fixed.)
export const ASSISTANT_AVATAR_COLOR = "#333b36";

// A member's stored avatar_color sits at a light tone that's great as an avatar
// background but too pale as text on the paper ground. Deepen it (in OKLCH, so
// the hue stays true) into a legible name shade. Returns undefined when the
// author has no color so the element keeps its default ink.
export function hueNameStyle(
  color: string | null | undefined,
): CSSProperties | undefined {
  if (!color) return undefined;
  // The mix target flips by theme (black on light, white on dark) via the
  // --ce-hue-mix / --ce-hue-mix-amt tokens, so names stay legible in both.
  return {
    color: `color-mix(in oklch, ${color}, var(--ce-hue-mix) var(--ce-hue-mix-amt))`,
  };
}
