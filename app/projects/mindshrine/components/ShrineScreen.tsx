"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vision, LedgerEntry } from "../lib/types";
import {
  fetchVisions,
  fetchLedgerEntries,
  createLedgerEntry,
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
// Thread segment with unified string + tag physics
// ─────────────────────────────────────────
function ThreadSegment({
  entry,
  index,
}: {
  entry: LedgerEntry;
  index: number;
}) {
  const isAction = entry.type === "action";
  const side = isAction ? "left" : "right";
  const color = isAction ? "rgba(255, 170, 68, 0.7)" : "rgba(100, 180, 255, 0.7)";
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
  useEffect(() => {
    let raf: number;
    const animate = () => {
      const t = performance.now() / 1000;
      const phase = phaseRef.current;

      // String physics
      const sway1 = Math.sin(t * 1.2 + phase) * 6;
      const sway2 = Math.sin(t * 0.8 + phase + 1.5) * 4;
      const droop = 14 + Math.sin(t * 0.5 + phase) * 3;

      // Anchor at thread side, endpoint where tag attaches
      const startX = side === "left" ? svgWidth : 0;
      const endX = side === "left" ? 4 : svgWidth - 4;
      const midX = (startX + endX) / 2;

      // Endpoint Y — this is where the string meets the tag
      const endY = svgHeight / 2 + Math.sin(t * 0.7 + phase + 0.8) * 3;

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
  }, [side, svgHeight]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      className="relative"
      style={{ height: 72 }}
    >
      {/* Center glowing orb on the thread */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
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

  const currentVision = visions[currentIndex] ?? null;

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
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir >= 0 ? 120 : -120,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir >= 0 ? -120 : 120,
      opacity: 0,
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
            className="absolute left-1/2 -translate-x-1/2 w-[2px] pointer-events-none z-0"
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
                {/* Scroll container with half-screen padding */}
                <div
                  className="relative mx-auto"
                  style={{
                    width: "100%",
                    paddingTop: "50vh",
                    paddingBottom: "50vh",
                  }}
                >
                  {/* Thread line — spans full height of content, positioned 1/3 from right */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
                    style={{
                      left: "66%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(to bottom, transparent 5%, rgba(160, 140, 255, 0.35) 15%, rgba(160, 140, 255, 0.35) 85%, transparent 95%)",
                    }}
                  />

                  {/* Segments */}
                  <div className="relative flex flex-col" style={{ alignItems: "center", paddingLeft: "32%" }}>
                    <AnimatePresence initial={false}>
                      {entries.map((entry, i) => (
                        <ThreadSegment key={entry.id} entry={entry} index={i} />
                      ))}
                    </AnimatePresence>

                    {entries.length === 0 && (
                      <p className="text-white/15 text-xs tracking-wide mt-4">
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
              opacity: threadOpen ? 0.8 : 1,
              alignItems: threadOpen ? "flex-start" : "center",
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Vision title carousel */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.h2
                key={currentVision.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeOut" }}
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

            {/* Description (fades in on hover) */}
            <AnimatePresence>
              {(hovered || threadOpen) && currentVision.description && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.4, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.35 }}
                  className="text-sm mt-4 leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.5)", textAlign: threadOpen ? "left" : "center", maxWidth: threadOpen ? "40ch" : "none" }}
                >
                  {currentVision.description}
                </motion.p>
              )}
            </AnimatePresence>

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
