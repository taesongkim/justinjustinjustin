"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Tuned particle settings
const NEAR_COLOR: [number, number, number] = [0.9, 0.3, 0.6];
const FAR_COLOR: [number, number, number] = [0.3, 0.2, 1.0];
const DEPTH_SPLIT = 0.5;
const NEAR_BLUR = 3;
const OPACITY = 0.8;
const PARTICLE_SIZE = 0.08;
const PARTICLE_COUNT = 2000;
const SPREAD = 20;

function createDiamondTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(64, 32);
  ctx.lineTo(32, 64);
  ctx.lineTo(0, 32);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function generatePositions(count: number, spread: number, seed: number) {
  const pos = new Float32Array(count * 3);
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * spread;
    pos[i * 3 + 1] = (rand() - 0.5) * spread;
    pos[i * 3 + 2] = (rand() - 0.5) * spread;
  }
  return pos;
}

function ParticleLayer({
  positions,
  mode,
}: {
  positions: Float32Array;
  mode: "near" | "far";
}) {
  const meshRef = useRef<THREE.Points>(null);
  const diamondTexture = useMemo(() => createDiamondTexture(), []);

  const colors = useMemo(() => {
    const col = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) col[i] = 0.5;
    return col;
  }, []);

  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!meshRef.current) return;

    meshRef.current.rotation.y = state.clock.elapsedTime * 0.0075;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1;

    const camera = state.camera;
    const geo = meshRef.current.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;

    let minDist = Infinity;
    let maxDist = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      tempVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      meshRef.current.localToWorld(tempVec);
      const dist = tempVec.distanceTo(camera.position);
      if (dist < minDist) minDist = dist;
      if (dist > maxDist) maxDist = dist;
    }

    const range = maxDist - minDist || 1;
    const splitDist = minDist + range * DEPTH_SPLIT;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      tempVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      meshRef.current.localToWorld(tempVec);
      const dist = tempVec.distanceTo(camera.position);
      const t = (dist - minDist) / range;

      const isNear = dist < splitDist;
      const visible = mode === "near" ? isNear : !isNear;

      if (visible) {
        colAttr.setXYZ(
          i,
          NEAR_COLOR[0] + (FAR_COLOR[0] - NEAR_COLOR[0]) * t,
          NEAR_COLOR[1] + (FAR_COLOR[1] - NEAR_COLOR[1]) * t,
          NEAR_COLOR[2] + (FAR_COLOR[2] - NEAR_COLOR[2]) * t
        );
      } else {
        colAttr.setXYZ(i, 0, 0, 0);
      }
    }
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={diamondTexture}
        alphaMap={diamondTexture}
        size={PARTICLE_SIZE}
        vertexColors
        transparent
        opacity={OPACITY}
        sizeAttenuation
        depthWrite={false}
        alphaTest={0.01}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Scene() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const positions = useMemo(() => generatePositions(PARTICLE_COUNT, SPREAD, 42), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 -z-10">
      {/* Far layer — sharp */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={["#000000"]} />
          <ParticleLayer positions={positions} mode="far" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.075}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
      </div>

      {/* Near layer — blurred */}
      <div
        className="absolute inset-0"
        style={{ filter: `blur(${NEAR_BLUR}px)` }}
      >
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ParticleLayer positions={positions} mode="near" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.075}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
      </div>
    </div>
  );
}
