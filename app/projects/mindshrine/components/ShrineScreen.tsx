"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vision, LedgerEntry } from "../lib/types";
import {
  fetchVisions,
  fetchLedgerEntries,
  createLedgerEntry,
  updateVision,
} from "../lib/service";
import NewVisionModal from "./NewVisionModal";

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
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/20 outline-none resize-none"
                  style={{
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
                    className="w-full px-4 py-2 rounded-xl text-sm text-white/80 outline-none"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !note.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: accentColor,
                      border: `1px solid ${borderColor}`,
                      color: "rgba(255, 255, 255, 0.85)",
                    }}
                  >
                    {saving ? "Saving..." : "Log Entry"}
                  </button>
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
        <button
          onClick={() => onSelect("action")}
          className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:scale-105"
          style={{
            background: "rgba(255, 170, 68, 0.15)",
            border: "1px solid rgba(255, 170, 68, 0.2)",
            color: "rgba(255, 190, 100, 0.9)",
            boxShadow: "0 0 20px rgba(255, 170, 68, 0.08)",
          }}
        >
          Action
        </button>
        <button
          onClick={() => onSelect("synchronicity")}
          className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:scale-105"
          style={{
            background: "rgba(68, 170, 255, 0.15)",
            border: "1px solid rgba(68, 170, 255, 0.2)",
            color: "rgba(130, 200, 255, 0.9)",
            boxShadow: "0 0 20px rgba(68, 170, 255, 0.08)",
          }}
        >
          Synchronicity
        </button>
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
// Thread segment with unified string + tag physics
// ─────────────────────────────────────────
function ThreadSegment({
  entry,
  index,
  topY,
  scrollVelocity,
}: {
  entry: LedgerEntry;
  index: number;
  topY: number;
  scrollVelocity: React.RefObject<number>;
}) {
  const isAction = entry.type === "action";
  const side = isAction ? "left" : "right";
  const color = isAction ? "rgba(255, 170, 68, 0.7)" : "rgba(100, 180, 255, 0.7)";
  const solidColor = isAction ? "rgba(255, 170, 68, 1)" : "rgba(100, 180, 255, 1)";
  const glowColor = isAction ? "rgba(255, 170, 68, 0.3)" : "rgba(100, 180, 255, 0.3)";
  const tagBg = isAction ? "rgba(255, 170, 68, 0.06)" : "rgba(100, 180, 255, 0.06)";
  const tagBorder = isAction ? "rgba(255, 170, 68, 0.3)" : "rgba(100, 180, 255, 0.3)";
  const dateColor = isAction ? "rgba(255, 190, 100, 0.5)" : "rgba(130, 200, 255, 0.5)";

  const date = new Date(entry.occurred_at);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDayYear = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formatted = `${weekday} | ${monthDayYear}`;

  const pathRef = useRef<SVGPathElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  const svgWidth = 70;
  const svgHeight = 60;

  // Single rAF loop drives both string shape and tag position
  // Scroll velocity feeds into the physics for realistic swing
  const swingAngle = useRef(0);
  const swingVel = useRef(0);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      const t = performance.now() / 1000;
      const phase = phaseRef.current;

      // Feed scroll velocity into swing physics (spring-damper)
      const sv = scrollVelocity.current ?? 0;
      const scrollForce = sv * 8; // scale scroll velocity to swing force
      const springK = 0.15; // spring stiffness (pulls back to center)
      const damping = 0.92; // friction
      swingVel.current = (swingVel.current + scrollForce - swingAngle.current * springK) * damping;
      swingAngle.current += swingVel.current;
      // Clamp to prevent wild swings
      swingAngle.current = Math.max(-25, Math.min(25, swingAngle.current));

      // String physics — scroll adds to sway and droop
      const sway1 = Math.sin(t * 1.2 + phase) * 6 + swingAngle.current * 0.5;
      const sway2 = Math.sin(t * 0.8 + phase + 1.5) * 4 + swingAngle.current * 0.3;
      const droop = 14 + Math.sin(t * 0.5 + phase) * 3 + Math.abs(swingAngle.current) * 0.3;

      // Anchor at thread side, endpoint where tag attaches
      const startX = side === "left" ? svgWidth : 0;
      const endX = side === "left" ? 4 : svgWidth - 4;
      const midX = (startX + endX) / 2;

      // Endpoint Y — scroll velocity adds vertical lag
      const endY = svgHeight / 2 + Math.sin(t * 0.7 + phase + 0.8) * 3 + swingAngle.current * 0.4;

      const startY = 0;
      const d = `M ${startX} ${startY} C ${startX + (side === "left" ? -10 : 10)} ${droop + sway1}, ${midX} ${droop + sway2}, ${endX} ${endY}`;

      if (pathRef.current) {
        pathRef.current.setAttribute("d", d);
      }

      // Move tag to match string endpoint
      if (tagRef.current) {
        const tagY = endY;
        tagRef.current.style.transform = `translateY(${tagY}px)`;
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [side, svgHeight, scrollVelocity]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      className="absolute"
      style={{ top: topY, left: "66%", width: 0, height: 0 }}
    >
      {/* Center glowing orb on the thread */}
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

      {/* Dangling string + floating tag */}
      <div
        className="absolute"
        style={{
          top: "50%",
          [side === "left" ? "right" : "left"]: "50%",
          [side === "left" ? "left" : "right"]: "auto",
          display: "flex",
          flexDirection: side === "left" ? "row-reverse" : "row",
          alignItems: "flex-start",
          marginLeft: side === "right" ? 2 : undefined,
          marginRight: side === "left" ? 2 : undefined,
        }}
      >
        {/* SVG dangling string */}
        <svg
          width={svgWidth}
          height={svgHeight}
          className="overflow-visible"
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})`, flexShrink: 0 }}
        >
          <path
            ref={pathRef}
            fill="none"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.6}
          />
        </svg>

        {/* Floating tag — Y driven by string endpoint */}
        <div
          ref={tagRef}
          style={{
            width: 220,
            flexShrink: 0,
            padding: "8px 11px",
            borderRadius: 4,
            background: tagBg,
            border: `0.5px solid ${tagBorder}`,
            boxShadow: `0 0 6px ${glowColor}`,
            willChange: "transform",
          }}
        >
          <p className="text-[9px]" style={{ color: dateColor, textAlign: side === "left" ? "right" : "left" }}>
            {formatted}
          </p>
          <p className="text-[9px] my-1" style={{ color: dateColor, textAlign: side === "left" ? "right" : "left" }}>
            -
          </p>
          <p className="text-xs leading-snug" style={{ color: isAction ? "rgba(255, 190, 100, 0.9)" : "rgba(130, 200, 255, 0.9)", textAlign: side === "left" ? "right" : "left" }}>
            {entry.note}
          </p>
        </div>
      </div>
    </motion.div>
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
          opacity: 0.3;
          transition: opacity 2.5s ease;
        }
        .thread-notches[style*="--scroll-active: 1"] .label-month,
        .thread-notches[style*="--scroll-active:1"] .label-month,
        .thread-notches[style*="--scroll-active: 1"] .label-day,
        .thread-notches[style*="--scroll-active:1"] .label-day {
          opacity: 0.8;
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
}: {
  mode: ParticleMode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  config: ParticleConfig;
  threadLength: number;
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

      for (const p of particlesRef.current) {
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
        const bokehBlur = p.isBokeh ? 3 + p.size * 2 : 0;
        ctx.shadowBlur = bokehBlur || 6;
        ctx.shadowColor = `hsla(${p.hue}, 70%, 75%, ${p.opacity * twinkle * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 75%, ${p.opacity * twinkle * (p.isBokeh ? 0.2 : 0.4)})`;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.life >= p.maxLife) {
          Object.assign(p, spawnParticle(cfg));
        }
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode, scrollRef, config.count, config.tinyRatio, threadLength]);

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
      speed: 3.5 + Math.random() * 0.5,
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
    const BASE_CYCLE = 109;  // frames per heartbeat (~1.82s = ~33 BPM)
    const DUB_DELAY = 11;    // frames between lub and dub (~180ms)
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
        return { x: 0, y: 20, opacity: 0 };
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
        className="absolute top-5 right-5 z-20 px-3 py-1.5 rounded-lg text-xs text-white/25 hover:text-white/50 transition-colors cursor-pointer"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
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
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-4 rounded-2xl text-base font-tight font-medium tracking-wide cursor-pointer transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))",
              border: "1px solid rgba(139, 92, 246, 0.15)",
              color: "rgba(200, 180, 255, 0.8)",
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.08)",
            }}
          >
            Add Your First Vision
          </button>
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
                onClick={handleThreadClick}
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
                    {/* Pulsing disc at today (termination point) */}
                    <TodayDisc />

                    {/* Canvas overlays — absolute inside content, scroll natively with DOM */}
                    <ThreadParticles mode={particleMode} scrollRef={threadScrollRef} config={particleConfig} threadLength={threadLength} />
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
                    <AnimatePresence initial={false}>
                      {entries.map((entry, i) => (
                        <ThreadSegment
                          key={entry.id}
                          entry={entry}
                          index={i}
                          topY={dayToY(entry.occurred_at)}
                          scrollVelocity={scrollVelocity}
                        />
                      ))}
                    </AnimatePresence>

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
                  transition={{ duration: hasNavigated.current ? ENTER_DURATION : 1.5, ease: hasNavigated.current ? [0, 0, 0.2, 1] : [0, 0, 0.58, 1] }}
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
                className="absolute top-5 left-5 z-20 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
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
                        color: "rgba(255, 255, 255, 0.85)",
                        borderBottom: "1px solid rgba(160, 140, 255, 0.2)",
                        paddingBottom: 8,
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
                        color: "rgba(255, 255, 255, 0.5)",
                        borderBottom: "1px solid rgba(160, 140, 255, 0.1)",
                        paddingBottom: 8,
                        lineHeight: 1.6,
                        caretColor: "rgba(160, 140, 255, 0.6)",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingVision(false);
                        }
                      }}
                    />

                    {/* Save / Cancel buttons */}
                    <div className="flex gap-4 mt-2">
                      <button
                        onClick={() => setEditingVision(false)}
                        className="px-5 py-2 rounded-lg text-xs tracking-wide cursor-pointer transition-all duration-200 hover:scale-105"
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "rgba(255, 255, 255, 0.4)",
                        }}
                      >
                        Cancel
                      </button>
                      <button
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
                        className="px-5 py-2 rounded-lg text-xs tracking-wide cursor-pointer transition-all duration-200 hover:scale-105"
                        style={{
                          background: "rgba(160, 140, 255, 0.12)",
                          border: "1px solid rgba(160, 140, 255, 0.2)",
                          color: "rgba(200, 180, 255, 0.8)",
                          opacity: editSaving || !editTitle.trim() ? 0.4 : 1,
                        }}
                      >
                        {editSaving ? "Saving..." : "Save"}
                      </button>
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-full text-sm font-medium tracking-wide cursor-pointer transition-all duration-200 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25))",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            color: "rgba(255, 255, 255, 0.75)",
            boxShadow: "0 0 30px rgba(139, 92, 246, 0.12)",
            backdropFilter: "blur(12px)",
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

      {/* ── New Vision Modal ── */}
      <NewVisionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />

    </div>
  );
}
