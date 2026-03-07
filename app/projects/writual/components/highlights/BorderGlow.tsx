'use client';

import { useRef, useEffect, useCallback } from 'react';

interface BorderGlowProps {
  /** Whether the animation is active. */
  active: boolean;
  /** Border radius of the target element (px). */
  radius?: number;
  /** Speed of the glow head in px/ms. */
  speed?: number;
  /** Tail length as fraction of quarter-perimeter. */
  tailFrac?: number;
  /** Ms to hold fully-lit border before calling onComplete. */
  holdMs?: number;
  /** Glow color. */
  color?: string;
  /** Called when travel finishes and hold begins. */
  onHoldStart?: () => void;
  /** Called when all paths have met and hold period is done. */
  onComplete?: () => void;
}

// ─── Path helpers ──────────────────────────────────────────

interface PathPoint {
  x: number;
  y: number;
}

interface SampledPath {
  points: PathPoint[];
  cumLengths: number[];
  totalLength: number;
}

/**
 * Build a quarter-perimeter path around a rounded rect.
 *
 * quadrant:
 *   'left-up'    → left center → up left side → TL arc → right along top → top center
 *   'left-down'  → left center → down left side → BL arc → right along bottom → bottom center
 *   'right-up'   → right center → up right side → TR arc → left along top → top center
 *   'right-down' → right center → down right side → BR arc → right along bottom → bottom center
 */
