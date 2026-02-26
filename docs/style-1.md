# Style Guide: Nested Tasks Aesthetic

A reference for replicating the design language of the Nested Tasks project in new projects.

---

## Core Philosophy

- **Dark-first, minimal surface**: Nearly black backgrounds with a tight 2-layer surface hierarchy. Content lives on surfaces, not cards.
- **Dim everything, reveal with interaction**: Most UI is at reduced opacity by default. Hover, focus, and state changes bring things into full view.
- **Glow over shadow**: Where other UIs use drop shadows for depth, this aesthetic uses colored glows and light bloom effects.
- **Liquid and physical**: Animations feel governed by physics — viscous, fluid, with settle time. Nothing snaps unless it has to.
- **Type hierarchy through opacity and weight, not size**: Font sizes stay tight (11–14px body, 24px title max). Hierarchy comes from opacity and color, not dramatic size jumps.

---

## Color System

Define all colors as CSS custom properties. Scope them to `.nt-dark` and `.nt-light` classes on a root element.

### Dark Mode (primary)
```css
.nt-dark {
  --nt-bg: #0a0a0a;               /* Page background — near black */
  --nt-surface: #161616;          /* Elevated surface — subtle lift */
  --nt-text-primary: #e0e0e0;     /* Body text */
  --nt-text-secondary: #888888;   /* Secondary / supporting text */
  --nt-text-muted: #4a4a4a;       /* Disabled, placeholder, ghost text */
  --nt-border: #222222;           /* Borders and dividers */
  --nt-accent: #60a5fa;           /* Primary interactive accent (blue default) */
  --nt-line-color: #2a2a2a;       /* Structural connector lines */
  --nt-glow-color: #ffffff;       /* Glow / bloom color for animations */
  --nt-liquid-base: #7a7a7a;      /* Resting fill color (liquid checkboxes) */
  --nt-checkbox-bg: #1a1a1a;      /* Checkbox background */
  --nt-checkbox-border: #3a3a3a;  /* Checkbox border */
  --nt-checkbox-checked: var(--nt-accent);
}
```

### Light Mode
```css
.nt-light {
  --nt-bg: #f3f3f4;
  --nt-surface: #eaeaec;
  --nt-text-primary: #1a1a1a;
  --nt-text-secondary: #555555;
  --nt-text-muted: #999999;
  --nt-border: #dcdcdc;
  --nt-accent: #3b82f6;
  --nt-line-color: #c0c0c0;
  --nt-glow-color: #666666;
  --nt-liquid-base: #6b6b6b;
  --nt-checkbox-bg: #ffffff;
  --nt-checkbox-border: #b0b0b0;
  --nt-checkbox-checked: var(--nt-accent);
}
```

### Accent Color Palette
Four swappable accent options — one active at a time via inline `--nt-accent` override:
- Blue: `#60a5fa` (dark) / `#3b82f6` (light)
- Violet: `#a78bfa`
- Emerald: `#34d399`
- Orange: `#fb923c`

---

## Typography

- **Font**: System stack or Inter/Inter Tight. Use Inter Tight for numeric displays and counters.
- **Body text**: 14px, line-height 20px (1.43)
- **Secondary**: 13px
- **Labels / badges**: 11px
- **Title**: 24px, weight 600, letter-spacing -0.01em
- **Monospace / timestamps**: SF Mono, Fira Code, or system mono. 11px.
- **Hierarchy**: Achieved through `--nt-text-primary` → `--nt-text-secondary` → `--nt-text-muted` color steps, not size jumps.

---

## Spacing & Layout

- **Header padding**: 24px top, 32px sides, 16px bottom
- **Content padding**: 24px horizontal
- **Component gap (flex rows)**: 6px between inline elements
- **Item padding**: 4px
- **Border radius**: 6px for containers/items, 4px for small buttons, 3px for checkboxes, 8px for toasts/overlays
- **Grid columns**: Fixed-width (~340–440px each), auto-flowing, overflow-x scrollable
- **Min-height**: `calc(100vh - 120px)` for the main content area

