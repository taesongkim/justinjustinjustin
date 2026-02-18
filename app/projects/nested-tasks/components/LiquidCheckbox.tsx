"use client";

import { useRef, useEffect, useCallback, useState, RefObject } from "react";
import { motion } from "framer-motion";
import { ViscousBlob } from "../lib/liquid-physics";

// ─── Constants ────────────────────────────────────────────────

const SIZE = 16;
const RES = 8;
const W = SIZE * RES;
const H = SIZE * RES;
const BORDER_RADIUS = 3 * RES;
const CHECK_INSET = 1 * RES;

// ─── Types ────────────────────────────────────────────────────

interface LiquidCheckboxProps {
  /** Fill level 0–1, computed from checked children / total children. */
  fillLevel: number;
  /** Whether this item is fully checked (shows checkmark). */
  isChecked: boolean;
  /** Whether this item is put-aside (dimmed). */
  isPutAside?: boolean;
  /** Item ID — used to detect glow arrivals. */
  itemId: string;
  /** If true, render as a simple solid checkbox (no liquid). */
  isLeaf: boolean;
  /** Ref to glow arrival timestamps from ConnectingLines. */
  glowArrivals: RefObject<Map<string, number[]>>;
  /** Current accent color — triggers canvas redraw when changed. */
  accentColor: string;
  /** Click handler. */
  onClick: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Sparkle Overlay ─────────────────────────────────────────

const SPARKLE_SIZE = 32; // display size of sparkle canvas (centered over 16px checkbox)
const SPARKLE_RES = 4;
const SPARKLE_W = SPARKLE_SIZE * SPARKLE_RES;
const SPARKLE_H = SPARKLE_SIZE * SPARKLE_RES;
const SPARKLE_COUNT = 10;
const SPARKLE_OFFSET = (SPARKLE_SIZE - SIZE) / 2; // centering offset

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

function spawnParticles(): Particle[] {
  const particles: Particle[] = [];
  const cx = SPARKLE_W / 2;
  const cy = SPARKLE_H / 2;
  const checkboxHalf = (SIZE * SPARKLE_RES) / 2;

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SPARKLE_COUNT + (Math.random() - 0.5) * 0.6;
    // Spawn just outside checkbox edge
    const spawnDist = checkboxHalf + SPARKLE_RES;
    const x = cx + Math.cos(angle) * spawnDist;
    const y = cy + Math.sin(angle) * spawnDist;
    // Short burst: 4-8 display px = 16-32 canvas px over lifetime
    // With drag 0.82 over ~8 frames: total ≈ speed * (1 - 0.82^8) / (1 - 0.82) ≈ speed * 4.4
    // So speed ~5-7 canvas px/frame → ~22-31 canvas px total → 5.5-7.7 display px
    const speed = (5 + Math.random() * 2) * SPARKLE_RES / SPARKLE_RES;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const maxLife = 8 + Math.random() * 5; // frames — fast fade

    particles.push({
      x, y, vx, vy,
      life: maxLife,
      maxLife,
      size: (0.8 + Math.random() * 0.7) * SPARKLE_RES,
    });
  }
  return particles;
}