function buildQuarterPath(
  w: number,
  h: number,
  r: number,
  quadrant: 'left-up' | 'left-down' | 'right-up' | 'right-down',
  arcSegments = 12
): SampledPath {
  const points: PathPoint[] = [];

  switch (quadrant) {
    case 'left-up':
      // Left center → up → TL arc → right → top center
      points.push({ x: 0, y: h / 2 });
      points.push({ x: 0, y: r });
      // TL arc: center (r, r), from π to 3π/2
      for (let i = 1; i <= arcSegments; i++) {
        const angle = Math.PI + (Math.PI / 2) * (i / arcSegments);
        points.push({ x: r + r * Math.cos(angle), y: r + r * Math.sin(angle) });
      }
      points.push({ x: w / 2, y: 0 });
      break;

    case 'left-down':
      // Left center → down → BL arc → right → bottom center
      points.push({ x: 0, y: h / 2 });
      points.push({ x: 0, y: h - r });
      // BL arc: center (r, h-r), from π to π/2
      for (let i = 1; i <= arcSegments; i++) {
        const angle = Math.PI - (Math.PI / 2) * (i / arcSegments);
        points.push({ x: r + r * Math.cos(angle), y: h - r + r * Math.sin(angle) });
      }
      points.push({ x: w / 2, y: h });
      break;

    case 'right-up':
      // Right center → up → TR arc → left → top center
      points.push({ x: w, y: h / 2 });
      points.push({ x: w, y: r });
      // TR arc: center (w-r, r), from 0 to -π/2
      for (let i = 1; i <= arcSegments; i++) {
        const angle = 0 - (Math.PI / 2) * (i / arcSegments);
        points.push({ x: w - r + r * Math.cos(angle), y: r + r * Math.sin(angle) });
      }
      points.push({ x: w / 2, y: 0 });
      break;

    case 'right-down':
      // Right center → down → BR arc → left → bottom center
      points.push({ x: w, y: h / 2 });
      points.push({ x: w, y: h - r });
      // BR arc: center (w-r, h-r), from 0 to π/2
      for (let i = 1; i <= arcSegments; i++) {
        const angle = (Math.PI / 2) * (i / arcSegments);
        points.push({ x: w - r + r * Math.cos(angle), y: h - r + r * Math.sin(angle) });
      }
      points.push({ x: w / 2, y: h });
      break;
  }

  // Compute cumulative lengths
  const cumLengths = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumLengths.push(cumLengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  return { points, cumLengths, totalLength: cumLengths[cumLengths.length - 1] };
}

/** Interpolate a point along a sampled path at a given distance. */
function interpolate(
  points: PathPoint[],
  cumLengths: number[],
  totalLength: number,
  dist: number
): PathPoint {
  const d = Math.max(0, Math.min(totalLength, dist));
  for (let i = 1; i < cumLengths.length; i++) {
    if (d <= cumLengths[i]) {
      const segLen = cumLengths[i] - cumLengths[i - 1];
      const t = segLen > 0 ? (d - cumLengths[i - 1]) / segLen : 0;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
    }
  }
  return points[points.length - 1];
}

/** Draw a sub-segment of a sampled path between startDist and endDist. */
function drawSegment(
  ctx: CanvasRenderingContext2D,
  points: PathPoint[],
  cumLengths: number[],
  totalLength: number,
  startDist: number,
  endDist: number
) {
  const s = Math.max(0, startDist);
  const e = Math.min(totalLength, endDist);
  if (s >= e) return;

  const start = interpolate(points, cumLengths, totalLength, s);
  const end = interpolate(points, cumLengths, totalLength, e);

  let startSeg = 0;
  let endSeg = 0;
  for (let i = 1; i < cumLengths.length; i++) {
    if (s <= cumLengths[i]) { startSeg = i; break; }
  }
  for (let i = 1; i < cumLengths.length; i++) {
    if (e <= cumLengths[i]) { endSeg = i; break; }
  }

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = startSeg; i < endSeg; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

// ─── Component ──────────────────────────────────────────────

export default function BorderGlow({
  active,
  radius = 6,
  speed = 3,
  tailFrac = 0.35,
  holdMs = 0,
  color = '#ffffff',
  onHoldStart,
  onComplete,
}: BorderGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);
  const onHoldStartRef = useRef(onHoldStart);
  onHoldStartRef.current = onHoldStart;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Extra padding around canvas so glow bloom doesn't clip
  const PAD = 24;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    const cw = w + PAD * 2;
    const ch = h + PAD * 2;

    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.translate(PAD, PAD);

    const r = Math.min(radius, w / 2, h / 2);

    // Build 4 quarter-perimeter paths
    const paths = [
      buildQuarterPath(w, h, r, 'left-up'),
      buildQuarterPath(w, h, r, 'left-down'),
      buildQuarterPath(w, h, r, 'right-up'),
      buildQuarterPath(w, h, r, 'right-down'),
    ];

    // All quarter paths are the same length (symmetrical)
    const quarterPerimeter = paths[0].totalLength;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const travelMs = Math.max(60, quarterPerimeter / speed);

    const headDist = (elapsed / travelMs) * quarterPerimeter;
    const tailLength = tailFrac * quarterPerimeter;

    const travelComplete = headDist >= quarterPerimeter;

    const drawPath = (
      path: SampledPath,
      passType: 'main' | 'bloom'
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;

      // Travel phase: subtler glow. Hold phase: full intensity.
      const mainAlpha = travelComplete ? 0.9 : 0.5;
      const mainBlur = travelComplete ? 10 : 5;
      const bloomAlpha = travelComplete ? 0.4 : 0.2;
      const bloomBlur = travelComplete ? 20 : 10;

      ctx.shadowBlur = passType === 'main' ? mainBlur : bloomBlur;

      if (travelComplete) {
        ctx.globalAlpha = passType === 'main' ? mainAlpha : bloomAlpha;
        drawSegment(ctx, path.points, path.cumLengths, path.totalLength, 0, path.totalLength);
      } else {
        const headAlpha = passType === 'main' ? mainAlpha : bloomAlpha;
        const trailAlpha = passType === 'main' ? mainAlpha * 0.7 : bloomAlpha * 0.7;

        const drawEnd = Math.min(quarterPerimeter, headDist);
        const tailStart = headDist - tailLength;
        const trailEnd = Math.min(quarterPerimeter, Math.max(0, tailStart));

        // Trail (already traversed, stays lit)
        if (trailEnd > 0) {
          ctx.globalAlpha = trailAlpha;
          drawSegment(ctx, path.points, path.cumLengths, path.totalLength, 0, trailEnd);
        }

        // Bright head segment
        if (drawEnd > 0) {
          const drawStart = Math.max(0, tailStart);
          const fadeAlpha =
            headDist <= quarterPerimeter
              ? 1
              : Math.max(0, 1 - (headDist - quarterPerimeter) / (tailFrac * quarterPerimeter));
          ctx.globalAlpha = headAlpha * fadeAlpha;
          drawSegment(ctx, path.points, path.cumLengths, path.totalLength, drawStart, drawEnd);
        }
      }
    };

    // Two-pass rendering for all 4 paths
    ctx.save();
    for (const path of paths) drawPath(path, 'main');
    for (const path of paths) drawPath(path, 'bloom');
    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Check completion
    if (travelComplete && !completedRef.current) {
      completedRef.current = true;
      onHoldStartRef.current?.();
      if (holdMs > 0) {
        setTimeout(() => { onCompleteRef.current?.(); }, holdMs);
      } else {
        onCompleteRef.current?.();
      }
    }

    if (!travelComplete) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [radius, speed, tailFrac, holdMs, color, PAD]);

  // Start / stop animation
  useEffect(() => {
    if (active) {
      completedRef.current = false;
      startTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [active, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: -PAD,
        left: -PAD,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
