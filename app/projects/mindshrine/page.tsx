"use client";

import { motion } from "framer-motion";
import ShrineScreen from "./components/ShrineScreen";

export default function MindShrinePage() {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0"
      >
        <ShrineScreen onLogout={() => {}} />
      </motion.div>
    </div>
  );
}