---

## Opacity Conventions

Opacity is the primary language for communicating state. Follow these conventions consistently:

| State | Opacity |
|---|---|
| Normal / interactive | 1.0 |
| Active icon button | 0.7 |
| Inactive / resting icon button | 0.35 |
| Placeholder / ghost | 0.4–0.5 |
| Checked / completed text | 0.6 |
| Waiting / deferred text | 0.7 |
| Waiting checkbox | 0.2 |
| Put-aside / archived | 0.35 |
| Separator / structural chrome | 0.4 |
| Drag handle (hidden until hover) | 0 → visible on parent hover |

Hover states: bump opacity up toward 0.9 and fade in a background. Never jump opacity — always transition.

---

## Buttons & Interactive Elements

### Icon Buttons (the core pattern)
```
width: 20px, height: 20px
background: none (default) → var(--nt-surface) on hover
border: none
border-radius: 4px
cursor: pointer
color: var(--nt-text-muted)
opacity: 0.35 (inactive) or 0.7 (active)
transition: background 0.15s, opacity 0.15s
```

- No visible background at rest — the background **fades in** on hover
- Opacity also rises on hover (toward 0.9)
- Active/toggled state holds at 0.7 opacity and uses accent color for the icon stroke/fill
- All state changes: 0.15s ease transitions

### Accent Color Swatches
```
width/height: 16px
border-radius: 50%
border: 2px solid var(--nt-border)
hover: scale(1.2), box-shadow: 0 0 6px currentColor
transition: transform 0.15s, box-shadow 0.15s
```

### Tabs
```
background: transparent
border: none
border-bottom: 2px solid (accent for active, transparent for inactive)
padding: 4px 8px
font-size: 13px
color: accent (active) / muted (inactive)
transition: color 0.15s, border-color 0.15s
```

### Add / Ghost Buttons
```
color: var(--nt-text-muted)
opacity: 0.5 → 0.8 on hover
transition: opacity 0.15s
```

---

## Transitions & Animation Principles

### Timing
- **Micro-interactions** (hover, opacity fade): 0.15s
- **State changes** (expand/collapse, show/hide): 0.2–0.3s
- **Layout animations** (item reorder, grid shift): 0.12s ease-out
- **Entry animations**: 0.08s opacity fade, staggered by index (0.03s per item)
- **Exit animations**: 0.06s opacity fade, reverse stagger order
- **Physical/liquid settle time**: 0.5–1.5s (never rush physics)

### Easing
- Default: `ease` or `ease-out`
- Collapsing/shrinking: `ease-in`
- Layout: `ease-out` with a slight delay (0.08s) for collapsed items

### Entry / Exit (Framer Motion pattern)
```js
initial: { opacity: 0 }
animate: { opacity: 1, transition: { duration: 0.08, ease: "easeOut", delay: index * 0.03 } }
exit:    { opacity: 0, transition: { duration: 0.06, ease: "easeIn" } }
```

### Reduced Motion
Always provide a `@media (prefers-reduced-motion: reduce)` block that removes all animations and transitions for accessibility.

---

## Glow & Bloom Effects

This is the signature visual touch. Use glow instead of traditional shadows.

### Traveling Glow (connector lines)
- A point of light that travels from a child item up its connecting line to the parent
- Speed: ~1500px/sec
- Tail length: 35% of total path
- After arrival: holds 100ms, fades over 500ms
- Shadow: two-pass — `shadowBlur: 10px` (main, alpha 0.9) + `shadowBlur: 20px` (bloom, alpha 0.4)

### Liquid Flash Glow
- When the liquid checkbox animates: instantly jumps to full glow color
- Holds at glow for 0.5s, then fades back to base gray over 1s
- Implemented via `performance.now()` timestamps, not CSS keyframes
- Two fill passes: `shadowBlur: 12*RES` at 0.6α then `shadowBlur: 24*RES` at 0.25α, both scaled by flash intensity