function SparkleOverlay({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const prevTriggerRef = useRef<number>(trigger);

  useEffect(() => {
    if (trigger === prevTriggerRef.current) return;
    prevTriggerRef.current = trigger;
    if (trigger === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Read the blue color from CSS
    const root = canvas.closest(".nt") || document.documentElement;
    const style = getComputedStyle(root);
    const sparkleColor = style.getPropertyValue("--nt-checkbox-checked").trim() || "#60a5fa";

    const particles = spawnParticles();

    const loop = () => {
      ctx.clearRect(0, 0, SPARKLE_W, SPARKLE_H);

      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.life -= 1;

        const alpha = (p.life / p.maxLife);

        // Sharp dot — no shadow/blur
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sparkleColor;
        ctx.fillRect(
          Math.round(p.x - p.size / 2),
          Math.round(p.y - p.size / 2),
          Math.round(p.size),
          Math.round(p.size),
        );
        ctx.restore();
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, SPARKLE_W, SPARKLE_H);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      width={SPARKLE_W}
      height={SPARKLE_H}
      style={{
        position: "absolute",
        width: SPARKLE_SIZE,
        height: SPARKLE_SIZE,
        top: -SPARKLE_OFFSET,
        left: -SPARKLE_OFFSET,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Leaf Checkbox ────────────────────────────────────────────

function LeafCheckbox({
  isChecked,
  isPutAside,
  accentColor,
  onClick,
}: {
  isChecked: boolean;
  isPutAside?: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const [sparkleTrigger, setSparkleTrigger] = useState(0);
  const prevCheckedRef = useRef(isChecked);
  const prevAccentRef = useRef(accentColor);

  useEffect(() => {
    if (isChecked && !prevCheckedRef.current) {
      setSparkleTrigger((n) => n + 1);
    }
    prevCheckedRef.current = isChecked;
  }, [isChecked]);

  // Sparkle when accent color changes on a checked checkbox
  useEffect(() => {
    if (accentColor !== prevAccentRef.current && isChecked) {
      setSparkleTrigger((n) => n + 1);
    }
    prevAccentRef.current = accentColor;
  }, [accentColor, isChecked]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      tabIndex={-1}
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: "none",
        background: isChecked
          ? "var(--nt-checkbox-checked)"
          : "var(--nt-checkbox-border)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
        padding: 0,
        position: "relative",
        overflow: "visible",
        opacity: isPutAside ? 0.35 : 1,
      }}
      aria-label={isChecked ? "Uncheck item" : "Check item"}
    >
      <SparkleOverlay trigger={sparkleTrigger} />
      {isChecked && (
        <motion.svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.path
            d="M2 5 L4.5 7.5 L8 3"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
          />
        </motion.svg>
      )}
    </button>
  );
}

// ─── Liquid Parent Checkbox ───────────────────────────────────

function LiquidParentCheckbox({
  fillLevel,
  isChecked,
  isPutAside,
  itemId,
  glowArrivals,
  accentColor,
  onClick,
}: {
  fillLevel: number;
  isChecked: boolean;
  isPutAside?: boolean;
  itemId: string;
  glowArrivals: RefObject<Map<string, number[]>>;
  accentColor: string;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<ViscousBlob | null>(null);
  const rafRef = useRef<number>(0);
  const prevFillRef = useRef<number>(fillLevel);
  const processedArrivalsRef = useRef<Set<number>>(new Set());
  const pendingFillRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const [sparkleTrigger, setSparkleTrigger] = useState(0);
  const prevCheckedRef = useRef(isChecked);

  const prevAccentRef = useRef(accentColor);

  // Sparkle on check
  useEffect(() => {
    if (isChecked && !prevCheckedRef.current) {
      setSparkleTrigger((n) => n + 1);
    }
    prevCheckedRef.current = isChecked;
  }, [isChecked]);

  // Sparkle when accent color changes on a checked/filled checkbox
  useEffect(() => {
    if (accentColor !== prevAccentRef.current && isChecked) {
      setSparkleTrigger((n) => n + 1);
    }
    prevAccentRef.current = accentColor;
  }, [accentColor, isChecked, fillLevel]);

  // Initialize blob
  if (!blobRef.current) {
    blobRef.current = new ViscousBlob();
    blobRef.current.fill = fillLevel;
    blobRef.current.targetFill = fillLevel;
  }

  const startLoop = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const loop = () => {
      const blob = blobRef.current;
      const canvas = canvasRef.current;
      if (!blob || !canvas) {
        isRunningRef.current = false;
        return;
      }

      // Check for glow arrivals before updating physics
      const arrivals = glowArrivals.current.get(itemId);
      if (arrivals && arrivals.length > 0 && pendingFillRef.current !== null) {
        for (const ts of arrivals) {
          if (!processedArrivalsRef.current.has(ts)) {
            processedArrivalsRef.current.add(ts);
            if (pendingFillRef.current >= 1) {
              // Fill to full — snap instantly, no liquid
              blob.rushFill(1);
            } else {
              blob.setTargetFill(pendingFillRef.current);
            }
            pendingFillRef.current = null;
            break;
          }
        }
      }

      blob.update();

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        isRunningRef.current = false;
        return;
      }

      drawLiquid(ctx, blob, blob.fill >= 0.999);

      if (blob.isSettled() && pendingFillRef.current === null) {
        isRunningRef.current = false;
      } else {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [itemId, glowArrivals]);

  // React to fill level changes
  useEffect(() => {
    const blob = blobRef.current;
    if (!blob) return;

    const prev = prevFillRef.current;
    prevFillRef.current = fillLevel;

    if (Math.abs(fillLevel - prev) < 0.001) return;

    if (fillLevel > prev) {
      // Fill increasing — queue it to apply on glow arrival
      pendingFillRef.current = fillLevel;
      startLoop();

      // Fallback: if no glow arrives within 500ms, apply anyway
      const timeout = setTimeout(() => {
        if (pendingFillRef.current !== null && blob) {
          if (pendingFillRef.current >= 1) {
            blob.rushFill(1);
          } else {
            blob.setTargetFill(pendingFillRef.current);
          }
          pendingFillRef.current = null;
          startLoop();
        }
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      // Fill decreasing — apply immediately (drain)
      if (fillLevel <= 0) {
        // Drain to empty: instant flush, no settling
        blob.flush();
      } else {
        blob.drain(fillLevel);
      }
      pendingFillRef.current = null;
      startLoop();
    }
  }, [fillLevel, startLoop]);

  // Handle checked state forcing fill to 1
  useEffect(() => {
    const blob = blobRef.current;
    if (!blob) return;

    if (isChecked && blob.targetFill < 0.99) {
      // Manual check — instant fill, no liquid animation
      blob.rushFill(1);
      pendingFillRef.current = null;
      startLoop();
    }

    if (!isChecked && blob.targetFill > fillLevel + 0.01) {
      if (fillLevel <= 0) {
        blob.flush();
      } else {
        blob.drain(fillLevel);
      }
      pendingFillRef.current = null;
      startLoop();
    }
  }, [isChecked, fillLevel, startLoop]);

  // Initial draw + redraw when accent color changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const blob = blobRef.current;
    if (!canvas || !blob) return;

    const ctx = canvas.getContext("2d");
    if (ctx) drawLiquid(ctx, blob, blob.fill >= 0.999);

    return () => {
      cancelAnimationFrame(rafRef.current);
      isRunningRef.current = false;
    };
  }, [accentColor]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      tabIndex={-1}
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
        position: "relative",
        overflow: "visible",
        opacity: isPutAside ? 0.35 : 1,
      }}
      aria-label={isChecked ? "Uncheck item" : "Check item"}
    >
      <SparkleOverlay trigger={sparkleTrigger} />
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: 3,
        }}
      />
      {isChecked && (
        <motion.svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.path
            d="M2 5 L4.5 7.5 L8 3"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
          />
        </motion.svg>
      )}
    </button>
  );
}

// ─── Main Export ───────────────────────────────────────────────

export default function LiquidCheckbox(props: LiquidCheckboxProps) {
  if (props.isLeaf) {
    return (
      <LeafCheckbox
        isChecked={props.isChecked}
        isPutAside={props.isPutAside}
        accentColor={props.accentColor}
        onClick={props.onClick}
      />
    );
  }

  return (
    <LiquidParentCheckbox
      fillLevel={props.fillLevel}
      isChecked={props.isChecked}
      isPutAside={props.isPutAside}
      itemId={props.itemId}
      glowArrivals={props.glowArrivals}
      accentColor={props.accentColor}
      onClick={props.onClick}
    />
  );
}

// ─── Canvas Drawing ───────────────────────────────────────────

function drawLiquid(ctx: CanvasRenderingContext2D, blob: ViscousBlob, isFull: boolean) {
  ctx.clearRect(0, 0, W, H);

  const canvas = ctx.canvas;
  const root = canvas.closest(".nt") || document.documentElement;
  const style = getComputedStyle(root);
  const bgColor = style.getPropertyValue("--nt-checkbox-bg").trim() || "#1a1a1a";
  const borderColor =
    style.getPropertyValue("--nt-checkbox-border").trim() || "#3a3a3a";
  const checkedColor =
    style.getPropertyValue("--nt-checkbox-checked").trim() || "#60a5fa";
  const glowColor = style.getPropertyValue("--nt-glow-color").trim() || "#ffffff";
  // Partial fill = glow color, full = blue checked color
  const liquidColor = isFull ? checkedColor : glowColor;
  const highlightColor = glowColor;

  // Background
  roundedRect(ctx, 0, 0, W, H, BORDER_RADIUS);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Liquid body
  const inset = CHECK_INSET;
  const innerW = W - inset * 2;
  const innerH = H - inset * 2;
  const baseY = inset + innerH * (1 - blob.fill);

  if (blob.fill > 0.001) {
    ctx.save();
    roundedRect(ctx, inset, inset, innerW, innerH, BORDER_RADIUS - 1);
    ctx.clip();

    const surface = blob.getSurface();

    ctx.beginPath();
    ctx.moveTo(inset, H - inset);

    for (let i = 0; i < surface.length; i++) {
      const { t, heightOffset, bulgeOffset } = surface[i];
      const x = inset + t * innerW;
      const y = baseY + heightOffset * innerH * 0.2 + bulgeOffset * innerH * 0.15;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prev = surface[i - 1];
        const px = inset + prev.t * innerW;
        const py =
          baseY +
          prev.heightOffset * innerH * 0.2 +
          prev.bulgeOffset * innerH * 0.15;
        ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
      }
    }

    const last = surface[surface.length - 1];
    ctx.lineTo(
      inset + innerW,
      baseY + last.heightOffset * innerH * 0.2 + last.bulgeOffset * innerH * 0.15
    );
    ctx.lineTo(inset + innerW, H - inset);
    ctx.closePath();

    ctx.fillStyle = liquidColor;

    if (!isFull) {
      // Glow effect for partial fill (glows like connector)
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12 * RES;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      // Second pass for bloom
      ctx.shadowBlur = 24 * RES;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      // Final solid pass
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9;
      ctx.fill();
    } else {
      ctx.fill();
    }

    // Surface highlight
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 2 * RES;
    ctx.globalAlpha = isFull ? 0.12 : 0.25;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let i = 0; i < surface.length; i++) {
      const { t, heightOffset, bulgeOffset } = surface[i];
      const x = inset + t * innerW;
      const y = baseY + heightOffset * innerH * 0.2 + bulgeOffset * innerH * 0.15;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prev = surface[i - 1];
        const px = inset + prev.t * innerW;
        const py =
          baseY +
          prev.heightOffset * innerH * 0.2 +
          prev.bulgeOffset * innerH * 0.15;
        ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // Border (drawn last, on top)
  roundedRect(ctx, 0.5, 0.5, W - 1, H - 1, BORDER_RADIUS);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5 * RES;
  ctx.stroke();
}
