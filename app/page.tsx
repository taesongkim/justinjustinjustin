"use client";

import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-2xl"
      >
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight mb-6 font-[family-name:var(--font-tight)]">
          justin<span className="opacity-40">×3</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/50 leading-relaxed">
          Welcome to the site. This is your blank canvas — ready for whatever
          you want to build.
        </p>
      </motion.div>
    </div>
  );
}
