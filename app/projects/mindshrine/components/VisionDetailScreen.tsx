"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
} from "@react-three/postprocessing";
import * as THREE from "three";
import type { Vision, LedgerEntry } from "../lib/types";
import {
  fetchLedgerEntries,
  createLedgerEntry,
  updateVision,
  deleteVision,
  fulfillVision,
} from "../lib/service";

// ── Hero Orb (3D) ──
function HeroOrb({ hue, isFulfilled }: { hue: number; isFulfilled: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const h = hue / 360;
  const color = useMemo(() => new THREE.Color().setHSL(h, 0.7, 0.5), [h]);
  const emissive = useMemo(() => new THREE.Color().setHSL(h, 0.8, 0.35), [h]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.3;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isFulfilled
        ? 0.8 + Math.sin(t * 4) * 0.3
        : 0.5 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[2, 3, 3]} intensity={0.5} color="#8866ff" />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.5}
            metalness={isFulfilled ? 0.9 : 0.3}
            roughness={isFulfilled ? 0.1 : 0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Glow shell */}
        <mesh scale={1.5}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Float>
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ── Entry Log Modal ──
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
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
                <div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      isAction
                        ? "What action did you take toward this vision?"
                        : "What synchronicity or sign did you notice?"
                    }
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/20 outline-none resize-none"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                    autoFocus
                  />
                </div>

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

