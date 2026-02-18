"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { Vision } from "./lib/types";
import LoginScreen from "./components/LoginScreen";
import ShrineScreen from "./components/ShrineScreen";
import VisionDetailScreen from "./components/VisionDetailScreen";

type Screen = "login" | "shrine" | "detail";

export default function MindShrinePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setScreen("shrine");
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setScreen("shrine");
      else setScreen("login");
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = useCallback(
    (target: Screen, vision?: Vision | null) => {
      if (transitioning) return;
      setTransitioning(true);
      // Fade to black, then switch, then fade in
      setTimeout(() => {
        if (vision !== undefined) setSelectedVision(vision);
        setScreen(target);
        setTimeout(() => setTransitioning(false), 50);
      }, 350);
    },
    [transitioning]
  );

  const handleSelectVision = useCallback(
    (v: Vision) => navigateTo("detail", v),
    [navigateTo]
  );

  const handleBackToShrine = useCallback(
    () => navigateTo("shrine", null),
    [navigateTo]
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setScreen("login");
    setSelectedVision(null);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/40 text-sm tracking-widest uppercase"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Fade-to-black overlay for transitions */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            key="blackout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 bg-black z-[100]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <LoginScreen />
          </motion.div>
        )}

        {screen === "shrine" && session && (
          <motion.div
            key="shrine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <ShrineScreen
              onSelectVision={handleSelectVision}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {screen === "detail" && selectedVision && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <VisionDetailScreen
              vision={selectedVision}
              onBack={handleBackToShrine}
              onVisionUpdated={(v) => setSelectedVision(v)}
              onVisionDeleted={handleBackToShrine}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
