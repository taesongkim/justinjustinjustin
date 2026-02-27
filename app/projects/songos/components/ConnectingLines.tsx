"use client";

import { useRef, useEffect, useCallback, useMemo, RefObject } from "react";
import type { ColumnEntry } from "../lib/types";

// ─── Types ────────────────────────────────────────────────────

interface ParentGroup {
  parentRight: number;
  parentY: number;
  trunkX: number;
  children: { x: number; y: number }[];
}

interface ConnectingLinesProps {
  containerRef: RefObject<HTMLDivElement | null>;
  itemRefs: RefObject<Map<string, HTMLElement>>;
  columns: ColumnEntry[][];
  expandedIds: Set<string>;
  /** Stagger delay between top-to-bottom groups, in ms (0 = all at once). */
  staggerDelay: number;
  /** Item ID → list of performance.now() timestamps for overlapping glows. */
  touchedTimestamps: RefObject<Map<string, number[]>>;
  /** Parent ID → list of performance.now() timestamps when glow reached parent. */
  glowArrivals: RefObject<Map<string, number[]>>;
  /** Parent ID → list of performance.now() timestamps when border trace completed. */
  glowComplete: RefObject<Map<string, number[]>>;
  /** Item IDs that should be auto-touched when their border trace completes. */
  pendingAutoTouch: RefObject<Map<string, () => void>>;
  /** Triggers canvas redraw when theme changes. */
  themeKey?: string;
}

// ─── Constants ────────────────────────────────────────────────

const SETTLE_DURATION = 1000;
const MIN_GAP = 12;
/** Duration of each individual element's reveal wipe (ms). */
const REVEAL_DURATION = 100;
/** Glow travel speed in pixels per millisecond. Adjust to taste. ~1.5 px/ms ≈ 1500 px/s. */
const GLOW_SPEED = 3;
/** Minimum travel time so very short paths don't flash too fast (ms). */
const GLOW_MIN_TRAVEL_MS = 60;
/** Tail length as a fraction of the total path length. */
const GLOW_TAIL_FRAC = 0.35;
/** How long the full path stays lit after the travel completes (ms). */
const GLOW_HOLD_MS = 100;
/** How long the lit path fades back to neutral (ms). */
const GLOW_FADE_MS = 500;
/** Upper-bound glow duration for cleanup (generous estimate). */
const GLOW_DURATION_MAX = 2000;
/**
 * Offset from the top of an item element to the vertical center of its first
 * line of text. Matches: 4px item padding + 4px inner padding + 10px (half of
 * 20px line-height).
 */
const FIRST_LINE_Y_OFFSET = 18;

// ─── Drawing helpers ─────────────────────────────────────────

function drawAngular(ctx: CanvasRenderingContext2D, g: ParentGroup) {
  const { parentRight, parentY, trunkX, children } = g;
  // Inset endpoints by 1px to avoid overlapping container borders
  const pRight = parentRight + 1;

  ctx.beginPath();

  if (children.length === 1) {
    const c = children[0];
    const cLeft = c.x - 1;
    if (Math.abs(c.y - parentY) < 1) {
      ctx.moveTo(pRight, parentY);
      ctx.lineTo(cLeft, c.y);
    } else {
      ctx.moveTo(pRight, parentY);
      ctx.lineTo(trunkX, parentY);
      ctx.lineTo(trunkX, c.y);
      ctx.lineTo(cLeft, c.y);
    }
  } else {
    const stops = [
      { y: parentY, isParent: true, x: pRight },
      ...children.map((c) => ({ y: c.y, isParent: false, x: c.x - 1 })),
    ].sort((a, b) => a.y - b.y);

    const topY = Math.min(parentY, ...children.map((c) => c.y));
    const bottomY = Math.max(parentY, ...children.map((c) => c.y));

    ctx.moveTo(pRight, parentY);
    ctx.lineTo(trunkX, parentY);

    let curY = parentY;
    if (topY < curY) {
      ctx.lineTo(trunkX, topY);
      curY = topY;
    }

    for (const s of stops) {
      if (s.isParent) continue;
      ctx.lineTo(trunkX, s.y);
      curY = s.y;
      ctx.lineTo(s.x, s.y);
      ctx.moveTo(trunkX, s.y);
    }

    if (curY < bottomY) ctx.lineTo(trunkX, bottomY);
  }

  ctx.stroke();
}

