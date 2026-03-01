"use client";

import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { supabase } from "../lib/supabase";
import ShrineButton from "./ShrineButton";

// ── Floating particles background ──
function LoginParticles({ count = 120 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 6 - 2,
      speed: 0.1 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
      scale: 0.01 + Math.random() * 0.03,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.3,
        p.z
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#8866ff" transparent opacity={0.4} />
    </instancedMesh>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/projects/mindshrine`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 3D particle background */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <LoginParticles />
        </Canvas>
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div
          className="rounded-2xl p-8 backdrop-blur-xl"
          style={{
            background: "rgba(10, 10, 20, 0.8)",
            border: "1px solid rgba(120, 80, 255, 0.15)",
            boxShadow:
              "0 0 60px rgba(100, 60, 255, 0.08), inset 0 0 60px rgba(100, 60, 255, 0.03)",
          }}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-tight font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #c4b5fd, #818cf8, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MindShrine
            </h1>
            <p className="text-white/30 text-sm mt-2 tracking-wide">
              Illuminate your visions
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full text-sm text-white/90 placeholder-white/20 outline-none transition-all duration-200 focus:ring-1 focus:ring-purple-500/40"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                  disabled={loading}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400/80 text-xs text-center"
                >
                  {error}
                </motion.p>
              )}

              <ShrineButton
                variant="purple"
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </ShrineButton>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-4"
            >
              <div
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: "rgba(139, 92, 246, 0.15)",
                  boxShadow: "0 0 30px rgba(139, 92, 246, 0.15)",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(167, 139, 250, 0.8)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm">
                Check your inbox for the magic link
              </p>
              <p className="text-white/30 text-xs mt-2">{email}</p>
              <ShrineButton
                variant="gray"
                className="mt-4"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Try a different email
              </ShrineButton>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
