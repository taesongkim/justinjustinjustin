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
        <p className="text-lg sm:text-xl text-white/50 leading-relaxed">
          justin&apos;s passion projects
        </p>
      </motion.div>
    </div>
  );
}
