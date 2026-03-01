"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vision, LedgerEntry } from "../lib/types";
import {
  fetchVisions,
  fetchLedgerEntries,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  updateVision,
  deleteVision,
} from "../lib/service";
import NewVisionModal from "./NewVisionModal";
import ShrineButton from "./ShrineButton";

// ─────────────────────────────────────────
// Radial Grid Background (Three.js)
// ─────────────────────────────────────────
import { initRadialGrid, type RadialGridAPI } from "../lib/radialGrid";

// Tuned 3D scene values (from control panel)
const GRID_3D = {
  posX: 13, posY: -28, posZ: 11,
  theta: 0.01, phi: 1.70, radius: 59,
  opacity: 0.6,
} as const;

// Thread line sits at 66% of the viewport
const THREAD_X_PERCENT = 0.66;

function RadialGridBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<RadialGridAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Init Three.js
  useEffect(() => {
    if (gridRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const grid = initRadialGrid(canvas);
      gridRef.current = grid;
      grid.setCamera({ theta: GRID_3D.theta, phi: GRID_3D.phi, radius: GRID_3D.radius });
      grid.setPosition(GRID_3D.posX, GRID_3D.posY, GRID_3D.posZ);
      grid.setOpacity(GRID_3D.opacity);
    } catch (err) {
      console.error("[RadialGridBg] Failed to init grid", err);
    }

    return () => {
      if (gridRef.current) {
        gridRef.current.destroy();
        gridRef.current = null;
      }
    };
  }, []);

  // Align grid center to thread line each frame
  useEffect(() => {
    let raf: number;
    let lastOffset = 0;
    const align = () => {
      const g = gridRef.current;
      const container = containerRef.current;
      if (g && container) {
        // Where the grid center currently projects to in the canvas (px from left of canvas)
        const projectedX = g.getProjectedCenterX();
        // Canvas fills the container which is 100vw wide, so projectedX is in viewport px
        // Thread target in viewport px
        const targetX = window.innerWidth * THREAD_X_PERCENT;
        // Shift the container so the projected center lands on the thread
        const offset = targetX - projectedX;
        if (Math.abs(offset - lastOffset) > 0.5) {
          container.style.left = `${offset}px`;
          lastOffset = offset;
        }
      }
      raf = requestAnimationFrame(align);
    };
    raf = requestAnimationFrame(align);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none overflow-hidden"
      style={{
        top: "50%",
        left: 0,
        width: "100vw",
        height: "100vh",
        transform: "translateY(-50%)",
      }}
    >
      <canvas
        ref={canvasRef}
        id="radial-grid-bg"
        className="w-full h-full"
      />
    </div>
  );
}

