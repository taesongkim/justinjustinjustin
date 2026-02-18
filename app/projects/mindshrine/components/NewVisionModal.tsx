"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createVision } from "../lib/service";
import type { Vision } from "../lib/types";

export default function NewVisionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (v: Vision) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError("");
    try {
      const vision = await createVision(title.trim(), description.trim());
      onCreated(vision);
      setTitle("");
      setDescription("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create vision");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
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
                boxShadow: "0 0 80px rgba(100, 60, 255, 0.1)",
              }}
            >
              <h2
                className="text-lg font-tight font-semibold mb-5"
                style={{
                  background:
                    "linear-gradient(135deg, #c4b5fd, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                New Vision
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/40 text-xs mb-1.5 tracking-wide">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What is your vision?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/20 outline-none transition-all duration-200 focus:ring-1 focus:ring-purple-500/40"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-white/40 text-xs mb-1.5 tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your vision in more detail..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/20 outline-none transition-all duration-200 resize-none focus:ring-1 focus:ring-purple-500/40"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  />
                </div>

                {error && (
                  <p className="text-red-400/80 text-xs">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
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
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(99, 102, 241, 0.35))",
                      border: "1px solid rgba(139, 92, 246, 0.25)",
                      color: "rgba(255, 255, 255, 0.85)",
                      boxShadow: "0 0 20px rgba(139, 92, 246, 0.1)",
                    }}
                  >
                    {saving ? "Creating..." : "Create Vision"}
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