// ── Edit Vision Modal ──
function EditVisionModal({
  open,
  vision,
  onClose,
  onSave,
}: {
  open: boolean;
  vision: Vision;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(vision.title);
  const [description, setDescription] = useState(vision.description || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim(), description.trim());
    setSaving(false);
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-md rounded-2xl p-6 pointer-events-auto"
              style={{
                background: "rgba(12, 10, 25, 0.95)",
                border: "1px solid rgba(120, 80, 255, 0.15)",
                boxShadow: "0 0 60px rgba(100, 60, 255, 0.1)",
              }}
            >
              <h3
                className="text-base font-tight font-semibold mb-4"
                style={{
                  background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Edit Vision
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white/90 outline-none"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white/90 outline-none resize-none"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                />
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
                    disabled={saving || !title.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(99, 102, 241, 0.35))",
                      border: "1px solid rgba(139, 92, 246, 0.25)",
                      color: "rgba(255, 255, 255, 0.85)",
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
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

// ── Celebration animation ──
function CelebrationOverlay({
  show,
  hue,
  onDone,
}: {
  show: boolean;
  hue: number;
  onDone: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDone, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  const color = `hsl(${hue}, 70%, 50%)`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        >
          {/* Radial burst */}
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute w-32 h-32 rounded-full"
            style={{
              background: `radial-gradient(circle, ${color}, transparent)`,
            }}
          />
          {/* Text */}
          <motion.p
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-tight font-semibold tracking-wide"
            style={{
              color,
              textShadow: `0 0 40px ${color}`,
            }}
          >
            Vision Fulfilled
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Timeline entry ──
function TimelineEntry({
  entry,
  index,
}: {
  entry: LedgerEntry;
  index: number;
}) {
  const isAction = entry.type === "action";
  const accentColor = isAction
    ? "rgba(255, 170, 68, 0.8)"
    : "rgba(100, 180, 255, 0.8)";
  const bgColor = isAction
    ? "rgba(255, 170, 68, 0.05)"
    : "rgba(100, 180, 255, 0.05)";
  const borderColor = isAction
    ? "rgba(255, 170, 68, 0.12)"
    : "rgba(100, 180, 255, 0.12)";

  const date = new Date(entry.occurred_at);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: "easeOut",
      }}
      className={`flex gap-4 ${isAction ? "flex-row" : "flex-row-reverse"}`}
    >
      {/* Content card */}
      <div
        className="flex-1 rounded-xl p-4 max-w-xs"
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        <p className="text-sm text-white/80 leading-relaxed">{entry.note}</p>
        <p className="text-xs mt-2" style={{ color: accentColor, opacity: 0.6 }}>
          {formatted} &middot; {time}
        </p>
      </div>

      {/* Center dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
        />
        <div
          className="w-px flex-1 min-h-[20px]"
          style={{ background: "rgba(255, 255, 255, 0.06)" }}
        />
      </div>

      {/* Spacer for alternating layout */}
      <div className="flex-1 max-w-xs" />
    </motion.div>
  );
}

// ── Main Detail Screen ──
export default function VisionDetailScreen({
  vision,
  onBack,
  onVisionUpdated,
  onVisionDeleted,
}: {
  vision: Vision;
  onBack: () => void;
  onVisionUpdated: (v: Vision) => void;
  onVisionDeleted: () => void;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<"action" | "synchronicity" | null>(
    null
  );
  const [editOpen, setEditOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const data = await fetchLedgerEntries(vision.id);
      setEntries(data);
    } catch (err) {
      console.error("Failed to load entries:", err);
    } finally {
      setLoading(false);
    }
  }, [vision.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleLogEntry = useCallback(
    async (note: string, occurredAt: string) => {
      if (!logType) return;
      const entry = await createLedgerEntry(
        vision.id,
        logType,
        note,
        occurredAt
      );
      setEntries((prev) => [entry, ...prev]);
    },
    [logType, vision.id]
  );

  const handleEditSave = useCallback(
    async (title: string, description: string) => {
      const updated = await updateVision(vision.id, { title, description });
      onVisionUpdated(updated);
    },
    [vision.id, onVisionUpdated]
  );

  const handleFulfill = useCallback(async () => {
    const updated = await fulfillVision(vision.id);
    onVisionUpdated(updated);
    setCelebrating(true);
    setShowMenu(false);
  }, [vision.id, onVisionUpdated]);

  const handleDelete = useCallback(async () => {
    await deleteVision(vision.id);
    onVisionDeleted();
  }, [vision.id, onVisionDeleted]);

  return (
    <div className="relative w-full h-full overflow-y-auto">
      {/* Celebration */}
      <CelebrationOverlay
        show={celebrating}
        hue={vision.color_hue}
        onDone={() => setCelebrating(false)}
      />

      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, hsla(${vision.color_hue}, 40%, 8%, 0.6), black 70%)`,
        }}
      />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          &larr; Shrine
        </button>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            &middot;&middot;&middot;
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 rounded-xl py-1 min-w-[140px] z-30"
                style={{
                  background: "rgba(15, 12, 30, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  onClick={() => {
                    setEditOpen(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Edit
                </button>
                {!vision.is_fulfilled && (
                  <button
                    onClick={handleFulfill}
                    className="w-full text-left px-4 py-2 text-sm text-green-400/60 hover:text-green-400/80 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Mark Fulfilled
                  </button>
                )}
                <button
                  onClick={() => {
                    setConfirmDelete(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400/50 hover:text-red-400/70 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hero orb + info */}
      <div className="relative z-10 flex flex-col items-center pt-6 pb-4">
        <div className="w-40 h-40">
          <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
            <HeroOrb hue={vision.color_hue} isFulfilled={vision.is_fulfilled} />
          </Canvas>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xl font-tight font-semibold text-white/90 mt-2 text-center px-6"
        >
          {vision.title}
        </motion.h2>

        {vision.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-white/35 mt-2 text-center px-8 max-w-md"
          >
            {vision.description}
          </motion.p>
        )}

        {vision.is_fulfilled && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: `hsla(${vision.color_hue}, 60%, 30%, 0.3)`,
              color: `hsla(${vision.color_hue}, 70%, 70%, 0.8)`,
              border: `1px solid hsla(${vision.color_hue}, 60%, 40%, 0.2)`,
            }}
          >
            Fulfilled
          </motion.span>
        )}
      </div>

      {/* Action buttons */}
      <div className="relative z-10 flex justify-center gap-3 pb-6">
        <button
          onClick={() => setLogType("action")}
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(255, 170, 68, 0.12)",
            border: "1px solid rgba(255, 170, 68, 0.15)",
            color: "rgba(255, 190, 100, 0.85)",
            boxShadow: "0 0 20px rgba(255, 170, 68, 0.06)",
          }}
        >
          Log Action
        </button>
        <button
          onClick={() => setLogType("synchronicity")}
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(68, 170, 255, 0.12)",
            border: "1px solid rgba(68, 170, 255, 0.15)",
            color: "rgba(130, 200, 255, 0.85)",
            boxShadow: "0 0 20px rgba(68, 170, 255, 0.06)",
          }}
        >
          Log Synchronicity
        </button>
      </div>

      {/* Timeline */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-20">
        {/* Center line */}
        {entries.length > 0 && (
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{ background: "rgba(255, 255, 255, 0.04)" }}
          />
        )}

        {loading ? (
          <p className="text-center text-white/20 text-sm py-8">
            Loading...
          </p>
        ) : entries.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-white/20 text-sm py-8"
          >
            No entries yet. Log your first action or synchronicity.
          </motion.p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <TimelineEntry key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Log Entry Modal */}
      {logType && (
        <LogEntryModal
          open={!!logType}
          type={logType}
          onClose={() => setLogType(null)}
          onSubmit={handleLogEntry}
        />
      )}

      {/* Edit Vision Modal */}
      {editOpen && (
        <EditVisionModal
          open={editOpen}
          vision={vision}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
        />
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmDelete(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="rounded-2xl p-6 pointer-events-auto max-w-sm w-full text-center"
                style={{
                  background: "rgba(12, 10, 25, 0.95)",
                  border: "1px solid rgba(255, 80, 80, 0.15)",
                }}
              >
                <p className="text-white/70 text-sm mb-4">
                  Delete &ldquo;{vision.title}&rdquo;? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white/40 cursor-pointer"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                    style={{
                      background: "rgba(255, 60, 60, 0.2)",
                      border: "1px solid rgba(255, 60, 60, 0.2)",
                      color: "rgba(255, 120, 120, 0.9)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