function drawSeparator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = 0.4 * alpha;
  ctx.fillStyle = color;
  ctx.font =
    '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("–", x, y);
  ctx.restore();
}

// ─── Easing ──────────────────────────────────────────────────

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// ─── Glow path helpers ──────────────────────────────────────

interface GlowPath {
  childId: string;
  points: { x: number; y: number }[];
  cumLengths: number[];
  totalLength: number;
}

/** Build the path from a child item left-edge → trunk → parent right-edge. */
function buildChildPath(
  childId: string,
  childX: number,
  childY: number,
  trunkX: number,
  parentY: number,
  parentRight: number
): GlowPath {
  const points = [
    { x: childX - 1, y: childY },
    { x: trunkX, y: childY },
    { x: trunkX, y: parentY },
    { x: parentRight + 1, y: parentY },
  ];
  const cumLengths = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumLengths.push(cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return { childId, points, cumLengths, totalLength: cumLengths[cumLengths.length - 1] };
}

/** Interpolate a point along a path at a given distance from the start. */
function interpolateAlongPath(
  path: GlowPath,
  dist: number
): { x: number; y: number; segIndex: number } {
  const d = Math.max(0, Math.min(path.totalLength, dist));
  for (let i = 1; i < path.cumLengths.length; i++) {
    if (d <= path.cumLengths[i]) {
      const segLen = path.cumLengths[i] - path.cumLengths[i - 1];
      const t = segLen > 0 ? (d - path.cumLengths[i - 1]) / segLen : 0;
      return {
        x: path.points[i - 1].x + (path.points[i].x - path.points[i - 1].x) * t,
        y: path.points[i - 1].y + (path.points[i].y - path.points[i - 1].y) * t,
        segIndex: i,
      };
    }
  }
  const last = path.points[path.points.length - 1];
  return { x: last.x, y: last.y, segIndex: path.points.length - 1 };
}

/** Draw only the sub-segment of a path between startDist and endDist. */
function drawPathSegment(
  ctx: CanvasRenderingContext2D,
  path: GlowPath,
  startDist: number,
  endDist: number
) {
  const s = Math.max(0, startDist);
  const e = Math.min(path.totalLength, endDist);
  if (s >= e) return;

  const start = interpolateAlongPath(path, s);
  const end = interpolateAlongPath(path, e);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  // Draw through intermediate waypoints between start and end segments
  for (let i = start.segIndex; i < end.segIndex; i++) {
    ctx.lineTo(path.points[i].x, path.points[i].y);
  }
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

// ─── Key computation helpers ─────────────────────────────────

/** Key for each separator: column index + adjacent parent IDs. */
function computeSeparatorKeys(columns: ColumnEntry[][]): Set<string> {
  const keys = new Set<string>();
  for (let colIdx = 1; colIdx < columns.length; colIdx++) {
    const col = columns[colIdx];
    for (let i = 1; i < col.length; i++) {
      if (col[i - 1].parentId !== col[i].parentId) {
        keys.add(`${colIdx}:${col[i - 1].parentId}-${col[i].parentId}`);
      }
    }
  }
  return keys;
}

/**
 * Key for each bracket group.
 * Encodes: column pair, parent index, child indices, AND the total number
 * of bracket groups in the same column pair.  The group count matters
 * because the trunk-X spacing algorithm distributes all trunks evenly —
 * so adding/removing any group shifts EVERY trunk in the pair.
 */
function computeBracketKeys(
  columns: ColumnEntry[][],
  expandedIds: Set<string>
): Set<string> {
  // First pass: count bracket groups per column pair
  const groupCounts: number[] = [];
  for (let colIdx = 0; colIdx < columns.length - 1; colIdx++) {
    const currentCol = columns[colIdx];
    const nextCol = columns[colIdx + 1];
    let count = 0;
    for (const entry of currentCol) {
      if (!expandedIds.has(entry.item.id)) continue;
      if (nextCol.some((c) => c.parentId === entry.item.id)) count++;
    }
    groupCounts.push(count);
  }

  // Second pass: build keys including the group count
  const keys = new Set<string>();
  for (let colIdx = 0; colIdx < columns.length - 1; colIdx++) {
    const currentCol = columns[colIdx];
    const nextCol = columns[colIdx + 1];
    const gc = groupCounts[colIdx];
    for (let parentIdx = 0; parentIdx < currentCol.length; parentIdx++) {
      const entry = currentCol[parentIdx];
      if (!expandedIds.has(entry.item.id)) continue;
      const childParts = nextCol
        .map((c, idx) => ({ c, idx }))
        .filter(({ c }) => c.parentId === entry.item.id)
        .map(({ c, idx }) => `${c.item.id}@${idx}`)
        .join(",");
      if (childParts) {
        keys.add(
          `${entry.item.id}@${colIdx}:${parentIdx}#${gc}->${childParts}`
        );
      }
    }
  }
  return keys;
}

// ─── Component ────────────────────────────────────────────────

export default function ConnectingLines({
  containerRef,
  itemRefs,
  columns,
  expandedIds,
  staggerDelay,
  touchedTimestamps,
  glowArrivals,
  glowComplete,
  pendingAutoTouch,
  themeKey,
}: ConnectingLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const settleEndRef = useRef<number>(0);
  const revealStartRef = useRef<number>(0);

  /** Separator stability tracking. */
  const prevSepKeysRef = useRef<Set<string>>(new Set());
  const stableSepKeysRef = useRef<Set<string>>(new Set());

  /** Bracket stability tracking. */
  const prevBracketKeysRef = useRef<Set<string>>(new Set());
  const stableBracketKeysRef = useRef<Set<string>>(new Set());

  /** Track which parent+timestamp combos have already triggered a glow arrival. */
  const signaledArrivalsRef = useRef<Set<string>>(new Set());
  /** Track which parent IDs have already signaled border trace completion. */
  const signaledCompleteRef = useRef<Set<string>>(new Set());
  /** Track parent IDs where an auto-check callback actually fired (confirmed becoming checked). */
  const confirmedAutoCheckRef = useRef<Set<string>>(new Set());

  // ─── Sync props into refs so draw/startSettle stay stable ──

  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const expandedIdsRef = useRef(expandedIds);
  expandedIdsRef.current = expandedIds;

  const staggerDelayRef = useRef(staggerDelay);
  staggerDelayRef.current = staggerDelay;

  // ─── Structural fingerprint ────────────────────────────────

  const structureKey = useMemo(() => {
    return columns
      .map((col) => col.map((e) => `${e.item.id}:${e.parentId}`).join(","))
      .join("|");
  }, [columns]);

  // ─── Draw (reads from refs, stable callback) ──────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cols = columnsRef.current;
    const expIds = expandedIdsRef.current;
    const stgDelay = staggerDelayRef.current;

    const w = container.scrollWidth;
    const h = container.scrollHeight;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const elStyle = getComputedStyle(container.closest(".nt") || container);
    const lineColor =
      elStyle.getPropertyValue("--nt-line-color").trim() || "#2a2a2a";
    const mutedColor =
      elStyle.getPropertyValue("--nt-text-muted").trim() || "#888";

    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const toLocal = (rect: DOMRect) => ({
      left: rect.left - containerRect.left + scrollLeft,
      right: rect.right - containerRect.left + scrollLeft,
      centerY: rect.top + FIRST_LINE_Y_OFFSET - containerRect.top + scrollTop,
    });

    const now = performance.now();
    const touched = touchedTimestamps.current;
    let hasActiveGlow = false;

    // ─── Drawable element types ──────────────────────────

    type BracketDrawable = {
      type: "bracket";
      group: ParentGroup;
      minX: number;
      maxX: number;
      topY: number;
      /** Parent item ID (for glow lookup). */
      parentId: string;
      /** Child item IDs (for glow lookup). */
      childIds: string[];
      /** Per-child paths from child→parent for traveling glow. */
      childPaths: GlowPath[];
    };

    type SeparatorDrawable = {
      type: "separator";
      centerX: number;
      centerY: number;
      topY: number;
    };

    type Drawable = BracketDrawable | SeparatorDrawable;

    const staggered: Drawable[] = [];
    const stableBrackets: BracketDrawable[] = [];
    const stableSeparators: SeparatorDrawable[] = [];

    // ─── Build bracket groups ────────────────────────────

    for (let colIdx = 0; colIdx < cols.length - 1; colIdx++) {
      const currentCol = cols[colIdx];
      const nextCol = cols[colIdx + 1];

      // First pass: build groups with their bracket keys
      const groupsWithKeys: {
        group: ParentGroup;
        bracketKey: string;
        childEntries: ColumnEntry[];
        validChildEntries: ColumnEntry[];
      }[] = [];

      for (let parentIdx = 0; parentIdx < currentCol.length; parentIdx++) {
        const entry = currentCol[parentIdx];
        if (!expIds.has(entry.item.id)) continue;

        const parentEl = itemRefs.current.get(entry.item.id);
        if (!parentEl) continue;
        const parent = toLocal(parentEl.getBoundingClientRect());

        const childEntries = nextCol.filter(
          (c) => c.parentId === entry.item.id
        );
        const children: ParentGroup["children"] = [];
        const validChildEntries: ColumnEntry[] = [];
        for (const ce of childEntries) {
          const childEl = itemRefs.current.get(ce.item.id);
          if (!childEl) continue;
          const child = toLocal(childEl.getBoundingClientRect());
          children.push({ x: child.left, y: child.centerY });
          validChildEntries.push(ce);
        }
        if (children.length === 0) continue;

        const childParts = childEntries
          .map((c) => {
            const idx = nextCol.indexOf(c);
            return `${c.item.id}@${idx}`;
          })
          .join(",");

        // bracketKey placeholder — group count appended after first pass
        groupsWithKeys.push({
          group: {
            parentRight: parent.right,
            parentY: parent.centerY,
            trunkX: 0,
            children,
          },
          bracketKey: `${entry.item.id}@${colIdx}:${parentIdx}#__GC__->${childParts}`,
          childEntries,
          validChildEntries,
        });
      }

      if (groupsWithKeys.length === 0) continue;

      // Patch in actual group count now that we know it
      const gc = groupsWithKeys.length;
      for (const gwk of groupsWithKeys) {
        gwk.bracketKey = gwk.bracketKey.replace("__GC__", String(gc));
      }

      // Compute trunk X — midpoint of the gap between parent and children
      const allGroups = groupsWithKeys.map((g) => g.group);
      const gapLeft = Math.max(...allGroups.map((g) => g.parentRight));
      const gapRight = Math.min(
        ...allGroups.flatMap((g) => g.children.map((c) => c.x))
      );
      const midX = gapLeft + Math.max(gapRight - gapLeft, MIN_GAP) / 2;

      for (let gi = 0; gi < allGroups.length; gi++) {
        allGroups[gi].trunkX = midX;

        const g = allGroups[gi];
        const minX = g.parentRight;
        const maxX = Math.max(...g.children.map((c) => c.x));
        const topY = Math.min(g.parentY, ...g.children.map((c) => c.y));

        // Build per-child glow paths (child → trunk → parent)
        const gwk = groupsWithKeys[gi];
        const glowPaths: GlowPath[] = [];
        for (let ci = 0; ci < gwk.validChildEntries.length; ci++) {
          const ce = gwk.validChildEntries[ci];
          const child = g.children[ci];
          if (!child) continue;
          glowPaths.push(
            buildChildPath(
              ce.item.id,
              child.x,
              child.y,
              g.trunkX,
              g.parentY,
              g.parentRight
            )
          );
        }

        const bd: BracketDrawable = {
          type: "bracket",
          group: g,
          minX,
          maxX,
          topY,
          parentId: gwk.childEntries[0]?.parentId ?? "",
          childIds: gwk.validChildEntries.map((c) => c.item.id),
          childPaths: glowPaths,
        };

        const isStable = stableBracketKeysRef.current.has(
          groupsWithKeys[gi].bracketKey
        );

        if (isStable) {
          stableBrackets.push(bd);
        } else {
          staggered.push(bd);
        }
      }
    }

    // ─── Build separators ────────────────────────────────

    for (let colIdx = 1; colIdx < cols.length; colIdx++) {
      const col = cols[colIdx];
      for (let i = 1; i < col.length; i++) {
        if (col[i - 1].parentId === col[i].parentId) continue;

        const key = `${colIdx}:${col[i - 1].parentId}-${col[i].parentId}`;

        const prevEl = itemRefs.current.get(col[i - 1].item.id);
        const nextEl = itemRefs.current.get(col[i].item.id);
        if (!prevEl || !nextEl) continue;

        const prevLocal = toLocal(prevEl.getBoundingClientRect());
        const nextLocal = toLocal(nextEl.getBoundingClientRect());

        const centerY = (prevLocal.centerY + nextLocal.centerY) / 2;
        const centerX = (prevLocal.left + prevLocal.right) / 2;

        const sd: SeparatorDrawable = {
          type: "separator",
          centerX,
          centerY,
          topY: centerY,
        };

        if (stableSepKeysRef.current.has(key)) {
          stableSeparators.push(sd);
        } else {
          staggered.push(sd);
        }
      }
    }

    // ─── Sort staggered elements top-to-bottom ───────────

    staggered.sort((a, b) => a.topY - b.topY);

    // ─── Draw stable elements (full opacity, no reveal) ──

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const bd of stableBrackets) {
      drawAngular(ctx, bd.group);
    }

    for (const sd of stableSeparators) {
      drawSeparator(ctx, sd.centerX, sd.centerY, mutedColor, 1);
    }

    // ─── Draw staggered elements with reveal ─────────────

    for (let i = 0; i < staggered.length; i++) {
      const d = staggered[i];

      const groupStart = revealStartRef.current + i * stgDelay;
      const elapsed = now - groupStart;
      const rawT = Math.min(1, Math.max(0, elapsed / REVEAL_DURATION));
      const t = easeOutQuad(rawT);

      if (t <= 0) continue;

      if (d.type === "bracket") {
        const wipeSpan = d.maxX - d.minX;
        const clipRight = d.minX + wipeSpan * t;

        ctx.save();
        ctx.globalAlpha = t;
        ctx.beginPath();
        ctx.rect(0, 0, clipRight, h);
        ctx.clip();
        drawAngular(ctx, d.group);
        ctx.restore();
      } else {
        drawSeparator(ctx, d.centerX, d.centerY, mutedColor, t);
      }
    }

    // ─── Traveling glow for brackets with recently-touched children ──

    const containerEl = containerRef.current;
    const rootEl = containerEl?.closest(".nt") || document.documentElement;
    const rootStyle = getComputedStyle(rootEl);
    const glowColor = rootStyle.getPropertyValue("--nt-glow-color").trim() || "#ffffff";
    const checkedColor = rootStyle.getPropertyValue("--nt-checkbox-checked").trim() || "#60a5fa";

    const allBrackets = [...stableBrackets, ...staggered.filter(
      (d): d is BracketDrawable => d.type === "bracket"
    )];

    // Track parent glow state: alpha + perimeter progress (0=right, 1=left complete)
    const parentGlowState = new Map<string, { alpha: number; progress: number; becomingChecked: boolean }>();

    for (const bd of allBrackets) {
      for (const path of bd.childPaths) {
        const raw = touched.get(path.childId);
        if (!raw) continue;
        const timestamps = Array.isArray(raw) ? raw : [raw as unknown as number];
        if (timestamps.length === 0) continue;
        if (path.totalLength === 0) continue;

        for (const ts of timestamps) {
          const elapsed = now - ts;
          // Per-path timing based on constant speed
          const travelMs = Math.max(GLOW_MIN_TRAVEL_MS, path.totalLength / GLOW_SPEED);
          const travelTotal = Math.ceil(travelMs * (1 + GLOW_TAIL_FRAC));
          const glowDuration = travelTotal + GLOW_HOLD_MS + GLOW_FADE_MS;
          if (elapsed >= glowDuration) continue;

          hasActiveGlow = true;

          if (elapsed < travelTotal) {
            // ── Phase 1: Traveling glow (head moves child→parent) ──
            const headProgress = elapsed / travelMs;
            const headDist = headProgress * path.totalLength;
            const tailLength = GLOW_TAIL_FRAC * path.totalLength;
            const tailDist = headDist - tailLength;

            const drawStart = Math.max(0, tailDist);
            const drawEnd = Math.min(path.totalLength, headDist);

            if (drawEnd <= 0) continue;

            // Draw the already-traversed trail (stays lit behind the head)
            const trailEnd = Math.min(path.totalLength, drawStart);
            if (trailEnd > 0) {
              ctx.save();
              ctx.strokeStyle = glowColor;
              ctx.lineWidth = 1;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.globalAlpha = 0.7;
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = 8;
              drawPathSegment(ctx, path, 0, trailEnd);
              ctx.shadowBlur = 16;
              ctx.globalAlpha = 0.3;
              drawPathSegment(ctx, path, 0, trailEnd);
              ctx.restore();
            }

            // Draw the bright traveling head segment
            const fadeAlpha =
              headProgress <= 1
                ? 1
                : Math.max(0, 1 - (headProgress - 1) / GLOW_TAIL_FRAC);

            ctx.save();
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 1;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = fadeAlpha * 0.9;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 10;
            drawPathSegment(ctx, path, drawStart, drawEnd);
            ctx.shadowBlur = 20;
            ctx.globalAlpha = fadeAlpha * 0.4;
            drawPathSegment(ctx, path, drawStart, drawEnd);
            ctx.restore();

            // Parent glow ramps up as head approaches parent (last 30% of travel)
            if (headProgress > 0.7) {
              const rampAlpha = Math.min(1, (headProgress - 0.7) / 0.3);
              // Perimeter progress: during ramp phase, go from 0 to 0.5
              const rampProgress = rampAlpha * 0.5;
              const prev = parentGlowState.get(bd.parentId) ?? { alpha: 0, progress: 0, becomingChecked: false };
              parentGlowState.set(bd.parentId, {
                alpha: Math.max(prev.alpha, rampAlpha),
                progress: Math.max(prev.progress, rampProgress),
                becomingChecked: prev.becomingChecked || confirmedAutoCheckRef.current.has(bd.parentId),
              });

              // Signal glow arrival for liquid checkbox sync
              const arrivalKey = `${bd.parentId}:${ts}`;
              if (!signaledArrivalsRef.current.has(arrivalKey)) {
                signaledArrivalsRef.current.add(arrivalKey);
                const arrivals = glowArrivals.current;
                const existing = arrivals.get(bd.parentId);
                if (existing) {
                  existing.push(now);
                } else {
                  arrivals.set(bd.parentId, [now]);
                }
              }
            }
          } else {
            // ── Phase 2 & 3: Hold then fade ──
            const afterTravel = elapsed - travelTotal;
            const alpha =
              afterTravel < GLOW_HOLD_MS
                ? 1
                : Math.max(0, 1 - (afterTravel - GLOW_HOLD_MS) / GLOW_FADE_MS);

            if (alpha <= 0) continue;

            // Use blue when parent is confirmed becoming checked
            const parentState = parentGlowState.get(bd.parentId);
            const pathColor = (parentState && parentState.progress >= 1 && parentState.becomingChecked) ? checkedColor : glowColor;

            ctx.save();
            ctx.strokeStyle = pathColor;
            ctx.lineWidth = 1;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = alpha * 0.7;
            ctx.shadowColor = pathColor;
            ctx.shadowBlur = 8;
            drawPathSegment(ctx, path, 0, path.totalLength);
            ctx.shadowBlur = 16;
            ctx.globalAlpha = alpha * 0.3;
            drawPathSegment(ctx, path, 0, path.totalLength);
            ctx.restore();

            // Track parent glow state — perimeter completes during hold, stays at 1 during fade
            const holdProgress = afterTravel < GLOW_HOLD_MS
              ? 0.5 + 0.5 * (afterTravel / GLOW_HOLD_MS)
              : 1;
            const prev = parentGlowState.get(bd.parentId) ?? { alpha: 0, progress: 0, becomingChecked: false };
            parentGlowState.set(bd.parentId, {
              alpha: Math.max(prev.alpha, alpha),
              progress: Math.max(prev.progress, holdProgress),
              becomingChecked: prev.becomingChecked || confirmedAutoCheckRef.current.has(bd.parentId),
            });
          }
        }
      }
    }

    // ─── Parent item glow highlight (perimeter trace) ─────────
    //
    // The glow enters from the right-center of the parent container,
    // splits into two paths tracing the top and bottom edges,
    // and meets at the left-center.
    //
    // progress: 0 = just arrived at right, 1 = paths meet at left
    //
    // Each half-path (top/bottom) is parameterized 0→1:
    //   0.0 = right center
    //   → right corner
    //   → horizontal edge
    //   → left corner
    //   1.0 = left center

    for (const [parentId, state] of parentGlowState) {
      if (state.alpha <= 0) continue;

      // Signal border trace completion when perimeter fully enclosed
      if (state.progress >= 1) {
        if (!signaledCompleteRef.current.has(parentId)) {
          signaledCompleteRef.current.add(parentId);
          const completions = glowComplete.current;
          const existing = completions.get(parentId);
          if (existing) {
            existing.push(now);
          } else {
            completions.set(parentId, [now]);
          }
        }

        // If this item has a pending auto-touch callback, fire it immediately.
        // This handles both: (a) callback registered before border completes,
        // and (b) callback registered AFTER border already completed (e.g.
        // last child checked while previous child's liquid was still settling).
        const autoTouchCb = pendingAutoTouch.current.get(parentId);
        if (autoTouchCb) {
          pendingAutoTouch.current.delete(parentId);
          confirmedAutoCheckRef.current.add(parentId);
          // Write touch timestamp directly (visual glow starts next frame)
          const touched = touchedTimestamps.current;
          const existingTs = touched.get(parentId);
          if (existingTs) {
            existingTs.push(now);
          } else {
            touched.set(parentId, [now]);
          }
          hasActiveGlow = true;
          // Call the callback (triggers toggleCheck — React batches it)
          autoTouchCb();
        }
      }

      const parentEl = itemRefs.current.get(parentId);
      if (!parentEl) continue;
      const rect = parentEl.getBoundingClientRect();
      const bx = rect.left - containerRect.left + scrollLeft;
      const by = rect.top - containerRect.top + scrollTop;
      const pw = rect.width;
      const ph = rect.height;
      const r = 6;
      const { alpha, progress } = state;

      // Build perimeter segments for one half (top or bottom).
      // Each segment is a fraction of the half-perimeter length.
      // Half perimeter: rightVerticalHalf + corner + topEdge + corner + leftVerticalHalf
      const rightVert = ph / 2 - r;   // right center to right corner
      const cornerArc = (Math.PI / 2) * r; // quarter circle
      const horizEdge = pw - 2 * r;   // top/bottom straight edge
      const leftVert = ph / 2 - r;    // left corner to left center
      const halfPerimeter = rightVert + cornerArc + horizEdge + cornerArc + leftVert;

      // Draw a traced path for a given half (top or bottom) up to `progress` (0→1)
      const drawHalfPerimeter = (isTop: boolean, prog: number) => {
        if (prog <= 0) return;
        const dist = prog * halfPerimeter;
        let remaining = dist;

        ctx.beginPath();
        // Start at right center
        const startY = by + ph / 2;
        ctx.moveTo(bx + pw, startY);

        // Segment 1: right vertical half (up for top, down for bottom)
        const seg1 = Math.min(remaining, rightVert);
        remaining -= seg1;
        const endY1 = isTop ? startY - seg1 : startY + seg1;
        ctx.lineTo(bx + pw, endY1);

        if (remaining <= 0) { ctx.stroke(); return; }

        // Segment 2: right corner (quarter arc)
        const seg2 = Math.min(remaining, cornerArc);
        remaining -= seg2;
        const cornerFrac = seg2 / cornerArc;
        const cornerAngle = cornerFrac * (Math.PI / 2);
        // Corner center
        const ccx = bx + pw - r;
        const ccy = isTop ? by + r : by + ph - r;
        // Arc from right side toward top/bottom
        if (isTop) {
          ctx.arc(ccx, ccy, r, 0, -cornerAngle, true);
        } else {
          ctx.arc(ccx, ccy, r, 0, cornerAngle, false);
        }

        if (remaining <= 0) { ctx.stroke(); return; }

        // Segment 3: horizontal edge (right to left)
        const seg3 = Math.min(remaining, horizEdge);
        remaining -= seg3;
        const edgeY = isTop ? by : by + ph;
        const edgeEndX = bx + pw - r - seg3;
        ctx.lineTo(edgeEndX, edgeY);

        if (remaining <= 0) { ctx.stroke(); return; }

        // Segment 4: left corner (quarter arc)
        const seg4 = Math.min(remaining, cornerArc);
        remaining -= seg4;
        const cornerFrac2 = seg4 / cornerArc;
        const cornerAngle2 = cornerFrac2 * (Math.PI / 2);
        const ccx2 = bx + r;
        const ccy2 = isTop ? by + r : by + ph - r;
        if (isTop) {
          ctx.arc(ccx2, ccy2, r, -Math.PI / 2, -Math.PI / 2 - cornerAngle2, true);
        } else {
          ctx.arc(ccx2, ccy2, r, Math.PI / 2, Math.PI / 2 + cornerAngle2, false);
        }

        if (remaining <= 0) { ctx.stroke(); return; }

        // Segment 5: left vertical half (down to center for top, up to center for bottom)
        const seg5 = Math.min(remaining, leftVert);
        const endY5 = isTop ? by + r + seg5 : by + ph - r - seg5;
        ctx.lineTo(bx, endY5);
        ctx.stroke();
      };

      // Determine glow color: blue when perimeter completes AND item is becoming checked
      const perimColor = (progress >= 1 && state.becomingChecked) ? checkedColor : glowColor;

      // Fill when perimeter is complete
      if (progress >= 1) {
        ctx.save();
        ctx.fillStyle = perimColor;
        ctx.globalAlpha = alpha * 0.12;
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + pw - r, by);
        ctx.quadraticCurveTo(bx + pw, by, bx + pw, by + r);
        ctx.lineTo(bx + pw, by + ph - r);
        ctx.quadraticCurveTo(bx + pw, by + ph, bx + pw - r, by + ph);
        ctx.lineTo(bx + r, by + ph);
        ctx.quadraticCurveTo(bx, by + ph, bx, by + ph - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw top and bottom half-perimeters with glow
      ctx.save();
      ctx.strokeStyle = perimColor;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // First pass: main glow
      ctx.globalAlpha = alpha * 0.9;
      ctx.shadowColor = perimColor;
      ctx.shadowBlur = 10;
      drawHalfPerimeter(true, progress);
      drawHalfPerimeter(false, progress);

      // Second pass: bloom
      ctx.globalAlpha = alpha * 0.4;
      ctx.shadowBlur = 20;
      drawHalfPerimeter(true, progress);
      drawHalfPerimeter(false, progress);

      ctx.restore();
    }

    // Clean up expired timestamps
    for (const [id, raw] of touched) {
      const arr = Array.isArray(raw) ? raw : [raw as unknown as number];
      const alive = arr.filter((ts) => now - ts < GLOW_DURATION_MAX);
      if (alive.length === 0) {
        touched.delete(id);
      } else if (alive.length < arr.length) {
        touched.set(id, alive);
      }
    }

    // Clean up expired glow arrivals
    const arrivals = glowArrivals.current;
    for (const [id, timestamps] of arrivals) {
      const alive = timestamps.filter((ts) => now - ts < GLOW_DURATION_MAX);
      if (alive.length === 0) {
        arrivals.delete(id);
      } else if (alive.length < timestamps.length) {
        arrivals.set(id, alive);
      }
    }

    // Clean up expired glow completions + signaled keys
    const completions = glowComplete.current;
    for (const [id, timestamps] of completions) {
      const alive = timestamps.filter((ts) => now - ts < GLOW_DURATION_MAX);
      if (alive.length === 0) {
        completions.delete(id);
        signaledCompleteRef.current.delete(id);
        confirmedAutoCheckRef.current.delete(id);
      } else if (alive.length < timestamps.length) {
        completions.set(id, alive);
      }
    }

    // Keep RAF alive if any glow is active
    if (hasActiveGlow && performance.now() >= settleEndRef.current) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [containerRef, itemRefs, touchedTimestamps, glowArrivals, glowComplete, pendingAutoTouch]);

  // ─── RAF settle loop (stable, reads from refs) ─────────

  const startSettle = useCallback(() => {
    const cols = columnsRef.current;
    const expIds = expandedIdsRef.current;

    // Compute separator stability
    const newSepKeys = computeSeparatorKeys(cols);
    stableSepKeysRef.current = new Set(
      [...newSepKeys].filter((k) => prevSepKeysRef.current.has(k))
    );
    prevSepKeysRef.current = newSepKeys;

    // Compute bracket stability
    const newBracketKeys = computeBracketKeys(cols, expIds);
    stableBracketKeysRef.current = new Set(
      [...newBracketKeys].filter((k) => prevBracketKeysRef.current.has(k))
    );
    prevBracketKeysRef.current = newBracketKeys;

    settleEndRef.current = performance.now() + SETTLE_DURATION;
    revealStartRef.current = performance.now();

    const loop = () => {
      draw();
      if (performance.now() < settleEndRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  // ─── Trigger settle only on structural changes ─────────

  useEffect(() => {
    startSettle();
    return () => cancelAnimationFrame(rafRef.current);
  }, [startSettle, structureKey, staggerDelay]);

  // ─── Redraw (no reveal reset) on non-structural changes ─

  useEffect(() => {
    if (performance.now() < settleEndRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw, columns, themeKey]);

  // ─── Scroll & resize listeners ─────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => startSettle());
    ro.observe(container);

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [containerRef, draw, startSettle]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
