"use client";

import { motion } from "framer-motion";

export default function Contact() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-2xl w-full"
      >
        <h1 className="text-5xl font-bold tracking-tight mb-8">Contact</h1>
        <p className="text-lg text-white/50 leading-relaxed mb-8">
          Get in touch. Edit this page to add a form, email link, or whatever
          works for you.
        </p>
        <a
          href="mailto:hello@justinjustinjustin.com"
          className="inline-block px-6 py-3 border border-white/20 rounded-full text-sm tracking-wide hover:bg-white/5 transition-colors"
        >
          hello@justinjustinjustin.com
        </a>
      </motion.div>
    </div>
  );
}