// ─────────────────────────────────────────
// Log Entry Modal (action / synchronicity)
// ─────────────────────────────────────────
function LogEntryModal({
  open,
  type,
  onClose,
  onSubmit,
}: {
  open: boolean;
  type: "action" | "synchronicity";
  onClose: () => void;
  onSubmit: (note: string, occurredAt: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  const isAction = type === "action";
  const accentColor = isAction
    ? "rgba(255, 170, 68, 0.3)"
    : "rgba(68, 170, 255, 0.3)";
  const borderColor = isAction
    ? "rgba(255, 170, 68, 0.2)"
    : "rgba(68, 170, 255, 0.2)";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onSubmit(note.trim(), new Date(occurredAt).toISOString());
    setSaving(false);
    setNote("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-md rounded-2xl p-6 pointer-events-auto"
              style={{
                background: "rgba(12, 10, 25, 0.95)",
                border: `1px solid ${borderColor}`,
                boxShadow: `0 0 60px ${accentColor}`,
              }}
            >
              <h3
                className="text-base font-tight font-semibold mb-4"
                style={{
                  color: isAction
                    ? "rgba(255, 190, 100, 0.9)"
                    : "rgba(100, 190, 255, 0.9)",
                }}
              >
                {isAction ? "Log Action" : "Log Synchronicity"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isAction
                      ? "What action did you take?"
                      : "What synchronicity did you notice?"
                  }
                  rows={3}
                  className="w-full text-sm text-white/90 placeholder-white/20 outline-none resize-none"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                  autoFocus
                />
                <div>
                  <label className="block text-white/30 text-xs mb-1.5">
                    When
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full text-sm text-white/80 outline-none"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 4,
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <ShrineButton variant="gray" type="button" onClick={onClose} className="flex-1">
                    Cancel
                  </ShrineButton>
                  <ShrineButton
                    variant={isAction ? "orange" : "blue"}
                    type="submit"
                    disabled={saving || !note.trim()}
                    className="flex-1"
                  >
                    {saving ? "Saving..." : "Log Entry"}
                  </ShrineButton>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// Entry Detail Modal (edit / delete)
// ─────────────────────────────────────────
function EntryDetailModal({
  entry,
  onClose,
  onUpdate,
  onDelete,
}: {
  entry: LedgerEntry;
  onClose: () => void;
  onUpdate: (id: string, note: string, occurredAt: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [note, setNote] = useState(entry.note);
  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date(entry.occurred_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAction = entry.type === "action";
  const accentColor = isAction
    ? "rgba(255, 170, 68, 0.3)"
    : "rgba(68, 170, 255, 0.3)";
  const borderColor = isAction
    ? "rgba(255, 170, 68, 0.2)"
    : "rgba(68, 170, 255, 0.2)";
  const textColor = isAction
    ? "rgba(255, 190, 100, 0.9)"
    : "rgba(100, 190, 255, 0.9)";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onUpdate(entry.id, note.trim(), new Date(occurredAt).toISOString());
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    setSaving(true);
    await onDelete(entry.id);
    setSaving(false);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-md rounded-2xl p-6 pointer-events-auto"
          style={{
            background: "rgba(12, 10, 25, 0.95)",
            border: `1px solid ${borderColor}`,
            boxShadow: `0 0 60px ${accentColor}`,
          }}
        >
          <h3
            className="text-base font-tight font-semibold mb-4"
            style={{ color: textColor }}
          >
            {isAction ? "Edit Action" : "Edit Synchronicity"}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full text-sm text-white/90 placeholder-white/20 outline-none resize-none"
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              autoFocus
            />
            <div>
              <label className="block text-white/30 text-xs mb-1.5">When</label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full text-sm text-white/80 outline-none"
                style={{
                  padding: "8px 12px",
                  borderRadius: 4,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  colorScheme: "dark",
                }}
              />
            </div>
            <div className="flex gap-3 pt-1">
              {/* Delete button */}
              {!confirmDelete ? (
                <ShrineButton
                  variant="red"
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </ShrineButton>
              ) : (
                <ShrineButton
                  variant="red"
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving ? "Deleting..." : "Confirm Delete"}
                </ShrineButton>
              )}

              <div className="flex-1" />

              <ShrineButton variant="gray" type="button" onClick={onClose}>
                Cancel
              </ShrineButton>
              <ShrineButton
                variant={isAction ? "orange" : "blue"}
                type="submit"
                disabled={saving || !note.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </ShrineButton>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────
// Thread Popup (choose action or synchronicity)
// ─────────────────────────────────────────
function ThreadPopup({
  x,
  y,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  onSelect: (type: "action" | "synchronicity") => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[55] flex gap-2"
        style={{ left: x + 16, top: y - 20 }}
      >
        <ShrineButton variant="orange" onClick={() => onSelect("action")}>
          Action
        </ShrineButton>
        <ShrineButton variant="blue" onClick={() => onSelect("synchronicity")}>
          Synchronicity
        </ShrineButton>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────
// Shared scroll velocity tracker
// ─────────────────────────────────────────
function useScrollVelocity(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const velocityRef = useRef(0);
  const lastScrollTop = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    lastScrollTop.current = el.scrollTop;
    lastTime.current = performance.now();

    // Decay velocity each frame
    let raf: number;
    const decay = () => {
      velocityRef.current *= 0.95; // friction
      if (Math.abs(velocityRef.current) < 0.01) velocityRef.current = 0;
      raf = requestAnimationFrame(decay);
    };
    raf = requestAnimationFrame(decay);

    const onScroll = () => {
      const now = performance.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        const dy = el.scrollTop - lastScrollTop.current;
        // Blend new velocity with existing for smoothness
        velocityRef.current = velocityRef.current * 0.6 + (dy / dt) * 0.4;
      }
      lastScrollTop.current = el.scrollTop;
      lastTime.current = now;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return velocityRef;
}

// ─────────────────────────────────────────
// Tag display mode
// ─────────────────────────────────────────
type TagMode = "ticket" | "classic" | "orb";

// ─────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

function entryColors(type: "action" | "synchronicity") {
  const isAction = type === "action";
  return {
    isAction,
    side: (isAction ? "left" : "right") as "left" | "right",
    color: isAction ? "rgba(255, 170, 68, 0.7)" : "rgba(100, 180, 255, 0.7)",
    glowColor: isAction ? "rgba(255, 170, 68, 0.3)" : "rgba(100, 180, 255, 0.3)",
    tagBg: isAction ? "rgba(255, 170, 68, 0.06)" : "rgba(100, 180, 255, 0.06)",
    tagBorder: isAction ? "rgba(255, 170, 68, 0.3)" : "rgba(100, 180, 255, 0.3)",
    textColor: isAction ? "rgba(255, 190, 100, 0.9)" : "rgba(130, 200, 255, 0.9)",
  };
}

// Orb shared between both modes
function SegmentOrb({ color, glowColor }: { color: string; glowColor: string }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: `radial-gradient(circle at center, rgba(255, 255, 255, 1) 0%, ${color} 40%, ${color} 100%)`,
        boxShadow: `0 0 6px ${color}, 0 0 14px ${glowColor}, 0 0 24px ${glowColor}`,
      }}
    />
  );
}

// ─────────────────────────────────────────
// CLASSIC mode — side-floating tags with curved strings
// ─────────────────────────────────────────
interface ClassicAnimState {
  mode: "classic";
  side: "left" | "right";
  phase: number;
  xJitter: number;
  yOffset: number;
  targetEndY: number;
  svgWidth: number;
  swingAngle: number;
  swingVel: number;
  pathEl: SVGPathElement | null;
  dotEl: SVGCircleElement | null;
  tagEl: HTMLDivElement | null;
}

const STRING_INSET = 8;
const SVG_WIDTH = 50;
const BASE_END_Y = 40;

// ─────────────────────────────────────────
// TICKET mode — tags as current-driven particles, strings follow
// ─────────────────────────────────────────
interface TicketAnimState {
  mode: "ticket";
  side: "left" | "right";
  phase: number;
  orbY: number;        // world Y of the orb (for flow field sampling)
  stringLen: number;
  // Tag particle position (relative to orb at 0,0)
  tx: number;
  ty: number;
  // Tag particle velocity
  vx: number;
  vy: number;
  pathEl: SVGPathElement | null;
  dotEl: SVGCircleElement | null;
  tagEl: HTMLDivElement | null;
}

const TICKET_STRING_LEN = 34;
const TICKET_TAG_H = 36; // mini tag height
const TICKET_TAG_W = 16;

// Underwater flow field — returns lateral force at a given (y, t)
// Spatially varying so tickets at different depths sway differently
function currentForce(y: number, t: number, phase: number): number {
  return (
    Math.sin(y * 0.008 + t * 0.3 + phase) * 0.018 +
    Math.sin(y * 0.02  + t * 0.7 + phase * 1.7) * 0.012 +
    Math.sin(y * 0.004 + t * 0.13 + phase * 0.4) * 0.025
  );
}

// ─────────────────────────────────────────
// ORB mode — orbiting orbs around the thread line
// ─────────────────────────────────────────
interface OrbAnimState {
  mode: "orb";
  side: "left" | "right";
  phase: number;         // random start angle
  orbY: number;          // Y position on thread (date-based)
  orbitRadius: number;   // distance from thread center
  orbitSpeed: number;    // radians per second
  angle: number;         // current orbit angle (radians)
  bobPhase: number;      // phase offset for vertical bob
  bobAmplitude: number;  // px of vertical bobbing
  el: HTMLDivElement | null;       // the orb element
  zoneEl: HTMLDivElement | null;   // the clickable orbit zone
  glowEl: HTMLDivElement | null;   // orbit ring visual
}

const ORB_BASE_RADIUS = 18;   // px — innermost orbit ring
const ORB_RING_STEP = 14;     // px — spacing between concentric orbits for same-date entries
const ORB_SIZE = 10;           // px — orb diameter
const ORB_BOB_BASE = 3;       // px — base vertical bobbing amplitude
const ORB_SPEED_BASE = 0.4;   // radians/sec — base orbit speed

// ── Unified anim state ──
type SegmentAnimState = ClassicAnimState | TicketAnimState | OrbAnimState;

// ── Shared animation loop — drives both modes ──
function useSegmentLoop(
  scrollVelocity: React.RefObject<number>,
  registry: React.RefObject<Map<string, SegmentAnimState>>,
) {
  useEffect(() => {
    let raf: number;
    const animate = () => {
      const t = performance.now() / 1000;
      const sv = scrollVelocity.current ?? 0;
      const scrollForce = sv * 8;

      registry.current.forEach((s) => {
        if (s.mode === "classic") {
          // ── Classic swing physics ──
          s.swingVel = (s.swingVel + scrollForce - s.swingAngle * 0.15) * 0.92;
          s.swingAngle += s.swingVel;
          s.swingAngle = Math.max(-25, Math.min(25, s.swingAngle));

          const lenFactor = 1 + s.yOffset * 0.003;
          const sway1 = (Math.sin(t * 1.2 + s.phase) * 6 + s.swingAngle * 0.5) * lenFactor;
          const sway2 = (Math.sin(t * 0.8 + s.phase + 1.5) * 4 + s.swingAngle * 0.3) * lenFactor;

          const bobY = s.targetEndY + Math.sin(t * 0.7 + s.phase + 0.8) * 3 + s.swingAngle * 0.4;
          const tagH = s.tagEl?.offsetHeight ?? 36;
          const tagTopY = bobY - tagH / 2;
          if (s.tagEl) {
            s.tagEl.style.transform = `translate(${s.xJitter}px, ${tagTopY}px)`;
          }

          const startX = s.side === "left" ? s.svgWidth : 0;
          const tagNearEdgeX = s.side === "left" ? s.xJitter : s.svgWidth + s.xJitter;
          const endX = s.side === "left" ? tagNearEdgeX - STRING_INSET : tagNearEdgeX + STRING_INSET;
          const midX = (startX + endX) / 2;
          const endY = bobY;
          const droopBase = 14 + s.yOffset * 0.3;
          const cp1Y = droopBase + sway1;
          const cp2Y = s.targetEndY * 0.6 + sway2;

          const d = `M ${startX} 0 C ${startX + (s.side === "left" ? -12 : 12)} ${cp1Y}, ${midX} ${cp2Y}, ${endX} ${endY}`;
          if (s.pathEl) s.pathEl.setAttribute("d", d);
          if (s.dotEl) {
            s.dotEl.setAttribute("cx", String(endX));
            s.dotEl.setAttribute("cy", String(endY));
          }
        } else if (s.mode === "ticket") {
          // ── Ticket: tag is a current-driven particle, string follows ──

          // Forces on the tag
          const flow = currentForce(s.orbY + s.ty, t, s.phase);
          const scrollPush = scrollForce * 0.15;
          const gravity = 0.06;

          // Apply forces to tag velocity
          s.vx += flow + scrollPush;
          s.vy += gravity;
          // Water damping
          s.vx *= 0.96;
          s.vy *= 0.96;

          // Move the tag particle
          s.tx += s.vx;
          s.ty += s.vy;

          // Keep tag below the orb
          if (s.ty < 4) { s.ty = 4; s.vy = Math.abs(s.vy) * 0.3; }

          // ── Tether: always taut — enforce exact string length ──
          const dist = Math.sqrt(s.tx * s.tx + s.ty * s.ty);
          if (dist > 0.01) {
            const ratio = s.stringLen / dist;
            s.tx *= ratio;
            s.ty *= ratio;
            // Remove outward velocity component (keep tangential motion)
            const nx = s.tx / s.stringLen;
            const ny = s.ty / s.stringLen;
            const radialVel = s.vx * nx + s.vy * ny;
            if (radialVel > 0) {
              s.vx -= radialVel * nx;
              s.vy -= radialVel * ny;
            }
          }

          // ── Tag rotation = tether angle (orb-to-tag direction) ──
          const tethAngle = Math.atan2(s.tx, s.ty); // angle from straight down

          // ── Position the tag ──
          if (s.tagEl) {
            s.tagEl.style.transform = `translate(${s.tx}px, ${s.ty}px) rotate(${tethAngle}rad)`;
          }

          // ── String: passive bezier from orb (0,0) to tag top-center ──
          // String ends exactly at the tag's pivot point (tx, ty)
          const endX = s.tx;
          const endY = s.ty;

          // Dot goes 4px INTO the tag along its rotated axis
          // The tag's "down" axis after rotation:
          const tagDirX = Math.sin(tethAngle);
          const tagDirY = Math.cos(tethAngle);
          const dotX = endX + tagDirX * 4;
          const dotY = endY + tagDirY * 4;

          // Curvature: string sags based on lateral velocity
          // Straight when still, bows when the tag is moving
          const sagAmount = Math.abs(s.vx) * 3;
          const sagDir = s.vx > 0 ? 1 : -1;

          const cp1x = endX * 0.33 + sagAmount * sagDir * 0.6;
          const cp1y = endY * 0.33;
          const cp2x = endX * 0.66 + sagAmount * sagDir * 0.3;
          const cp2y = endY * 0.66;

          const d = `M 0 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          if (s.pathEl) s.pathEl.setAttribute("d", d);

          if (s.dotEl) {
            s.dotEl.setAttribute("cx", String(dotX));
            s.dotEl.setAttribute("cy", String(dotY));
          }
        } else if (s.mode === "orb") {
          // ── Orb: orbit around the thread line ──
          const scrollPush = scrollForce * 0.08;

          // Advance orbit angle
          s.angle += s.orbitSpeed / 60 + scrollPush * 0.02;

          // Compute position on orbit ellipse (flattened for perspective)
          const ellipseRx = s.orbitRadius;
          const ellipseRy = s.orbitRadius * 0.35; // flatten for 3D look
          const ox = Math.cos(s.angle) * ellipseRx;
          const oy = Math.sin(s.angle) * ellipseRy;

          // Vertical bob
          const bob = Math.sin(t * 0.8 + s.bobPhase) * s.bobAmplitude;

          // Z-ordering: orbs in front (angle π/2 to 3π/2) vs behind thread
          const normalizedAngle = ((s.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const isBehind = normalizedAngle > Math.PI * 0.5 && normalizedAngle < Math.PI * 1.5;
          const depthScale = 0.7 + Math.sin(s.angle) * 0.3; // subtle size pulse for depth

          if (s.el) {
            s.el.style.transform = `translate(${ox}px, ${oy + bob}px) scale(${depthScale})`;
            s.el.style.opacity = isBehind ? "0.35" : "0.9";
            s.el.style.zIndex = isBehind ? "1" : "3";
          }

          // Update orbit ring visual
          if (s.glowEl) {
            s.glowEl.style.width = `${ellipseRx * 2}px`;
            s.glowEl.style.height = `${ellipseRy * 2}px`;
          }
        }
      });

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [scrollVelocity, registry]);
}

// ─────────────────────────────────────────
// ThreadSegment — delegates to Classic or Ticket visual
// ─────────────────────────────────────────
function ThreadSegment({
  entry,
  orbY,
  tagY,
  orbitIndex,
  registry,
  tagMode,
  onSelectEntry,
}: {
  entry: LedgerEntry;
  index: number;
  orbY: number;
  tagY: number;
  orbitIndex: number;
  registry: React.RefObject<Map<string, SegmentAnimState>>;
  tagMode: TagMode;
  onSelectEntry?: (entry: LedgerEntry) => void;
}) {
  const c = entryColors(entry.type);

  return (
    <div
      className="absolute"
      style={{ top: orbY, left: "66%", width: 0, height: 0 }}
    >
      {tagMode !== "orb" && (
        <SegmentOrb color={c.color} glowColor={c.glowColor} />
      )}

      {tagMode === "classic" ? (
        <ClassicTag entry={entry} orbY={orbY} tagY={tagY} registry={registry} colors={c} onSelect={onSelectEntry} />
      ) : tagMode === "ticket" ? (
        <TicketTag entry={entry} orbY={orbY} registry={registry} colors={c} />
      ) : (
        <OrbTag entry={entry} orbY={orbY} orbitIndex={orbitIndex} registry={registry} colors={c} onSelect={onSelectEntry} />
      )}
    </div>
  );
}

// ─── Classic tag (side-floating with curved string) ───
function ClassicTag({
  entry,
  orbY,
  tagY,
  registry,
  colors: c,
  onSelect,
}: {
  entry: LedgerEntry;
  orbY: number;
  tagY: number;
  registry: React.RefObject<Map<string, SegmentAnimState>>;
  colors: ReturnType<typeof entryColors>;
  onSelect?: (entry: LedgerEntry) => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  const yOffset = tagY - orbY;
  const targetEndY = BASE_END_Y + yOffset;
  const svgHeight = targetEndY + 30;

  const xJitter = useMemo(() => {
    const h = hashId(entry.id);
    return ((h % 31) - 15);
  }, [entry.id]);

  // Initial string path so it starts connected (resting position)
  const initStartX = c.side === "left" ? SVG_WIDTH : 0;
  const initEndX = c.side === "left"
    ? xJitter - STRING_INSET
    : SVG_WIDTH + xJitter + STRING_INSET;
  const initMidX = (initStartX + initEndX) / 2;
  const initD = `M ${initStartX} 0 C ${initStartX + (c.side === "left" ? -12 : 12)} ${14 + yOffset * 0.3}, ${initMidX} ${targetEndY * 0.6}, ${initEndX} ${targetEndY}`;

  useEffect(() => {
    const map = registry.current;
    const state: ClassicAnimState = {
      mode: "classic",
      side: c.side,
      phase: phaseRef.current,
      xJitter,
      yOffset,
      targetEndY,
      svgWidth: SVG_WIDTH,
      swingAngle: 0,
      swingVel: 0,
      pathEl: pathRef.current,
      dotEl: dotRef.current,
      tagEl: tagRef.current,
    };
    map.set(entry.id, state);
    return () => { map.delete(entry.id); };
  }, [entry.id, c.side, xJitter, yOffset, targetEndY, registry]);

  useEffect(() => {
    const s = registry.current.get(entry.id);
    if (s && s.mode === "classic") {
      s.pathEl = pathRef.current;
      s.dotEl = dotRef.current;
      s.tagEl = tagRef.current;
    }
  });

  return (
    <>
      <svg
        className="absolute overflow-visible pointer-events-none"
        width={SVG_WIDTH}
        height={svgHeight}
        style={{
          top: 0,
          [c.side === "left" ? "right" : "left"]: 0,
          filter: `drop-shadow(0 0 3px ${c.glowColor})`,
        }}
      >
        <path ref={pathRef} d={initD} fill="none" stroke={c.color} strokeWidth="1.2" strokeLinecap="round" opacity={0.6} />
        <circle ref={dotRef} r="2" cx={initEndX} cy={targetEndY} fill={c.color} opacity={0.8} />
      </svg>

      <div
        ref={tagRef}
        className="absolute cursor-pointer transition-opacity duration-200 hover:opacity-80"
        style={{
          top: 0,
          [c.side === "left" ? "right" : "left"]: SVG_WIDTH,
          width: 220,
          padding: "8px 11px",
          borderRadius: 4,
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
          background: c.tagBg,
          border: `0.5px solid ${c.tagBorder}`,
          boxShadow: `0 0 6px ${c.glowColor}`,
          willChange: "transform",
          pointerEvents: "auto",
          transform: `translate(${xJitter}px, ${targetEndY - 18}px)`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(entry);
        }}
      >
        <p className="text-xs leading-snug" style={{ color: c.textColor, textAlign: c.side === "left" ? "right" : "left" }}>
          {entry.note}
        </p>
      </div>
    </>
  );
}

// ─── Ticket tag (current-driven particle, string follows) ───
function TicketTag({
  entry,
  orbY,
  registry,
  colors: c,
}: {
  entry: LedgerEntry;
  orbY: number;
  registry: React.RefObject<Map<string, SegmentAnimState>>;
  colors: ReturnType<typeof entryColors>;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  const stringLen = useMemo(() => {
    const h = Math.abs(hashId(entry.id));
    return TICKET_STRING_LEN + (h % 12) - 6; // 28–40px variation
  }, [entry.id]);

  useEffect(() => {
    const map = registry.current;
    // Start tag hanging straight down with a tiny random offset
    const initX = (Math.random() - 0.5) * 2;
    const state: TicketAnimState = {
      mode: "ticket",
      side: c.side,
      phase: phaseRef.current,
      orbY,
      stringLen,
      tx: initX,
      ty: stringLen,
      vx: 0,
      vy: 0,
      pathEl: pathRef.current,
      dotEl: dotRef.current,
      tagEl: tagRef.current,
    };
    map.set(entry.id, state);
    return () => { map.delete(entry.id); };
  }, [entry.id, c.side, orbY, stringLen, registry]);

  useEffect(() => {
    const s = registry.current.get(entry.id);
    if (s && s.mode === "ticket") {
      s.pathEl = pathRef.current;
      s.dotEl = dotRef.current;
      s.tagEl = tagRef.current;
    }
  });

  return (
    <>
      {/* SVG string — hangs down from orb */}
      <svg
        className="absolute overflow-visible pointer-events-none"
        width="1"
        height="1"
        style={{
          top: 0,
          left: 0,
          filter: `drop-shadow(0 0 3px ${c.glowColor})`,
        }}
      >
        <path ref={pathRef} d={`M 0 0 L 0 ${stringLen}`} fill="none" stroke={c.color} strokeWidth="1.2" strokeLinecap="round" opacity={0.6} />
        <circle ref={dotRef} r="2" cx={0} cy={stringLen + 4} fill={c.color} opacity={0.8} />
      </svg>

      {/* Mini tag — same styling as classic, just compact and no text */}
      <div
        ref={tagRef}
        className="absolute"
        style={{
          top: 0,
          left: 0,
          transformOrigin: "top center",
          transform: `translate(0px, ${stringLen}px)`,
          willChange: "transform",
        }}
      >
        <div
          style={{
            width: 16,
            height: TICKET_TAG_H,
            borderRadius: 1,
            backdropFilter: "blur(1px)",
            WebkitBackdropFilter: "blur(1px)",
            background: c.tagBg,
            border: `0.5px solid ${c.tagBorder}`,
            boxShadow: `0 0 6px ${c.glowColor}`,
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </>
  );
}

// ─── Orb tag (orbiting around the thread) ───
function OrbTag({
  entry,
  orbY,
  orbitIndex,
  registry,
  colors: c,
  onSelect,
}: {
  entry: LedgerEntry;
  orbY: number;
  orbitIndex: number;   // 0-based index among same-date entries
  registry: React.RefObject<Map<string, SegmentAnimState>>;
  colors: ReturnType<typeof entryColors>;
  onSelect?: (entry: LedgerEntry) => void;
}) {
  const orbRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  const orbitRadius = ORB_BASE_RADIUS + orbitIndex * ORB_RING_STEP;
  const orbitSpeed = ORB_SPEED_BASE / (1 + orbitIndex * 0.25); // outer orbits slower

  useEffect(() => {
    const map = registry.current;
    const state: OrbAnimState = {
      mode: "orb",
      side: c.side,
      phase: phaseRef.current,
      orbY,
      orbitRadius,
      orbitSpeed,
      angle: phaseRef.current,
      bobPhase: phaseRef.current * 1.3,
      bobAmplitude: ORB_BOB_BASE + Math.random() * 2,
      el: orbRef.current,
      zoneEl: zoneRef.current,
      glowEl: glowRef.current,
    };
    map.set(entry.id, state);
    return () => { map.delete(entry.id); };
  }, [entry.id, c.side, orbY, orbitRadius, orbitSpeed, registry]);

  useEffect(() => {
    const s = registry.current.get(entry.id);
    if (s && s.mode === "orb") {
      s.el = orbRef.current;
      s.zoneEl = zoneRef.current;
      s.glowEl = glowRef.current;
    }
  });

  const ellipseRy = orbitRadius * 0.35;

  return (
    <>
      {/* Orbit ring — subtle ellipse path */}
      <div
        ref={glowRef}
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          width: orbitRadius * 2,
          height: ellipseRy * 2,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: `0.5px solid ${c.tagBorder}`,
          opacity: 0.25,
        }}
      />

      {/* Clickable orbit zone — ring-shaped hit area */}
      <div
        ref={zoneRef}
        className="absolute cursor-pointer"
        style={{
          top: "50%",
          left: "50%",
          width: orbitRadius * 2 + 16,
          height: ellipseRy * 2 + 16,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          zIndex: 4,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(entry);
        }}
        title={entry.note}
      />

      {/* The orbiting orb itself */}
      <div
        ref={orbRef}
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          width: ORB_SIZE,
          height: ORB_SIZE,
          marginLeft: -ORB_SIZE / 2,
          marginTop: -ORB_SIZE / 2,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, ${c.color} 40%, ${c.glowColor} 100%)`,
          boxShadow: `0 0 8px ${c.color}, 0 0 16px ${c.glowColor}, 0 0 28px ${c.glowColor}`,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────
// Thread notches (days + months)
// ─────────────────────────────────────────
function ThreadNotches({
  totalDays,
  pxPerDay,
  scrollRef,
}: {
  totalDays: number;
  pxPerDay: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drive scroll-active state via CSS variable directly on DOM — no React re-render
  useEffect(() => {
    const el = scrollRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const onScrollStart = () => {
      container.style.setProperty("--scroll-active", "1");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        container.style.setProperty("--scroll-active", "0");
      }, 150);
    };

    el.addEventListener("wheel", onScrollStart, { passive: true });
    el.addEventListener("touchmove", onScrollStart, { passive: true });
    el.addEventListener("scroll", onScrollStart, { passive: true });
    return () => {
      el.removeEventListener("wheel", onScrollStart);
      el.removeEventListener("touchmove", onScrollStart);
      el.removeEventListener("scroll", onScrollStart);
      if (timer) clearTimeout(timer);
    };
  }, [scrollRef]);

  // Generate notches from today (day 0) down to totalDays ago
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const notches: { y: number; isMonth: boolean; label: string; fade: number }[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const date = new Date(todayDay.getTime() - d * MS_PER_DAY);
    const y = d * pxPerDay;
    const isMonth = date.getDate() === 1;
    const label = isMonth
      ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : String(date.getDate());
    // Fade near the end of the thread
    const fade = d < totalDays - 5 ? 1.0 : Math.max(0.1, (totalDays - d) / 5);
    notches.push({ y, isMonth, label, fade });
  }

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none thread-notches"
      style={{ left: "66%", top: 0, height: totalDays * pxPerDay, ["--scroll-active" as string]: "0" }}
    >
      {notches.map((n, i) => {
        const rx = n.isMonth ? 10 : 6;
        const ry = n.isMonth ? 3 : 2;
        const svgW = rx * 2 + 2;
        const svgH = ry * 2 + 2;
        const cx = svgW / 2;
        const cy = svgH / 2;
        const ringColor = "rgba(160, 140, 255, 0.25)";
        const ringColorTop = "rgba(160, 140, 255, 0.2)";
        const ringColorObscured = "rgba(160, 140, 255, 0.1)";
        const sw = n.isMonth ? 1.2 : 0.8;

        // Thread is 2px wide, centered at cx. Compute ellipse points where thread edges intersect top arc.
        // Ellipse: ((x-cx)/rx)^2 + ((y-cy)/ry)^2 = 1
        // At x = cx ± 1: y = cy - ry * sqrt(1 - (1/rx)^2)
        const threadHalf = 1;
        const xFrac = threadHalf / rx;
        const topY = xFrac < 1 ? cy - ry * Math.sqrt(1 - xFrac * xFrac) : cy;
        const leftEdgeX = cx - threadHalf;
        const rightEdgeX = cx + threadHalf;

        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: n.y,
              left: 0,
              transform: "translate(-50%, -50%)",
              opacity: n.fade,
            }}
          >
            {/* 3D ring — bottom (front), top sides (behind), top center (obscured by thread) */}
            <svg
              width={svgW}
              height={svgH}
              className={`overflow-visible ${n.isMonth ? "notch-month" : "notch-day"}`}
              style={{ display: "block" }}
            >
              {/* Bottom arc (in front of thread) — brightest */}
              <path
                d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`}
                fill="none"
                stroke={ringColor}
                strokeWidth={sw}
              />
              {/* Top-left arc (behind thread, visible) */}
              <path
                d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${leftEdgeX} ${topY}`}
                fill="none"
                stroke={ringColorTop}
                strokeWidth={sw}
              />
              {/* Top-center arc (obscured by thread) */}
              <path
                d={`M ${leftEdgeX} ${topY} A ${rx} ${ry} 0 0 1 ${rightEdgeX} ${topY}`}
                fill="none"
                stroke={ringColorObscured}
                strokeWidth={sw}
              />
              {/* Top-right arc (behind thread, visible) */}
              <path
                d={`M ${rightEdgeX} ${topY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
                fill="none"
                stroke={ringColorTop}
                strokeWidth={sw}
              />
            </svg>
            {/* Label — positioned to the right of the ring */}
            <span
              className={`absolute whitespace-nowrap select-none ${n.isMonth ? "label-month" : "label-day"}`}
              style={{
                left: rx + (n.isMonth ? 16 : 12),
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: n.isMonth ? 14 : 11,
                color: "rgba(160, 140, 255, 0.35)",
              }}
            >
              {n.label}
            </span>
          </div>
        );
      })}
      <style>{`
        .thread-notches svg.notch-month,
        .thread-notches svg.notch-day {
          opacity: 0.7;
          transition: opacity 2.5s ease;
        }
        .thread-notches[style*="--scroll-active: 1"] svg.notch-month,
        .thread-notches[style*="--scroll-active:1"] svg.notch-month,
        .thread-notches[style*="--scroll-active: 1"] svg.notch-day,
        .thread-notches[style*="--scroll-active:1"] svg.notch-day {
          opacity: 0.9;
          transition: opacity 0s;
        }
        .thread-notches .label-month,
        .thread-notches .label-day {
          opacity: 0.5;
          transition: opacity 2.5s ease;
        }
        .thread-notches[style*="--scroll-active: 1"] .label-month,
        .thread-notches[style*="--scroll-active:1"] .label-month,
        .thread-notches[style*="--scroll-active: 1"] .label-day,
        .thread-notches[style*="--scroll-active:1"] .label-day {
          opacity: 0.9;
          transition: opacity 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────
// Thread particle systems
// ─────────────────────────────────────────
type ParticleMode = "off" | "stardust" | "embers" | "fireflies" | "aurora" | "snow";

interface ParticleConfig {
  size: number;       // 0-2 multiplier on base size
  count: number;      // 0-3 multiplier on base count
  radius: number;     // 0-2 multiplier on orbit radius
  bokeh: number;      // 0-1 fraction of particles that get bokeh
  opacity: number;    // 0-1 global opacity multiplier
  speed: number;      // 0-2 speed multiplier
  tinyRatio: number;  // 0-1 fraction of extra ultra-tiny particles
}

const defaultParticleConfig: ParticleConfig = {
  size: 0.5,
  count: 4,
  radius: 0.5,
  bokeh: 0.3,
  opacity: 1,
  speed: 1,
  tinyRatio: 0.5,
};

interface Particle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  phase: number;
  life: number;
  maxLife: number;
  hue: number;
  isBokeh: boolean;
  isTiny: boolean;
}

function ThreadParticles({
  mode,
  scrollRef,
  config,
  threadLength,
  debugCountRef,
}: {
  mode: ParticleMode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  config: ParticleConfig;
  threadLength: number;
  debugCountRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (mode === "off") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const el = scrollRef.current;

    // Canvas covers the full content area — it scrolls natively with the DOM
    const resize = () => {
      const dpr = window.devicePixelRatio;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const canvasH = () => canvas.offsetHeight;
    const threadX = () => W() * 0.66;
    // Thread zone: Y=0 is top of this canvas, threadLength is the total span
    const tTop = 0;
    const tBot = threadLength;

    function spawnParticle(cfg: ParticleConfig): Particle {
      const tx = threadX();
      const isTiny = Math.random() < cfg.tinyRatio;
      const isBokeh = Math.random() < cfg.bokeh;
      const modeRadius = 8 + Math.random() * 20;
      const baseSize = 0.5 + Math.random() * 1.5;
      const tinyRadius = modeRadius * (1 + Math.random() * 0.5);

      return {
        x: tx,
        y: tTop + Math.random() * threadLength,
        angle: Math.random() * Math.PI * 2,
        radius: (isTiny ? tinyRadius : modeRadius) * cfg.radius,
        speed: (0.3 + Math.random() * 0.5) * cfg.speed,
        size: isTiny ? 0.5 + Math.random() * 0.5 : baseSize * cfg.size,
        opacity: 0,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 200 + Math.random() * 300,
        hue: 250 + Math.random() * 40,
        isBokeh,
        isTiny,
      };
    }

    const baseCount = 40;
    const mainCount = Math.round(baseCount * config.count);
    const tinyCount = Math.round(mainCount * config.tinyRatio);
    const totalCount = mainCount + tinyCount;
    particlesRef.current = Array.from({ length: totalCount }, () => {
      const p = spawnParticle(config);
      p.life = Math.random() * p.maxLife;
      return p;
    });

    let raf: number;
    const animate = () => {
      const cfg = configRef.current;
      const cH = canvasH();
      ctx.clearRect(0, 0, W(), cH);
      const tx = threadX();

      // Viewport culling: figure out which Y range is visible
      const scroll = el ? el.scrollTop : 0;
      const viewH = el ? el.clientHeight : cH;
      // Canvas top is offset from scroll container top by paddingTop (25vh)
      const padTop = viewH * 0.25;
      const visibleTop = scroll - padTop - 30;
      const visibleBot = scroll - padTop + viewH + 30;

      const particles = particlesRef.current;
      for (let pi = 0; pi < particles.length; pi++) {
        const p = particles[pi];
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(p.life / 30, 1);
        const fadeOut = Math.max(1 - (p.life - p.maxLife * 0.7) / (p.maxLife * 0.3), 0);
        p.opacity = fadeIn * (lifeRatio > 0.7 ? fadeOut : 1) * cfg.opacity;

        // Stardust physics — all in content-space (canvas coords)
        p.angle += 0.015 * p.speed;
        p.y += 0.3 * p.speed;
        const twinkle = 0.5 + Math.sin(p.life * 0.1 + p.phase) * 0.5;
        p.x = tx + Math.cos(p.angle) * p.radius;

        // Wrap within thread zone
        if (p.y > tBot) p.y = tTop + (p.y - tBot);
        if (p.y < tTop) p.y = tBot - (tTop - p.y);

        // Skip if not in visible viewport region
        if (p.y < visibleTop || p.y > visibleBot) {
          if (p.life >= p.maxLife) {
            Object.assign(p, spawnParticle(cfg));
          }
          continue;
        }

        // Draw directly at content-space coords — canvas scrolls natively
        // Only 10% of particles get shadow blur (expensive) — the rest draw plain
        const hasGlow = pi % 10 === 0;
        if (hasGlow) {
          const bokehBlur = p.isBokeh ? 3 + p.size * 2 : 0;
          ctx.shadowBlur = bokehBlur || 6;
          ctx.shadowColor = `hsla(${p.hue}, 70%, 75%, ${p.opacity * twinkle * 0.2})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 75%, ${p.opacity * twinkle * (p.isBokeh ? 0.2 : 0.4)})`;
        ctx.fill();
        if (hasGlow) ctx.shadowBlur = 0;

        if (p.life >= p.maxLife) {
          Object.assign(p, spawnParticle(cfg));
        }
      }

      // Write live particle count to debug element
      if (debugCountRef?.current) {
        debugCountRef.current.textContent = String(particles.length);
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode, scrollRef, config.count, config.tinyRatio, threadLength, debugCountRef]);

  if (mode === "off") return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-x-0 top-0 pointer-events-none"
      style={{ width: "100%", height: threadLength }}
    />
  );
}

// ─────────────────────────────────────────
// Particle control panel
// ─────────────────────────────────────────
function ParticlePanel({
  mode,
  onModeChange,
  config,
  onConfigChange,
}: {
  mode: ParticleMode;
  onModeChange: (m: ParticleMode) => void;
  config: ParticleConfig;
  onConfigChange: (c: ParticleConfig) => void;
}) {
  const modes: { value: ParticleMode; label: string }[] = [
    { value: "off", label: "Off" },
    { value: "stardust", label: "Stardust" },
    { value: "embers", label: "Embers" },
    { value: "fireflies", label: "Fireflies" },
    { value: "aurora", label: "Aurora" },
    { value: "snow", label: "Snow" },
  ];

  const sliders: { key: keyof ParticleConfig; label: string; min: number; max: number; step: number }[] = [
    { key: "size", label: "Size", min: 0.1, max: 2, step: 0.1 },
    { key: "count", label: "Density", min: 0.5, max: 4, step: 0.25 },
    { key: "radius", label: "Radius", min: 0.1, max: 2, step: 0.1 },
    { key: "bokeh", label: "Bokeh %", min: 0, max: 1, step: 0.05 },
    { key: "opacity", label: "Opacity", min: 0.1, max: 1, step: 0.05 },
    { key: "speed", label: "Speed", min: 0.1, max: 3, step: 0.1 },
    { key: "tinyRatio", label: "Tiny %", min: 0, max: 1, step: 0.05 },
  ];

  return (
    <div
      className="absolute bottom-5 right-5 z-30 flex flex-col gap-1 p-3 rounded-xl"
      style={{
        background: "rgba(12, 10, 25, 0.9)",
        border: "1px solid rgba(160, 140, 255, 0.1)",
        backdropFilter: "blur(12px)",
        width: 200,
        maxHeight: "80vh",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      <span className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(160, 140, 255, 0.4)" }}>
        Particles
      </span>
      <div className="flex flex-wrap gap-1 mb-2">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className="px-2 py-1 rounded-md text-[10px] cursor-pointer transition-all duration-150"
            style={{
              background: mode === m.value ? "rgba(160, 140, 255, 0.15)" : "transparent",
              color: mode === m.value ? "rgba(200, 180, 255, 0.9)" : "rgba(255, 255, 255, 0.3)",
              border: mode === m.value ? "1px solid rgba(160, 140, 255, 0.2)" : "1px solid transparent",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode !== "off" && (
        <>
          <div className="w-full h-px mb-1" style={{ background: "rgba(160, 140, 255, 0.08)" }} />
          {sliders.map((s) => (
            <div key={s.key} className="flex flex-col gap-0.5 mb-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px]" style={{ color: "rgba(160, 140, 255, 0.5)" }}>{s.label}</span>
                <span className="text-[9px] tabular-nums" style={{ color: "rgba(200, 180, 255, 0.7)" }}>
                  {config[s.key].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={config[s.key]}
                onChange={(e) => onConfigChange({ ...config, [s.key]: parseFloat(e.target.value) })}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgba(160, 140, 255, 0.4) ${((config[s.key] - s.min) / (s.max - s.min)) * 100}%, rgba(255, 255, 255, 0.06) ${((config[s.key] - s.min) / (s.max - s.min)) * 100}%)`,
                  accentColor: "rgba(160, 140, 255, 0.8)",
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Thread width control panel
// ─────────────────────────────────────────
type ThreadWidths = { staticLine: number; baseGlow: number; pulseLine: number; pulseGlow: number };

const THREAD_WIDTH_STEPS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5];
const THREAD_WIDTH_LABELS: { key: keyof ThreadWidths; label: string }[] = [
  { key: "staticLine", label: "Thread" },
  { key: "baseGlow", label: "Base glow" },
  { key: "pulseLine", label: "Pulse" },
  { key: "pulseGlow", label: "Pulse glow" },
];

function ThreadWidthPanel({
  widths,
  onChange,
}: {
  widths: ThreadWidths;
  onChange: (w: ThreadWidths) => void;
}) {
  return (
    <div
      className="absolute bottom-5 right-5 z-30 flex flex-col gap-2 p-3 rounded-xl"
      style={{
        background: "rgba(12, 10, 25, 0.9)",
        border: "1px solid rgba(160, 140, 255, 0.1)",
        backdropFilter: "blur(12px)",
        width: 180,
      }}
    >
      <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(160, 140, 255, 0.4)" }}>
        Thread widths
      </span>
      {THREAD_WIDTH_LABELS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[9px]" style={{ color: "rgba(160, 140, 255, 0.5)" }}>{label}</span>
            <span className="text-[9px] tabular-nums" style={{ color: "rgba(200, 180, 255, 0.7)" }}>
              {widths[key]}px
            </span>
          </div>
          <div className="flex gap-1">
            {THREAD_WIDTH_STEPS.map((v) => (
              <button
                key={v}
                onClick={() => onChange({ ...widths, [key]: v })}
                className="flex-1 py-0.5 rounded text-[8px] tabular-nums cursor-pointer transition-all duration-150"
                style={{
                  background: widths[key] === v ? "rgba(160, 140, 255, 0.2)" : "transparent",
                  color: widths[key] === v ? "rgba(200, 180, 255, 0.9)" : "rgba(255, 255, 255, 0.25)",
                  border: widths[key] === v ? "1px solid rgba(160, 140, 255, 0.25)" : "1px solid transparent",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// Energy thread — pulsing white core inside the timeline thread
// ─────────────────────────────────────────
function ThreadEnergyLine({
  scrollRef,
  threadLength,
  baseGlowWidth,
  pulseLineWidth,
  pulseGlowWidth,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  threadLength: number;
  baseGlowWidth: number;
  pulseLineWidth: number;
  pulseGlowWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const el = scrollRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const canvasH = () => canvas.offsetHeight;
    // Thread zone: Y=0 to threadLength (canvas is sized to match)
    const tTop = 0;
    const tBot = threadLength;

    // Energy pulses traveling down the thread
    interface Pulse {
      y: number;       // content-space Y (0 = thread start)
      speed: number;   // px per frame
      length: number;  // trail length in px
      opacity: number; // peak brightness
      width: number;   // line width
    }

    const pulses: Pulse[] = [];
    const spawnPulse = (): Pulse => ({
      y: tTop,
      speed: 1 + Math.random() * 0.1,
      length: 20 + Math.random() * 50,
      opacity: 0.4 + Math.random() * 0.5,
      width: pulseLineWidth,
    });

    // Start with pulses evenly spread across thread zone
    const initCount = Math.ceil(threadLength / 120);
    for (let i = 0; i < initCount; i++) {
      const p = spawnPulse();
      p.y = tTop + (i / initCount) * threadLength;
      pulses.push(p);
    }

    // Heartbeat rhythm: ~65 BPM = ~55 frames/beat at 60fps
    // Each beat is a double-pulse (lub-dub), then a rest
    // Phase 0: strong pulse (systole "lub") at frame 0
    // Phase 1: softer pulse (diastole "dub") at ~12 frames later (~200ms)
    // Phase 2: rest until next cycle (~55 frames total)
    const BASE_CYCLE = 450;  // frames per heartbeat (~7.5s = ~8 BPM)
    const DUB_DELAY = 33;    // frames between lub and dub (~550ms)
    let beatFrame = 0;
    let cycleLength = BASE_CYCLE + Math.round((Math.random() - 0.5) * 10); // ±5 frame jitter per cycle
    let raf: number;

    const spawnBeat = (strong: boolean) => {
      const p = spawnPulse();
      if (!strong) {
        // Dub is softer — lower opacity, slightly shorter trail
        p.opacity *= 0.55;
        p.length *= 0.7;
      }
      // Tiny speed variation per beat: ±5%
      p.speed *= 0.95 + Math.random() * 0.1;
      pulses.push(p);
    };

    const animate = () => {
      const cH = canvasH();
      ctx.clearRect(0, 0, W(), cH);
      const threadX = W() * 0.66;

      // Viewport culling
      const scroll = el ? el.scrollTop : 0;
      const viewH = el ? el.clientHeight : cH;
      const padTop = viewH * 0.25;
      const visibleTop = scroll - padTop - 30;
      const visibleBot = scroll - padTop + viewH + 30;

      // Heartbeat spawn: lub at frame 0, dub at DUB_DELAY
      beatFrame++;
      if (beatFrame === 1) {
        spawnBeat(true); // lub (strong)
      } else if (beatFrame === DUB_DELAY) {
        spawnBeat(false); // dub (soft)
      } else if (beatFrame >= cycleLength) {
        beatFrame = 0;
        // Re-randomize next cycle: ±5 frames drift (~54-64 BPM range)
        cycleLength = BASE_CYCLE + Math.round((Math.random() - 0.5) * 10);
      }

      // Hard clip to canvas bounds (thread zone)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W(), threadLength);
      ctx.clip();

      // Base glow — constant faint white line, fading over last 100px
      const baseTop = Math.max(0, visibleTop);
      const baseBot = Math.min(threadLength, visibleBot);
      if (baseBot > baseTop) {
        const baseGrad = ctx.createLinearGradient(threadX, Math.max(baseTop, threadLength - 100), threadX, threadLength);
        baseGrad.addColorStop(0, "rgba(255, 255, 255, 0.06)");
        baseGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.moveTo(threadX, baseTop);
        ctx.lineTo(threadX, Math.min(baseBot, threadLength - 100));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = baseGlowWidth;
        ctx.stroke();

        if (baseBot > threadLength - 100) {
          ctx.beginPath();
          ctx.moveTo(threadX, Math.max(baseTop, threadLength - 100));
          ctx.lineTo(threadX, baseBot);
          ctx.strokeStyle = baseGrad;
          ctx.lineWidth = baseGlowWidth;
          ctx.stroke();
        }
      }

      // Draw each pulse — all coords are content-space (canvas scrolls natively)
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.y += p.speed;

        // Remove if past thread bottom
        if (p.y - p.length > tBot) {
          pulses.splice(i, 1);
          continue;
        }

        const head = p.y;
        const tail = p.y - p.length;

        // Skip if entirely outside visible viewport
        if (head < visibleTop || tail > visibleBot) continue;

        // Clamp to thread zone
        const drawTop = Math.max(tail, tTop);
        const drawBot = Math.min(head, tBot);
        if (drawBot <= drawTop) continue;

        // Gradient along the pulse
        const grad = ctx.createLinearGradient(threadX, drawTop, threadX, drawBot);
        const totalLen = head - tail;
        if (totalLen <= 0) continue;

        // Fade out over the last 100px of thread
        const fadeZone = 100;
        const distFromBot = tBot - head;
        const bottomFade = distFromBot < fadeZone ? Math.max(0, distFromBot / fadeZone) : 1;
        const op = p.opacity * bottomFade;

        const tailFrac = Math.max(0, (drawTop - tail) / totalLen);

        grad.addColorStop(0, `rgba(255, 255, 255, ${op * 0.0 * (1 - tailFrac)})`);
        grad.addColorStop(0.3, `rgba(255, 255, 255, ${op * 0.3})`);
        grad.addColorStop(0.85, `rgba(255, 255, 255, ${op * 0.9})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${op * 0.15})`);

        // Main pulse line
        ctx.beginPath();
        ctx.moveTo(threadX, drawTop);
        ctx.lineTo(threadX, drawBot);
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.width;
        ctx.stroke();

        // Glow around the pulse
        ctx.beginPath();
        ctx.moveTo(threadX, drawTop);
        ctx.lineTo(threadX, drawBot);
        ctx.strokeStyle = grad;
        ctx.lineWidth = pulseGlowWidth;
        ctx.globalAlpha = 0.15;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [scrollRef, threadLength, baseGlowWidth, pulseLineWidth, pulseGlowWidth]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-x-0 top-0 pointer-events-none"
      style={{ width: "100%", height: threadLength }}
    />
  );
}

// ─────────────────────────────────────────
// Today disc — pulsing glowing rings at the termination point
// ─────────────────────────────────────────
function TodayDisc() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 100;
    const dpr = window.devicePixelRatio;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;

    // Expanding ring state — each ring only grows and fades out
    const NUM_RINGS = 4;
    const RING_CYCLE = 3.5; // seconds per full cycle
    const rings = Array.from({ length: NUM_RINGS }, (_, i) => ({
      birth: -((i / NUM_RINGS) * RING_CYCLE), // stagger start times
    }));

    let raf: number;
    const animate = () => {
      const t = performance.now() / 1000;
      ctx.clearRect(0, 0, size, size);

      // Core glow (radial gradient) — always visible
      const corePulse = 0.5 + Math.sin(t * 2.2) * 0.5;
      const coreRadius = 3 + corePulse * 1.5;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 4);
      glow.addColorStop(0, `rgba(200, 180, 255, ${0.25 + corePulse * 0.15})`);
      glow.addColorStop(0.4, `rgba(160, 140, 255, ${0.1 + corePulse * 0.05})`);
      glow.addColorStop(1, "rgba(160, 140, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Expanding rings — each grows outward from core and fades out
      for (const ring of rings) {
        const age = ((t - ring.birth) % RING_CYCLE + RING_CYCLE) % RING_CYCLE;
        const progress = age / RING_CYCLE; // 0 → 1

        // Radius grows from 3 to 35 (wide expanding rings)
        const radius = 3 + progress * 32;

        // Opacity: fade in quickly, then fade out as it expands
        const fadeIn = Math.min(progress / 0.1, 1);
        const fadeOut = Math.max(0, 1 - (progress - 0.15) / 0.85);
        const alpha = fadeIn * fadeOut * 0.6;

        if (alpha > 0.01) {
          const ry = radius * 0.35;
          const topAlpha = alpha * 0.3; // dimmer top half (like notch rings)
          const botAlpha = alpha;       // full brightness bottom half

          // Glow halo — bottom arc (bright)
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius, ry, 0, 0, Math.PI);
          ctx.strokeStyle = `rgba(160, 140, 255, ${botAlpha * 0.3})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          // Glow halo — top arc (dim)
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius, ry, 0, Math.PI, Math.PI * 2);
          ctx.strokeStyle = `rgba(160, 140, 255, ${topAlpha * 0.3})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Crisp ring — bottom arc (bright)
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius, ry, 0, 0, Math.PI);
          ctx.strokeStyle = `rgba(180, 160, 255, ${botAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Crisp ring — top arc (dim)
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius, ry, 0, Math.PI, Math.PI * 2);
          ctx.strokeStyle = `rgba(180, 160, 255, ${topAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Core ellipse ring (flattened like the notch rings)
      ctx.beginPath();
      ctx.ellipse(cx, cy, coreRadius, coreRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220, 200, 255, ${0.3 + corePulse * 0.25})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Tiny white-hot center dot
      const dotPulse = 0.6 + Math.sin(t * 3) * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + dotPulse * 0.4})`;
      ctx.fill();

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: "66%", top: 0, transform: "translate(-50%, -50%)", zIndex: 8 }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: 100, height: 100 }}
      />
      {/* Today label — offset to the right of the rings */}
      <span
        className="absolute whitespace-nowrap select-none"
        style={{
          left: 90,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 11,
          color: "rgba(160, 140, 255, 0.5)",
          letterSpacing: "0.05em",
        }}
      >
        Today
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// Date-based layout constants
// ─────────────────────────────────────────
const PX_PER_DAY = 20;
const DEFAULT_THREAD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────
// Main ShrineScreen
// ─────────────────────────────────────────
export default function ShrineScreen({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [logType, setLogType] = useState<"action" | "synchronicity" | null>(null);
  const [threadPopup, setThreadPopup] = useState<{ x: number; y: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingVision, setEditingVision] = useState(false);
  const [editOverlayPresent, setEditOverlayPresent] = useState(false); // true while overlay is visible or exiting
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDeleteVision, setConfirmDeleteVision] = useState(false);
  const [particleMode, setParticleMode] = useState<ParticleMode>("stardust");
  const [particleConfig, setParticleConfig] = useState<ParticleConfig>(defaultParticleConfig);
  const [threadWidths, setThreadWidths] = useState({
    staticLine: 0.5,
    baseGlow: 0.25,
    pulseLine: 0.5,
    pulseGlow: 1,
  });
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const scrollVelocity = useScrollVelocity(threadScrollRef);

  // Debug: live particle count
  const particleCountRef = useRef<HTMLSpanElement>(null);

  // Tag display mode
  const [tagMode, setTagMode] = useState<TagMode>("classic");
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  // Shared animation loop for all thread segment strings
  const segmentRegistry = useRef<Map<string, SegmentAnimState>>(new Map());
  useSegmentLoop(scrollVelocity, segmentRegistry);


  const currentVision = visions[currentIndex] ?? null;

  // ── Date-based layout computation ──
  const { threadLength, totalDays, dayToY } = useMemo(() => {
    const today = new Date();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayMs = todayDay.getTime();

    let days = DEFAULT_THREAD_DAYS;
    if (entries.length > 0) {
      const earliestMs = Math.min(
        ...entries.map((e) => {
          const d = new Date(e.occurred_at);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        })
      );
      const daysToEarliest = Math.round((todayMs - earliestMs) / MS_PER_DAY) + 3;
      days = Math.max(DEFAULT_THREAD_DAYS, daysToEarliest);
    }

    const length = days * PX_PER_DAY;

    const toY = (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const daysAgo = Math.round((todayMs - entryDay.getTime()) / MS_PER_DAY);
      return Math.max(0, daysAgo * PX_PER_DAY);
    };

    return { threadLength: length, totalDays: days, dayToY: toY };
  }, [entries]);

  // Resolve overlapping same-type tags — entries on the same side of the
  // thread need vertical spacing so their tags don't stack on top of each
  // other. We group by type (action=left, synchronicity=right), sort by
  // raw Y, then nudge any entries closer than MIN_TAG_GAP apart.
  const resolvedPositions = useMemo(() => {
    const MIN_TAG_GAP = 55; // px — note-only tag height + breathing room
    const map = new Map<string, number>();

    // Split into two groups by type (each type hangs on its own side)
    const groups: Record<string, { id: string; rawY: number }[]> = {
      action: [],
      synchronicity: [],
    };

    for (const entry of entries) {
      const rawY = dayToY(entry.occurred_at);
      groups[entry.type]?.push({ id: entry.id, rawY });
    }

    // For each group, sort by rawY (ascending = closer to today first)
    // then walk downward, pushing any entry that's too close to the
    // previous one further down the thread.
    for (const group of Object.values(groups)) {
      group.sort((a, b) => a.rawY - b.rawY);
      let prevY = -Infinity;
      for (const item of group) {
        const resolvedY = Math.max(item.rawY, prevY + MIN_TAG_GAP);
        map.set(item.id, resolvedY);
        prevY = resolvedY;
      }
    }

    return map;
  }, [entries, dayToY]);

  // Compute orbit index per entry — entries sharing the same date get
  // incrementing orbit indices so they each have their own ring distance
  const orbitIndices = useMemo(() => {
    const map = new Map<string, number>();
    // Group entries by their date (day-level)
    const dateGroups = new Map<string, string[]>();
    for (const entry of entries) {
      const d = new Date(entry.occurred_at);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!dateGroups.has(dateKey)) dateGroups.set(dateKey, []);
      dateGroups.get(dateKey)!.push(entry.id);
    }
    for (const ids of dateGroups.values()) {
      ids.forEach((id, i) => map.set(id, i));
    }
    return map;
  }, [entries]);

  // Load visions
  const loadVisions = useCallback(async () => {
    try {
      const v = await fetchVisions();
      setVisions(v);
    } catch (err) {
      console.error("Failed to load visions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisions();
  }, [loadVisions]);

  // Load entries when vision changes
  useEffect(() => {
    if (!currentVision) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    fetchLedgerEntries(currentVision.id).then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => { cancelled = true; };
  }, [currentVision?.id]);

  // Navigation
  const navigate = useCallback(
    (dir: number) => {
      if (visions.length <= 1) return;
      setThreadOpen(false);
      setThreadPopup(null);
      setHovered(false);
      setDirection(dir);
      setCurrentIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return visions.length - 1;
        if (next >= visions.length) return 0;
        return next;
      });
    },
    [visions.length]
  );

  // Thread click
  const handleThreadClick = useCallback(
    (e: React.MouseEvent) => {
      if (!threadOpen) return;
      setThreadPopup({ x: e.clientX, y: e.clientY });
    },
    [threadOpen]
  );

  // Log entry
  const handleLogEntry = useCallback(
    async (note: string, occurredAt: string) => {
      if (!logType || !currentVision) return;
      const entry = await createLedgerEntry(
        currentVision.id,
        logType,
        note,
        occurredAt
      );
      setEntries((prev) => [entry, ...prev]);

      // Auto-scroll to the new entry's date position after layout updates
      const d = new Date(occurredAt);
      const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const today = new Date();
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysAgo = Math.round((todayDay.getTime() - entryDay.getTime()) / MS_PER_DAY);
      const targetScroll = Math.max(0, daysAgo * PX_PER_DAY);

      setTimeout(() => {
        threadScrollRef.current?.scrollTo({ top: targetScroll, behavior: "smooth" });
      }, 100);
    },
    [logType, currentVision]
  );

  // Update ledger entry
  const handleUpdateEntry = useCallback(
    async (id: string, note: string, occurredAt: string) => {
      const updated = await updateLedgerEntry(id, { note, occurred_at: occurredAt });
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    []
  );

  // Delete ledger entry
  const handleDeleteEntry = useCallback(
    async (id: string) => {
      await deleteLedgerEntry(id);
      segmentRegistry.current.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    []
  );

  // Vision created
  const handleCreated = useCallback(
    (v: Vision) => {
      setVisions((prev) => [v, ...prev]);
      setCurrentIndex(0);
      setThreadOpen(false);
    },
    []
  );

  // Open thread
  const handleTitleClick = useCallback(() => {
    if (!currentVision) return;
    setThreadOpen(true);
  }, [currentVision]);

  // Close thread
  const handleCloseThread = useCallback(() => {
    setThreadOpen(false);
    setThreadPopup(null);
  }, []);

  // ── Slide animation variants ──
  // Enter distance: 150px from the direction of travel
  // Exit distance: 150px in the opposite direction
  // Exit: 0.2s linear (darts away, no easing)
  // Enter: 0.35s with easeOut (decelerates into landing)
  // First load: 1.5s fade-up from 20px below
  const ENTER_DISTANCE = 150;   // px — how far entering vision travels
  const EXIT_DISTANCE = 300;    // px — how far exiting vision travels (2x enter = looks fast)
  const ENTER_DURATION = 0.2;   // seconds — entering vision
  const EXIT_DURATION = 0.1;    // seconds — leaving vision
  const hasNavigated = useRef(false);
  const slideVariants = {
    enter: (dir: number) => {
      if (!hasNavigated.current) {
        return { x: 0, y: 10, opacity: 0 };
      }
      return { x: dir >= 0 ? ENTER_DISTANCE : -ENTER_DISTANCE, y: 0, opacity: 0 };
    },
    center: {
      x: 0,
      y: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir >= 0 ? -EXIT_DISTANCE : EXIT_DISTANCE,
      y: 0,
      opacity: 0,
      transition: { duration: EXIT_DURATION, ease: [0, 0, 1, 1] as const },
    }),
  };

  // ── Render ──
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* RadialGridBg moved into threadOpen block below */}

      {/* ── Title / MindShrine ── */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-sm font-tight font-semibold tracking-widest uppercase"
        style={{ color: "rgba(255, 255, 255, 0.2)" }}
      >
        MindShrine
      </motion.h1>

      {/* ── Logout ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onLogout}
        className="absolute top-5 right-5 z-20 text-sm font-medium cursor-pointer"
        style={{
          borderRadius: 4,
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 12,
          paddingRight: 12,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          color: "rgba(255, 255, 255, 0.4)",
        }}
        whileHover={{
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "rgba(255, 255, 255, 0.7)",
        }}
      >
        Logout
      </motion.button>

      {/* ── Empty state ── */}
      {!loading && visions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <ShrineButton variant="purple" onClick={() => setModalOpen(true)}>
            Add Your First Vision
          </ShrineButton>
        </motion.div>
      )}

      {/* ── Vision display ── */}
      {!loading && currentVision && (
        <>
          {/* ── Ghostly thread (hover hint, behind everything) ── */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-[1px] pointer-events-none z-0"
            style={{
              top: "10%",
              bottom: "10%",
              background: "linear-gradient(to bottom, transparent, rgba(160, 140, 255, var(--thread-opacity)), transparent)",
            }}
            initial={false}
            animate={{
              "--thread-opacity": threadOpen ? 0 : hovered ? 0.08 : 0,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {/* ── Radial grid bg (timeline only) ── */}
          <AnimatePresence>
            {threadOpen && (
              <motion.div
                key="radial-grid-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 z-[1] pointer-events-none"
              >
                <RadialGridBg />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Tag mode toggle (only when thread open) ── */}
          <AnimatePresence>
            {threadOpen && (
              <motion.div
                key="tag-mode-toggle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="absolute bottom-5 left-5 z-30 flex gap-1"
                style={{ pointerEvents: "auto" }}
              >
                {(["orb", "ticket", "classic"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      segmentRegistry.current.clear();
                      setTagMode(mode);
                    }}
                    className="px-3 py-1.5 rounded-md text-[10px] tracking-wide uppercase cursor-pointer transition-all duration-200"
                    style={{
                      background: tagMode === mode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${tagMode === mode ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                      color: tagMode === mode ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scrollable thread area (only when open) ── */}
          <AnimatePresence>
            {threadOpen && (
              <motion.div
                ref={threadScrollRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {/* Scroll container — today at 25vh, past extends down */}
                <div
                  className="relative mx-auto"
                  style={{
                    width: "100%",
                    paddingTop: "25vh",
                    paddingBottom: "10vh",
                  }}
                >
                  {/* Inner thread area — date-proportional layout */}
                  <div className="relative" style={{ height: threadLength }}>
                    {/* ── Add entry button above thread ── */}
                    <div
                      className="absolute flex items-center justify-center"
                      style={{ left: "66%", top: -44, transform: "translateX(-50%)", zIndex: 30 }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setThreadPopup({ x: e.clientX, y: e.clientY });
                        }}
                        className="group relative flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-all duration-200 hover:scale-110"
                        style={{
                          background: "rgba(139, 92, 246, 0.15)",
                          border: "1px solid rgba(139, 92, 246, 0.25)",
                          boxShadow: "0 0 12px rgba(139, 92, 246, 0.08)",
                        }}
                      >
                        <span
                          className="text-xs font-light leading-none transition-colors duration-200"
                          style={{ color: "rgba(200, 180, 255, 0.7)" }}
                        >
                          +
                        </span>
                      </button>
                    </div>

                    {/* Pulsing disc at today (termination point) */}
                    <TodayDisc />

                    {/* Canvas overlays — absolute inside content, scroll natively with DOM */}
                    <ThreadParticles mode={particleMode} scrollRef={threadScrollRef} config={particleConfig} threadLength={threadLength} debugCountRef={particleCountRef} />
                    <ThreadEnergyLine scrollRef={threadScrollRef} threadLength={threadLength} baseGlowWidth={threadWidths.baseGlow} pulseLineWidth={threadWidths.pulseLine} pulseGlowWidth={threadWidths.pulseGlow} />

                    {/* Thread line — from today (top) into the past (bottom) */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: "66%",
                        top: 0,
                        bottom: -30,
                        width: threadWidths.staticLine,
                        transform: "translateX(-50%)",
                        background: `linear-gradient(to bottom, rgba(160, 140, 255, 0.2) 0%, rgba(160, 140, 255, 0.35) 3%, rgba(160, 140, 255, 0.35) calc(100% - 130px), transparent 100%)`,
                      }}
                    />

                    {/* Day/month notches */}
                    <ThreadNotches totalDays={totalDays} pxPerDay={PX_PER_DAY} scrollRef={threadScrollRef} />

                    {/* Entries — absolutely positioned at their date locations */}
                    {entries.map((entry, i) => (
                      <ThreadSegment
                        key={`${tagMode}-${entry.id}`}
                        entry={entry}
                        index={i}
                        orbY={dayToY(entry.occurred_at)}
                        tagY={resolvedPositions.get(entry.id) ?? dayToY(entry.occurred_at)}
                        orbitIndex={orbitIndices.get(entry.id) ?? 0}
                        registry={segmentRegistry}
                        tagMode={tagMode}
                        onSelectEntry={setSelectedEntry}
                      />
                    ))}

                    {entries.length === 0 && (
                      <p
                        className="absolute text-white/15 text-xs tracking-wide"
                        style={{ top: 60, left: "66%", transform: "translateX(-50%)" }}
                      >
                        Click the thread to log your first entry
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Title + Description (slides left when thread opens) ── */}
          <motion.div
            className="relative z-20 flex flex-col max-w-2xl px-8"
            animate={{
              x: threadOpen ? "-25vw" : 0,
              opacity: editOverlayPresent ? 0 : threadOpen ? 0.8 : 1,
              alignItems: threadOpen ? "flex-start" : "center",
            }}
            transition={{ duration: editOverlayPresent ? 0.3 : 0.5, ease: "easeOut" }}
          >
            {/* Vision title carousel + edit icon */}
            <div className="relative flex items-center gap-3">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.h2
                  key={currentVision.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: hasNavigated.current ? ENTER_DURATION : 0.75, ease: hasNavigated.current ? [0, 0, 0.2, 1] : [0, 0, 0.58, 1] }}
                  onAnimationComplete={() => { hasNavigated.current = true; }}
                  className="text-xl md:text-2xl font-semibold cursor-pointer select-none leading-tight"
                  style={{
                    textAlign: threadOpen ? "left" : "center",
                    fontFamily: "var(--font-crimson-pro), serif",
                    fontWeight: 200,
                    color: "rgba(255, 255, 255, 0.85)",
                    textShadow: hovered
                      ? `0 0 40px hsla(${currentVision.color_hue}, 60%, 60%, 0.5), 0 0 80px hsla(${currentVision.color_hue}, 60%, 50%, 0.25)`
                      : `0 0 20px hsla(${currentVision.color_hue}, 50%, 50%, 0.2)`,
                    transition: "text-shadow 0.4s ease",
                  }}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => {
                    if (!threadOpen) setHovered(false);
                  }}
                  onClick={handleTitleClick}
                >
                  {currentVision.title}
                </motion.h2>
              </AnimatePresence>

              {/* Edit icon — only visible in timeline view */}
              {threadOpen && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  whileHover={{ opacity: 0.7 }}
                  transition={{ duration: 0.3 }}
                  className="shrink-0 cursor-pointer"
                  style={{ background: "none", border: "none", padding: 4 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTitle(currentVision.title);
                    setEditDescription(currentVision.description ?? "");
                    setConfirmDeleteVision(false);
                    setEditingVision(true);
                    setEditOverlayPresent(true);
                  }}
                  title="Edit vision"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(200, 180, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
                  </svg>
                </motion.button>
              )}
            </div>

            {/* Description (absolute so it doesn't push title, inherits flex alignment) */}
            <div className="relative" style={{ height: 0 }}>
              <AnimatePresence>
                {(hovered || threadOpen) && currentVision.description && !editOverlayPresent && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 0.4, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.35 }}
                    className="absolute top-4 text-sm leading-relaxed"
                    style={{
                      color: "rgba(255, 255, 255, 0.5)",
                      textAlign: threadOpen ? "left" : "center",
                      width: 400,
                      left: threadOpen ? 0 : -200,
                    }}
                  >
                    {currentVision.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Fulfilled badge */}
            {currentVision.is_fulfilled && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: `hsla(${currentVision.color_hue}, 60%, 30%, 0.3)`,
                  color: `hsla(${currentVision.color_hue}, 70%, 70%, 0.8)`,
                  border: `1px solid hsla(${currentVision.color_hue}, 60%, 40%, 0.2)`,
                }}
              >
                Fulfilled
              </motion.span>
            )}
          </motion.div>

          {/* ── Navigation arrows ── */}
          {visions.length > 1 && !threadOpen && (
            <>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => navigate(-1)}
                className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </motion.button>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => navigate(1)}
                className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </motion.button>
            </>
          )}

          {/* ── Back button (when thread is open) ── */}
          <AnimatePresence>
            {threadOpen && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                onClick={handleCloseThread}
                className="absolute top-5 left-5 z-20 text-sm font-medium cursor-pointer"
                style={{
                  borderRadius: 4,
                  paddingTop: 4,
                  paddingBottom: 4,
                  paddingLeft: 12,
                  paddingRight: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  color: "rgba(255, 255, 255, 0.4)",
                }}
                whileHover={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                &larr; Back
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Vision counter ── */}
          {visions.length > 1 && !threadOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-1.5"
            >
              {visions.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i === currentIndex
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(255, 255, 255, 0.1)",
                  }}
                />
              ))}
            </motion.div>
          )}

          {/* Thread width panel removed — widths locked in */}

          {/* ── Vision edit overlay ── */}
          <AnimatePresence onExitComplete={() => setEditOverlayPresent(false)}>
            {editingVision && currentVision && (
              <>
                {/* Backdrop — fades everything else away */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 z-[50]"
                  style={{ background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)" }}
                />

                {/* Centered edit form — delayed so left title fades out first */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, delay: 0.25, ease: "easeOut" }}
                  className="absolute inset-0 z-[51] flex items-center justify-center pointer-events-none"
                >
                  <div className="flex flex-col items-center gap-6 w-full max-w-lg px-8 pointer-events-auto">
                    {/* Title input */}
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      className="w-full text-center text-xl md:text-2xl bg-transparent outline-none"
                      style={{
                        fontFamily: "var(--font-crimson-pro), serif",
                        fontWeight: 200,
                        padding: "8px 12px",
                        borderRadius: 4,
                        color: "rgba(255, 255, 255, 0.85)",
                        borderBottom: "1px solid rgba(160, 140, 255, 0.2)",
                        caretColor: "rgba(160, 140, 255, 0.6)",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingVision(false);
                        }
                      }}
                    />

                    {/* Description textarea */}
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      placeholder="Description (optional)"
                      className="w-full text-center text-sm bg-transparent outline-none resize-none"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 4,
                        color: "rgba(255, 255, 255, 0.5)",
                        borderBottom: "1px solid rgba(160, 140, 255, 0.1)",
                        lineHeight: 1.6,
                        caretColor: "rgba(160, 140, 255, 0.6)",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingVision(false);
                        }
                      }}
                    />

                    {/* Save / Cancel / Delete buttons */}
                    <div className="flex gap-4 mt-2">
                      <ShrineButton variant="gray" onClick={() => setEditingVision(false)}>
                        Cancel
                      </ShrineButton>
                      <ShrineButton
                        variant="purple"
                        disabled={editSaving || !editTitle.trim()}
                        onClick={async () => {
                          if (!editTitle.trim()) return;
                          setEditSaving(true);
                          try {
                            const updated = await updateVision(currentVision.id, {
                              title: editTitle.trim(),
                              description: editDescription.trim() || null,
                            });
                            setVisions((prev) =>
                              prev.map((v) => (v.id === updated.id ? updated : v))
                            );
                            setEditingVision(false);
                          } catch (err) {
                            console.error("Failed to update vision:", err);
                          } finally {
                            setEditSaving(false);
                          }
                        }}
                      >
                        {editSaving ? "Saving..." : "Save"}
                      </ShrineButton>
                    </div>

                    {/* Delete vision */}
                    <div className="flex justify-center mt-4">
                      {!confirmDeleteVision ? (
                        <ShrineButton
                          variant="red"
                          onClick={() => setConfirmDeleteVision(true)}
                        >
                          Delete Vision
                        </ShrineButton>
                      ) : (
                        <ShrineButton
                          variant="red"
                          disabled={editSaving}
                          onClick={async () => {
                            setEditSaving(true);
                            try {
                              await deleteVision(currentVision.id);
                              setVisions((prev) =>
                                prev.filter((v) => v.id !== currentVision.id)
                              );
                              // Adjust index if we deleted the last one
                              setCurrentIndex((idx) =>
                                idx >= visions.length - 1 ? Math.max(0, visions.length - 2) : idx
                              );
                              setEditingVision(false);
                              setThreadOpen(false);
                            } catch (err) {
                              console.error("Failed to delete vision:", err);
                            } finally {
                              setEditSaving(false);
                              setConfirmDeleteVision(false);
                            }
                          }}
                        >
                          {editSaving ? "Deleting..." : "Confirm Delete"}
                        </ShrineButton>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── + New Vision button ── */}
      {!loading && visions.length > 0 && !threadOpen && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onClick={() => setModalOpen(true)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-sm font-medium cursor-pointer"
          style={{
            borderRadius: 4,
            paddingTop: 4,
            paddingBottom: 4,
            paddingLeft: 12,
            paddingRight: 12,
            background: "rgba(139, 92, 246, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            color: "rgba(200, 180, 255, 0.9)",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.08)",
          }}
          whileHover={{
            background: "rgba(139, 92, 246, 0.25)",
            border: "1px solid rgba(139, 92, 246, 0.35)",
            color: "rgba(220, 200, 255, 1)",
            boxShadow: "0 0 24px rgba(139, 92, 246, 0.2)",
          }}
        >
          + New Vision
        </motion.button>
      )}

      {/* ── Thread popup ── */}
      <AnimatePresence>
        {threadPopup && (
          <ThreadPopup
            x={threadPopup.x}
            y={threadPopup.y}
            onSelect={(type) => {
              setLogType(type);
              setThreadPopup(null);
            }}
            onClose={() => setThreadPopup(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Log entry modal ── */}
      {logType && (
        <LogEntryModal
          open={!!logType}
          type={logType}
          onClose={() => setLogType(null)}
          onSubmit={handleLogEntry}
        />
      )}

      {/* ── Entry Detail Modal (edit / delete) ── */}
      <AnimatePresence>
        {selectedEntry && (
          <EntryDetailModal
            key={selectedEntry.id}
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onUpdate={handleUpdateEntry}
            onDelete={handleDeleteEntry}
          />
        )}
      </AnimatePresence>

      {/* ── New Vision Modal ── */}
      <NewVisionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />

      {/* Debug: live particle count */}
      <div
        className="fixed bottom-4 right-4 pointer-events-none"
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "monospace",
          zIndex: 9999,
        }}
      >
        particles: <span ref={particleCountRef}>0</span>
      </div>

    </div>
  );
}
