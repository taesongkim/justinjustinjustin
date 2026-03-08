# Backdrop Filter in Chrome — What We Know

## Root Causes Found

### 1. `opacity < 1` kills `backdrop-filter` in Chrome

Chrome does not composite `backdrop-filter` on elements with `opacity < 1`. When an element has fractional opacity (anything between 0 and 1, exclusive), Chrome skips `backdrop-filter` compositing entirely. The blur only works at exactly `opacity: 1`.

**How we proved it:** Created test divs with `backdrop-filter: blur(20px)`:
- At `opacity: 1` → blur works
- Transitioning `opacity: 0` → `opacity: 1` on hover → blur appears only once opacity reaches 1.0
- At `opacity: 0.5` → blur never appears

**Fix:** Don't use `opacity` transitions on elements that need `backdrop-filter`. Use `left`/`transform` for slide-in/out, or `visibility` for show/hide.

### 2. CSS `backdrop-filter` can be silently overridden by Tailwind/build pipeline

Even after fixing the opacity issue, `backdrop-filter` set in a `.css` file was not being applied to `.session-info-stage`. The exact same property set via **inline React style** (`style={{ backdropFilter: 'blur(4px)' }}`) worked immediately.

This is likely a CSS specificity or build-pipeline issue — Tailwind v4 or Next.js may be generating a reset or conflicting rule that overrides `backdrop-filter` from the stylesheet. Inline styles have the highest specificity (short of `!important`) and bypass this.

**Fix:** Apply `backdrop-filter` and `-webkit-backdrop-filter` as inline styles when CSS doesn't work:
```jsx
style={{
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}}
```

### 3. `filter` on a parent (even no-op) breaks descendant `backdrop-filter`

Any `filter` property on a parent element — even `filter: blur(0px)` — creates a new stacking context and containing block. This can prevent `backdrop-filter` from working on descendants. We had `filter: blur(0px)` on `.writual` (added for GPU compositing during privacy mode transitions) and removed it.

## What We Tried (Chronological)

1. **Direct `backdrop-filter` in CSS** → didn't work (opacity was 0/transitioning)
2. **Removed `filter: blur(0px)` from `.writual`** → good cleanup, didn't fix blur
3. **`::before` pseudo-element approach** (StackOverflow suggestion for backdrop roots) → didn't help because parent opacity was the real issue
4. **Disabled `mix-blend-mode: screen`** on dust texture → not the cause
5. **Test swatches A-D** (various approaches inside/outside `.writual`) → helped narrow down
6. **Test E** (full-screen portal to body) → worked! Proved backdrop-filter functions
7. **Test F** (small portal to body) → worked! Proved it's not a size issue
8. **Test G** (small, inside `.writual`, opacity:1) → worked! Proved `.writual` tree is fine
9. **Test G with opacity transition** → proved opacity < 1 kills blur
10. **Removed opacity from info panel CSS** → CSS `backdrop-filter` still didn't work
11. **Inline style `backdropFilter`** → works! CSS specificity/build issue

## Why the Highlight Modal Works

The highlight modal uses `createPortal(jsx, document.body)` and a fast `fadeIn` animation (0.12s). It works because:
- It's outside the `.writual` tree (avoids any ancestor compositing issues)
- The animation is so fast the fractional-opacity window is imperceptible
- CSS animations may be composited differently than CSS transitions

## Reference: Things That Can Break `backdrop-filter` in Chrome

### On the element itself:
- `opacity < 1` — Chrome may skip backdrop-filter compositing (see nuance below)
- CSS specificity — Tailwind/build tools may silently override it (use inline styles as fallback)

### On ancestor elements:
- `filter` (even `blur(0px)`) — creates stacking context + containing block
- `backdrop-filter` — creates a "backdrop root" blocking nested backdrop-filters
- `transform` — creates containing block for `position: fixed` descendants
- `will-change: transform` or `will-change: filter` — same as above
- `mix-blend-mode` (non-normal) — forces isolated compositing group
- `isolation: isolate` — creates stacking context
- `contain: paint` or `contain: layout` — creates containing block
- `perspective` (non-none) — creates containing block

### Chrome-specific nesting rule (W3C spec):
- An element with `backdrop-filter` becomes a "Backdrop Root"
- Nested `backdrop-filter` descendants cannot see past the root
- Chrome follows this spec; Safari and Firefox do not
- **Workaround:** Put `backdrop-filter` on a `::before` pseudo-element (no children = no backdrop root issue)

## Opacity + Backdrop-Filter: Nuance

Our initial test (test G at 50% opacity) showed backdrop-filter not working. However, the final info panel implementation uses an `opacity: 0 → 1` CSS transition alongside `backdrop-filter` applied via inline style, and **the blur works throughout the fade**.

The key difference may be:
- **Inline style `backdropFilter`** is applied, not CSS class-based
- The transition is short (0.2s) so the fractional-opacity window is brief
- Chrome may handle opacity transitions differently when backdrop-filter is set via inline style vs. stylesheet

**Takeaway:** Opacity fade-ins ARE compatible with backdrop-filter blur in practice, at least when backdrop-filter is applied via inline style. The earlier failure at static `opacity: 0.5` may have been a different issue (possibly the CSS backdrop-filter not being applied at all due to the build/specificity problem).

## Current Solution (Info Panel)

- `backdrop-filter` applied via **inline React style** (CSS version gets overridden by Tailwind/build)
- `opacity: 0 → 1` fade transition works alongside the blur
- `transform: translateX(16px) → 0` slide from right
- `background: rgba(255, 255, 255, 0.012)` in CSS (semi-transparent surface)
- `filter: blur(0px)` removed from `.writual` parent
- Panel positioned dynamically relative to writing area's left edge