### Caution / Alert Glow
```css
@keyframes nt-caution-pulse {
  0%, 100% { box-shadow: inset 0 0 0 0.5px rgba(251,146,60,0.9), 0 0 8px rgba(251,146,60,0.3); }
  50%       { box-shadow: inset 0 0 0 0.5px rgba(251,146,60,0.1), 0 0 2px rgba(251,146,60,0); }
}
/* Start at the dim point so the glow fades IN on first appearance */
animation: nt-caution-pulse 1s ease-in-out infinite;
animation-delay: -0.5s;
```

### Drop Indicator Glow
```
height: 2px
background: var(--nt-accent)
border-radius: 1px
box-shadow: 0 0 6px var(--nt-accent), 0 0 8px var(--nt-accent)
```

---

## State Indicators

### Waiting State
- Text: Primary color, 0.7 opacity (not muted color — avoid double-dimming)
- Checkbox: 0.2 opacity
- Three bouncing dots overlay on checkbox (CSS keyframe, staggered 0.2s each)

### Checked / Completed
- Text: Muted color (`--nt-text-muted`) at 0.6 opacity
- Strikethrough: optional but not default
- Checkbox: Filled with `--nt-checkbox-checked` + animated checkmark SVG path (0.2s pathLength)
- Sparkle particle burst on transition to checked

### Caution
- Pulsing orange glow border on the item container
- Flag icon turns `#fb923c` (orange-400)
- Icon fill: `rgba(251,146,60,0.15)` — very subtle orange tint

---

## Structural Lines (Connectors)

- Canvas-drawn, not SVG or DOM borders
- Color: `--nt-line-color` — just barely visible against the background
- Width: 1px
- Cap/join: round
- Reveal animation: staggered fade-in, 100ms per line, easeOutQuad
- No x-staggering; trunk lines use simple midpoint positioning

---

## Scrollbars

Style scrollbars to be minimal and theme-aware:
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--nt-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--nt-text-muted); }
```

---

## Toasts & Floating UI

```
position: fixed, bottom: 24px, centered horizontally
background: var(--nt-surface)
border: 1px solid var(--nt-border)
border-radius: 8px
padding: 10px 16px
box-shadow: 0 4px 12px rgba(0,0,0,0.15)
z-index: 100
entry: opacity 0→1 + y 20→0 over 0.15s
```

---

## Canvas Rendering Tips

When rendering to canvas (checkboxes, connector lines):
- **Always render at high resolution**: `SIZE * RES` (e.g. 8× scale), then CSS-scale down to display size
- **Reset state at start of every draw call**: explicitly set `shadowColor`, `shadowBlur`, `globalAlpha` — these persist between frames
- **Multi-pass for glow**: draw at reduced alpha with shadow, then draw again solid without shadow
- **Clip before fill**: use `roundedRect` + `ctx.clip()` to contain liquid within rounded bounds
- **Inner clip radius** ≈ `BORDER_RADIUS - INSET` to align with the border's inner curve

---

## Do's and Don'ts

**Do:**
- Dim first, reveal on interaction
- Use glow for feedback instead of traditional shadows
- Animate opacity for all show/hide transitions
- Keep font sizes tight and use color/opacity for hierarchy
- Use `performance.now()` for animation timing in canvas loops
- Start pulsing animations offset (`animation-delay: -Xs`) so they fade *in* rather than starting at peak intensity

**Don't:**
- Use `color: muted` AND `opacity < 1` on the same element — they stack and over-dim
- Snap UI changes — even fast transitions should have a duration
- Use border or background to show hover state alone — fade them in together with opacity
- Use large font sizes for hierarchy — keep scale tight and use opacity steps instead
- Leave canvas shadow state uncleared between frames
