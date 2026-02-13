"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-2xl"
      >
        <h1 className="text-5xl font-bold tracking-tight mb-8">About</h1>
        <p className="text-lg text-white/50 leading-relaxed mb-6">
          This is the about page. Tell your story here.
        </p>
        <p className="text-lg text-white/50 leading-relaxed">
          Edit <code className="text-white/70 bg-white/5 px-2 py-1 rounded text-sm font-mono">app/about/page.tsx</code> to
          change this content.
        </p>
      </motion.div>
    </div>
  );
}
