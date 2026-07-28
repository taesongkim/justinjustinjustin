# SongOS Style & Animation Preferences

Living document for design decisions across the SongOS project.

---

## Animation

- **No scale/zoom transitions.** Elements should never grow or shrink into view.
- **Default entrance:** fade in + short slide-up (`opacity: 0 → 1`, `y: 6 → 0`).
- **Default exit:** fade out + short slide-down (`opacity: 1 → 0`, `y: 0 → 6`).
- Backdrop overlays (modals) fade only — no movement on the backdrop itself.
- Stagger delays of **30ms per item** (`delay: index * 0.03`) for lists and grids.
- Keep transition durations short: **0.15–0.25s**, easeOut.
- Toasts: slide up from `y: 20`, exit at `y: 20`, durations 0.15s in / 0.1s out.
- Collapse/expand (child lists): animate `height: 0 ↔ auto` with opacity.

## Hover & Interaction

All hover effects should feel instant and subtle. The goal is responsive feedback without drawing attention away from content.

- **Standard CSS transition:** `0.15s` on all interactive properties. This is the default. Never go slower unless animating layout (width, height).
- **Background hover pattern (cards):** nudge white overlay opacity up by ~0.02.
  - Resting: `rgba(255, 255, 255, 0.04)`, hover: `rgba(255, 255, 255, 0.06)`, selected: `rgba(255, 255, 255, 0.08)`.
- **Background hover pattern (buttons):** `transparent → var(--nt-bg)` or `rgba(255,255,255,0.04) → rgba(255,255,255,0.1)`.
- **Border hover pattern:** `var(--nt-border) → var(--nt-text-muted)` for subtle cards, `var(--nt-border) → var(--nt-accent)` for action buttons.
- **Color hover pattern:** `var(--nt-text-muted) → var(--nt-text-secondary)` for text, `var(--nt-text-muted) → var(--nt-accent)` for action text.
- **Opacity hover pattern:** resting opacity varies by importance (0.2–0.5), hover always approaches 0.9–1.0. Drag handles start near-invisible (0.05) and surface on row hover (0.4).
- **Glow on hover:** accent color picker uses `box-shadow: 0 0 8px {color}` on hover. Use this pattern for any interactive element that benefits from a soft halo.

## Glow & Shadow

Glow is the primary depth cue — use it instead of heavy drop shadows.

- **Accent glow:** `box-shadow: 0 0 6–8px var(--nt-accent)` for connecting lines and highlighted interactive elements.
- **Category-colored glow:** `box-shadow: 0 0 8px {categoryColor}` where emphasis is needed.
- **Caution pulse:** animated `box-shadow` cycling between `0 0 8px rgba(251,146,60,0.3)` and `0 0 2px rgba(251,146,60,0)` over 1s, ease-in-out, infinite. Accompanied by an `inset 0 0 0 0.5px` ring that fades in sync.
- **Tooltip shadow:** `0 2px 8px rgba(0,0,0,0.4)` — the one place a traditional drop shadow is used.
- **Dropdown shadow:** `0 4px 12px rgba(0,0,0,0.15)` — slightly larger for floating menus.
- No hard shadows. Everything should feel like it's emitting light, not casting it.

## Blur & Glassmorphism

- **Primary glass cards (event cards):** `backdrop-filter: blur(18px) saturate(160%)` over `rgba(255,255,255,0.04)` background. Borders at `rgba(255,255,255,0.07)`.
- **Modal card:** `backdrop-filter: blur(7px)` over `rgba(30,30,30,0.15)`. Lighter blur — the backdrop overlay already dims.
- **Modal backdrop overlay:** `rgba(0,0,0,0.5–0.6)` with `backdrop-filter: blur(4px)`.
- **Tooltip:** `backdrop-filter: blur(8px)` over `rgba(20,20,20,0.9)`. High opacity because tooltips need readability.
- Glass surfaces use `WebkitBackdropFilter` alongside `backdropFilter` for Safari.

## Typography

- **Vision titles:** Crimson Pro, 32px, weight 400, letter-spacing 0, color `rgba(255,255,255,0.85)`.
- **Vision descriptions:** Inter, 13px, color `rgba(255,255,255,0.4)`.
- **UI labels / muted text:** Inter, inherit from `--nt-text-muted` or `--nt-text-secondary`.
- **Category labels:** 11px, uppercase, letter-spacing 0.06em, colored to match category.
- **Section headers:** 11px, uppercase, letter-spacing 0.07em, `--nt-text-muted`.

## Layout

- Horizontal padding for content sections: **32px**.
- Top padding: **24px**.
- Left nav background: `#050505` (darker than `--nt-surface`).
- Left nav width: 48px collapsed → 180px expanded, transition `0.2s ease`.

## Color & Surface

- **Opacity scale for white overlays (dark mode):** 0.04 (resting) → 0.06 (hover) → 0.08 (selected/active) → 0.1 (pressed).
- **Text opacity scale:** 0.4 (subdued descriptions) → muted token → secondary token → 0.85 (titles) → primary token.
- **Border opacity:** `rgba(255,255,255,0.07)` for glass card borders, `rgba(255,255,255,0.08)` for selected/divider lines.
- **Selected state borders:** category color at 20% opacity (`{color}33`).
- **Accent colors:** `--nt-accent` (blue) for interactive highlights, `#fb923c` (orange) for caution/warning, `#ef4444` (red) for destructive, `#4ade80` (green) for success/start.
- Category colors defined in `lib/types.ts` under `EVENT_CATEGORY_COLORS`.
- Theme switch transition: `background-color 0.2s ease, color 0.2s ease` on root.

## Data & Display

- **Event timestamps:** time is optional. Events carry a `dateOnly` boolean. When true, the display skips relative time ("3h ago") and shows only the date: "Today", "Yesterday", weekday name, or "Mon DD" / "Mon DD, YYYY".
- **Sorting for date-only events:** the stored timestamp is the creation time (when the event was logged), so sort order reflects logging order even though the display hides the clock.
- **Input pattern for optional fields:** a "+ Add" button appears inline; clicking it reveals the input. A small "×" dismisses it back to the button. No toggles, no checkboxes — the presence of the field is the toggle.

## General Principles

- **Sleek, snappy, glowy.** Every surface should feel like it barely exists — thin borders, low-opacity backgrounds, soft glows. Interactions should feel instant (0.15s).
- Depth comes from glow and opacity, not from drop shadows or elevation.
- Hover states are always additive (brighten, reveal, glow) — never darken or shrink.
- Color is used sparingly and intentionally: categories own their colors, the accent color guides the eye, everything else is neutral.
