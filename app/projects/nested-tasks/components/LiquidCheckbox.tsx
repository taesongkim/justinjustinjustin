"use client";

import { useRef, useEffect, useCallback, RefObject } from "react";
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

// ─── Leaf Checkbox ────────────────────────────────────────────

function LeafCheckbox({
  isChecked,
  isPutAside,
  onClick,
}: {
  isChecked: boolean;
  isPutAside?: boolean;
  onClick: () => void;
}) {
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
        opacity: isPutAside ? 0.35 : 1,
      }}
      aria-label={isChecked ? "Uncheck item" : "Check item"}
    >
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
  onClick,
}: {
  fillLevel: number;
  isChecked: boolean;
  isPutAside?: boolean;
  itemId: string;
  glowArrivals: RefObject<Map<string, number[]>>;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<ViscousBlob | null>(null);
  const rafRef = useRef<number>(0);
  const prevFillRef = useRef<number>(fillLevel);
  const processedArrivalsRef = useRef<Set<number>>(new Set());
  const pendingFillRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

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
            blob.setTargetFill(pendingFillRef.current);
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

      drawLiquid(ctx, blob);

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
          blob.setTargetFill(pendingFillRef.current);
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
      blob.snapTo(1);
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

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const blob = blobRef.current;
    if (!canvas || !blob) return;

    const ctx = canvas.getContext("2d");
    if (ctx) drawLiquid(ctx, blob);

    return () => {
      cancelAnimationFrame(rafRef.current);
      isRunningRef.current = false;
    };
  }, []);

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
        opacity: isPutAside ? 0.35 : 1,
      }}
      aria-label={isChecked ? "Uncheck item" : "Check item"}
    >
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
      onClick={props.onClick}
    />
  );
}

// ─── Canvas Drawing ───────────────────────────────────────────

function drawLiquid(ctx: CanvasRenderingContext2D, blob: ViscousBlob) {
  ctx.clearRect(0, 0, W, H);

  const canvas = ctx.canvas;
  const root = canvas.closest(".nt") || document.documentElement;
  const style = getComputedStyle(root);
  const bgColor = style.getPropertyValue("--nt-checkbox-bg").trim() || "#1a1a1a";
  const borderColor =
    style.getPropertyValue("--nt-checkbox-border").trim() || "#3a3a3a";
  const liquidColor =
    style.getPropertyValue("--nt-checkbox-checked").trim() || "#60a5fa";
  const highlightColor = "#ffffff";

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
    ctx.fill();

    // Surface highlight
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 2 * RES;
    ctx.globalAlpha = 0.12;
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
