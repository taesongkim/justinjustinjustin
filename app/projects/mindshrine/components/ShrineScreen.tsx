"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { Vision } from "../lib/types";
import { fetchVisions, fetchLedgerCounts } from "../lib/service";
import ShrineScene from "./ShrineScene";
import NewVisionModal from "./NewVisionModal";

export default function ShrineScreen({
  onSelectVision,
  onLogout,
}: {
  onSelectVision: (v: Vision) => void;
  onLogout: () => void;
}) {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [ledgerCounts, setLedgerCounts] = useState<
    Record<string, { actions: number; synchronicities: number }>
  >({});
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const v = await fetchVisions();
      setVisions(v);
      if (v.length > 0) {
        const counts = await fetchLedgerCounts(v.map((x) => x.id));
        setLedgerCounts(counts);
      }
    } catch (err) {
      console.error("Failed to load visions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreated = useCallback(
    (v: Vision) => {
      setVisions((prev) => [v, ...prev]);
      setLedgerCounts((prev) => ({
        ...prev,
        [v.id]: { actions: 0, synchronicities: 0 },
      }));
    },
    []
  );

  return (
    <div className="relative w-full h-full">
      {/* 3D Shrine */}
      <div className="absolute inset-0">
        <ShrineScene
          visions={visions}
          ledgerCounts={ledgerCounts}
          onSelectVision={onSelectVision}
        />
      </div>

      {/* Empty state prompt */}
      {!loading && visions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <p className="text-white/25 text-sm tracking-widest uppercase">
            Your shrine awaits its first vision
          </p>
        </motion.div>
      )}

      {/* + New Vision button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onClick={() => setModalOpen(true)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-full text-sm font-medium tracking-wide cursor-pointer transition-all duration-200 hover:scale-105"
        style={{
          background:
            "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25))",
          border: "1px solid rgba(139, 92, 246, 0.2)",
          color: "rgba(255, 255, 255, 0.75)",
          boxShadow: "0 0 30px rgba(139, 92, 246, 0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        + New Vision
      </motion.button>

      {/* Logout button */}
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

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-sm font-tight font-semibold tracking-widest uppercase"
        style={{
          color: "rgba(255, 255, 255, 0.2)",
        }}
      >
        MindShrine
      </motion.h1>

      {/* New Vision Modal */}
      <NewVisionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
