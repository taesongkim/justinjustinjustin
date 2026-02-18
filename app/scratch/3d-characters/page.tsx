"use client";

import { Canvas, useFrame  } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ---------------------------------------------------------------------------
// Expression definitions
// ---------------------------------------------------------------------------
interface ExpressionDef {
  name: string;
  eyes: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  mouth: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  brows?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const EXPRESSIONS: ExpressionDef[] = [
  {
    name: "neutral",
    eyes: (ctx, w, h) => {
      // Large round anime eyes
      const eyeW = w * 0.28;
      const eyeH = h * 0.35;
      const eyeY = h * 0.42;
      const gap = w * 0.08;
      [w / 2 - gap - eyeW / 2, w / 2 + gap + eyeW / 2].forEach((cx) => {
        // White
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Iris
        ctx.fillStyle = "#2a1810";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 2, eyeW * 0.38, eyeH * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 4, eyeW * 0.18, eyeH * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx - eyeW * 0.12, eyeY - eyeH * 0.12, eyeW * 0.12, eyeH * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + eyeW * 0.08, eyeY + eyeH * 0.08, eyeW * 0.06, eyeH * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        // Upper eyelid line
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY - 2, eyeW / 2 + 1, eyeH / 2 - 2, 0, Math.PI + 0.3, -0.3);
        ctx.stroke();
      });
    },
    mouth: (ctx, w, h) => {
      ctx.strokeStyle = "#cc6666";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.42, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 0.74, w * 0.58, h * 0.72);
      ctx.stroke();
    },
  },
  {
    name: "happy",
    eyes: (ctx, w, h) => {
      // Happy closed arc eyes ^_^
      const eyeY = h * 0.42;
      const gap = w * 0.08;
      [w / 2 - gap - w * 0.14, w / 2 + gap + w * 0.14].forEach((cx) => {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx, eyeY + 4, w * 0.1, Math.PI + 0.5, -0.5);
        ctx.stroke();
      });
    },
    mouth: (ctx, w, h) => {
      // Big D-shaped smile
      ctx.fillStyle = "#cc4444";
      ctx.beginPath();
      ctx.moveTo(w * 0.38, h * 0.7);
      ctx.quadraticCurveTo(w * 0.5, h * 0.82, w * 0.62, h * 0.7);
      ctx.closePath();
      ctx.fill();
      // Tongue
      ctx.fillStyle = "#ff8888";
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.75, w * 0.06, h * 0.04, 0, 0, Math.PI);
      ctx.fill();
    },
  },
  {
    name: "surprised",
    eyes: (ctx, w, h) => {
      // Wide open round eyes
      const eyeW = w * 0.32;
      const eyeH = h * 0.42;
      const eyeY = h * 0.4;
      const gap = w * 0.06;
      [w / 2 - gap - eyeW / 2, w / 2 + gap + eyeW / 2].forEach((cx) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Small iris (surprise = more white showing)
        ctx.fillStyle = "#2a1810";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW * 0.28, eyeH * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW * 0.14, eyeH * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx - eyeW * 0.1, eyeY - eyeH * 0.14, eyeW * 0.1, eyeH * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        // Outline
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW / 2 + 1, eyeH / 2 + 1, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    },
    mouth: (ctx, w, h) => {
      // Small O mouth
      ctx.fillStyle = "#cc4444";
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.73, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#331111";
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.73, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    brows: (ctx, w, h) => {
      const gap = w * 0.08;
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      // Raised brows
      [w / 2 - gap - w * 0.14, w / 2 + gap + w * 0.14].forEach((cx, i) => {
        ctx.beginPath();
        const dir = i === 0 ? 1 : -1;
        ctx.moveTo(cx - w * 0.1 * dir, h * 0.24);
        ctx.quadraticCurveTo(cx, h * 0.18, cx + w * 0.1 * dir, h * 0.22);
        ctx.stroke();
      });
    },
  },
  {
    name: "angry",
    eyes: (ctx, w, h) => {
      // Angled sharp eyes
      const eyeW = w * 0.26;
      const eyeH = h * 0.28;
      const eyeY = h * 0.44;
      const gap = w * 0.08;
      [w / 2 - gap - eyeW / 2, w / 2 + gap + eyeW / 2].forEach((cx, i) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#881111";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 2, eyeW * 0.35, eyeH * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 3, eyeW * 0.16, eyeH * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx - eyeW * 0.08, eyeY - eyeH * 0.08, eyeW * 0.08, eyeH * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyelid cut (angry)
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY - 2, eyeW / 2 + 1, eyeH / 2 - 2, 0, Math.PI + 0.3, -0.3);
        ctx.stroke();
      });
    },
    mouth: (ctx, w, h) => {
      // Frown / gritted teeth
      ctx.strokeStyle = "#cc4444";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.38, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 0.68, w * 0.62, h * 0.72);
      ctx.stroke();
    },
    brows: (ctx, w, h) => {
      const gap = w * 0.08;
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      // V-shaped angry brows
      [w / 2 - gap - w * 0.14, w / 2 + gap + w * 0.14].forEach((cx, i) => {
        ctx.beginPath();
        const dir = i === 0 ? 1 : -1;
        ctx.moveTo(cx - w * 0.12 * dir, h * 0.3);
        ctx.quadraticCurveTo(cx, h * 0.26, cx + w * 0.1 * dir, h * 0.32);
        ctx.stroke();
      });
    },
  },
  {
    name: "sad",
    eyes: (ctx, w, h) => {
      // Teary droopy eyes
      const eyeW = w * 0.26;
      const eyeH = h * 0.3;
      const eyeY = h * 0.44;
      const gap = w * 0.08;
      [w / 2 - gap - eyeW / 2, w / 2 + gap + eyeW / 2].forEach((cx, i) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2a1810";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 4, eyeW * 0.35, eyeH * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 5, eyeW * 0.16, eyeH * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight (smaller, less sparkly)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx - eyeW * 0.08, eyeY - eyeH * 0.06, eyeW * 0.07, eyeH * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tear
        ctx.fillStyle = "rgba(100, 180, 255, 0.6)";
        const tearX = i === 0 ? cx + eyeW * 0.3 : cx - eyeW * 0.3;
        ctx.beginPath();
        ctx.moveTo(tearX, eyeY + eyeH * 0.35);
        ctx.quadraticCurveTo(tearX + 4, eyeY + eyeH * 0.7, tearX, eyeY + eyeH * 0.9);
        ctx.quadraticCurveTo(tearX - 4, eyeY + eyeH * 0.7, tearX, eyeY + eyeH * 0.35);
        ctx.fill();
      });
    },
    mouth: (ctx, w, h) => {
      ctx.strokeStyle = "#cc6666";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.42, h * 0.71);
      ctx.quadraticCurveTo(w * 0.5, h * 0.67, w * 0.58, h * 0.71);
      ctx.stroke();
    },
    brows: (ctx, w, h) => {
      const gap = w * 0.08;
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      [w / 2 - gap - w * 0.14, w / 2 + gap + w * 0.14].forEach((cx, i) => {
        ctx.beginPath();
        const dir = i === 0 ? 1 : -1;
        ctx.moveTo(cx - w * 0.1 * dir, h * 0.28);
        ctx.quadraticCurveTo(cx, h * 0.24, cx + w * 0.1 * dir, h * 0.3);
        ctx.stroke();
      });
    },
  },
  {
    name: "smirk",
    eyes: (ctx, w, h) => {
      const eyeY = h * 0.42;
      const gap = w * 0.08;
      // Left eye normal
      const lx = w / 2 - gap - w * 0.14;
      const eyeW = w * 0.26;
      const eyeH = h * 0.32;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(lx, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a1810";
      ctx.beginPath();
      ctx.ellipse(lx + 3, eyeY + 2, eyeW * 0.35, eyeH * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(lx + 3, eyeY + 3, eyeW * 0.16, eyeH * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(lx - eyeW * 0.06, eyeY - eyeH * 0.1, eyeW * 0.1, eyeH * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(lx, eyeY - 2, eyeW / 2 + 1, eyeH / 2 - 2, 0, Math.PI + 0.3, -0.3);
      ctx.stroke();

      // Right eye - closed wink
      const rx = w / 2 + gap + w * 0.14;
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(rx, eyeY + 2, w * 0.09, Math.PI + 0.5, -0.5);
      ctx.stroke();
    },
    mouth: (ctx, w, h) => {
      // Asymmetric smirk
      ctx.fillStyle = "#cc5555";
      ctx.beginPath();
      ctx.moveTo(w * 0.44, h * 0.72);
      ctx.quadraticCurveTo(w * 0.54, h * 0.78, w * 0.62, h * 0.7);
      ctx.quadraticCurveTo(w * 0.54, h * 0.74, w * 0.44, h * 0.72);
      ctx.fill();
    },
  },
  {
    name: "sparkle",
    eyes: (ctx, w, h) => {
      // Giant sparkly anime eyes with star highlights
      const eyeW = w * 0.3;
      const eyeH = h * 0.4;
      const eyeY = h * 0.42;
      const gap = w * 0.06;
      [w / 2 - gap - eyeW / 2, w / 2 + gap + eyeW / 2].forEach((cx) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Gradient iris
        const grad = ctx.createRadialGradient(cx, eyeY, 0, cx, eyeY, eyeW * 0.4);
        grad.addColorStop(0, "#6633aa");
        grad.addColorStop(0.5, "#4422aa");
        grad.addColorStop(1, "#221166");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 2, eyeW * 0.4, eyeH * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + 3, eyeW * 0.18, eyeH * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Multiple sparkle highlights
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx - eyeW * 0.14, eyeY - eyeH * 0.14, eyeW * 0.12, eyeH * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + eyeW * 0.1, eyeY + eyeH * 0.1, eyeW * 0.08, eyeH * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - eyeW * 0.04, eyeY + eyeH * 0.16, eyeW * 0.04, eyeH * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        // Star highlight
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        drawStar(ctx, cx + eyeW * 0.06, eyeY - eyeH * 0.06, 4, eyeW * 0.06, eyeW * 0.02);
        // Outline
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY - 2, eyeW / 2 + 1, eyeH / 2, 0, Math.PI + 0.2, -0.2);
        ctx.stroke();
      });
    },
    mouth: (ctx, w, h) => {
      // Cute cat mouth :3
      ctx.strokeStyle = "#cc6666";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h * 0.72);
      ctx.quadraticCurveTo(w * 0.45, h * 0.75, w * 0.5, h * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.72);
      ctx.quadraticCurveTo(w * 0.55, h * 0.75, w * 0.6, h * 0.72);
      ctx.stroke();
    },
  },
  {
    name: "blush",
    eyes: (ctx, w, h) => {
      // Same as neutral but with blush marks
      EXPRESSIONS[0].eyes(ctx, w, h);
      // Blush marks
      ctx.fillStyle = "rgba(255, 100, 120, 0.25)";
      ctx.beginPath();
      ctx.ellipse(w * 0.28, h * 0.55, w * 0.08, h * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.72, h * 0.55, w * 0.08, h * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      // Diagonal blush lines
      ctx.strokeStyle = "rgba(255, 100, 120, 0.3)";
      ctx.lineWidth = 1.5;
      for (let side = 0; side < 2; side++) {
        const bx = side === 0 ? w * 0.28 : w * 0.72;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(bx + i * 5 - 3, h * 0.54 - 3);
          ctx.lineTo(bx + i * 5 + 3, h * 0.56 + 3);
          ctx.stroke();
        }
      }
    },
    mouth: (ctx, w, h) => {
      // Tiny shy mouth
      ctx.strokeStyle = "#cc6666";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.46, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 0.74, w * 0.54, h * 0.72);
      ctx.stroke();
    },
  },
];

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Generate expression texture
// ---------------------------------------------------------------------------
function generateExpressionTexture(expr: ExpressionDef, size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // Draw expression features
  if (expr.brows) expr.brows(ctx, size, size);
  expr.eyes(ctx, size, size);
  expr.mouth(ctx, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Procedural chibi body (placeholder)
// ---------------------------------------------------------------------------
function ProceduralChibi({ expressionTex }: { expressionTex: THREE.CanvasTexture }) {
  const groupRef = useRef<THREE.Group>(null);

  // Skin material
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffe0c8",
    roughness: 0.6,
    metalness: 0.0,
  }), []);

  // Hair material
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#1a1a2e",
    roughness: 0.5,
    metalness: 0.1,
  }), []);

  // Clothes material
  const shirtMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#2244aa",
    roughness: 0.7,
    metalness: 0.0,
  }), []);

  const pantsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#222233",
    roughness: 0.8,
    metalness: 0.0,
  }), []);

  const shoeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.4,
    metalness: 0.0,
  }), []);

  // Face plane material
  const faceMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: expressionTex,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  }), [expressionTex]);

  useEffect(() => {
    faceMat.map = expressionTex;
    faceMat.needsUpdate = true;
  }, [expressionTex, faceMat]);

  // Gentle idle bob
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {/* HEAD - large sphere (chibi proportions) */}
      <group position={[0, 1.35, 0]}>
        {/* Head sphere */}
        <mesh material={skinMat}>
          <sphereGeometry args={[0.55, 32, 32]} />
        </mesh>

        {/* Hair back volume */}
        <mesh position={[0, 0.08, -0.08]} material={hairMat}>
          <sphereGeometry args={[0.58, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        </mesh>

        {/* Hair front bangs */}
        <mesh position={[0, 0.2, 0.28]} material={hairMat} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.85, 0.18, 0.2]} />
        </mesh>
        {/* Side hair */}
        <mesh position={[-0.42, -0.1, 0.1]} material={hairMat}>
          <boxGeometry args={[0.18, 0.5, 0.25]} />
        </mesh>
        <mesh position={[0.42, -0.1, 0.1]} material={hairMat}>
          <boxGeometry args={[0.18, 0.5, 0.25]} />
        </mesh>

        {/* Face expression overlay - positioned slightly in front of head */}
        <mesh position={[0, -0.05, 0.52]} material={faceMat}>
          <planeGeometry args={[0.9, 0.9]} />
        </mesh>

        {/* Ears */}
        <mesh position={[-0.5, 0, 0]} material={skinMat} scale={[0.4, 0.5, 0.3]}>
          <sphereGeometry args={[0.2, 16, 16]} />
        </mesh>
        <mesh position={[0.5, 0, 0]} material={skinMat} scale={[0.4, 0.5, 0.3]}>
          <sphereGeometry args={[0.2, 16, 16]} />
        </mesh>
      </group>

      {/* BODY - small torso */}
      <group position={[0, 0.55, 0]}>
        {/* Torso */}
        <mesh material={shirtMat}>
          <capsuleGeometry args={[0.22, 0.3, 8, 16]} />
        </mesh>
        {/* Collar detail */}
        <mesh position={[0, 0.18, 0.14]} material={shirtMat} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 16, Math.PI]} />
        </mesh>
      </group>

      {/* ARMS */}
      <group>
        {/* Left arm */}
        <mesh position={[-0.32, 0.5, 0]} rotation={[0, 0, 0.3]} material={shirtMat}>
          <capsuleGeometry args={[0.07, 0.25, 8, 8]} />
        </mesh>
        <mesh position={[-0.42, 0.28, 0]} material={skinMat}>
          <sphereGeometry args={[0.07, 12, 12]} />
        </mesh>

        {/* Right arm */}
        <mesh position={[0.32, 0.5, 0]} rotation={[0, 0, -0.3]} material={shirtMat}>
          <capsuleGeometry args={[0.07, 0.25, 8, 8]} />
        </mesh>
        <mesh position={[0.42, 0.28, 0]} material={skinMat}>
          <sphereGeometry args={[0.07, 12, 12]} />
        </mesh>
      </group>

      {/* LEGS */}
      <group>
        {/* Left leg */}
        <mesh position={[-0.12, 0.12, 0]} material={pantsMat}>
          <capsuleGeometry args={[0.08, 0.2, 8, 8]} />
        </mesh>
        <mesh position={[-0.12, -0.08, 0.04]} material={shoeMat}>
          <boxGeometry args={[0.14, 0.08, 0.2]} />
        </mesh>

        {/* Right leg */}
        <mesh position={[0.12, 0.12, 0]} material={pantsMat}>
          <capsuleGeometry args={[0.08, 0.2, 8, 8]} />
        </mesh>
        <mesh position={[0.12, -0.08, 0.04]} material={shoeMat}>
          <boxGeometry args={[0.14, 0.08, 0.2]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// GLB Model with expression overlay
// ---------------------------------------------------------------------------
function LoadedModel({
  url,
  expressionTex,
  onMorphTargets,
}: {
  url: string;
  expressionTex: THREE.CanvasTexture;
  onMorphTargets: (targets: string[]) => void;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [facePlanePos, setFacePlanePos] = useState<[number, number, number]>([0, 0, 0]);
  const [facePlaneScale, setFacePlaneScale] = useState(1);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const scene = gltf.scene;

      // Find morph targets
      const targets: string[] = [];
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
          Object.keys(child.morphTargetDictionary).forEach((name) => {
            if (!targets.includes(name)) targets.push(name);
          });
        }
      });
      onMorphTargets(targets);

      // Auto-detect head for face plane positioning
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Place face plane near the top (head area for chibi)
      const headY = center.y + size.y * 0.3;
      setFacePlanePos([center.x, headY, center.z + size.z * 0.5 + 0.01]);
      setFacePlaneScale(size.x * 0.6);

      // Center the model
      scene.position.sub(center);
      scene.position.y += size.y / 2;

      // Scale to roughly 2 units tall
      const scale = 2 / size.y;
      scene.scale.setScalar(scale);

      setModel(scene);
    });
  }, [url, onMorphTargets]);

  const faceMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: expressionTex,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  }), [expressionTex]);

  useEffect(() => {
    faceMat.map = expressionTex;
    faceMat.needsUpdate = true;
  }, [expressionTex, faceMat]);

  if (!model) return null;

  return (
    <group>
      <primitive object={model} />
      {/* Face overlay plane */}
      <mesh position={facePlanePos} material={faceMat} scale={facePlaneScale}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Morph target controls
// ---------------------------------------------------------------------------
function MorphTargetPanel({
  morphTargets,
  morphValues,
  onMorphChange,
}: {
  morphTargets: string[];
  morphValues: Record<string, number>;
  onMorphChange: (name: string, value: number) => void;
}) {
  if (morphTargets.length === 0) return null;

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, marginTop: 14 }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5,
        color: "rgba(255,255,255,0.35)", marginBottom: 10,
      }}>
        morph targets
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {morphTargets.map((name) => (
          <div key={name} style={{ marginBottom: 6 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2,
            }}>
              <span>{name}</span>
              <span>{(morphValues[name] || 0).toFixed(2)}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={morphValues[name] || 0}
              onChange={(e) => onMorphChange(name, parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#ff88aa" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CharactersPage() {
  const [currentExpr, setCurrentExpr] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [morphTargets, setMorphTargets] = useState<string[]>([]);
  const [morphValues, setMorphValues] = useState<Record<string, number>>({});
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateSpeed, setRotateSpeed] = useState(0.5);
  const [showOverlay, setShowOverlay] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate expression texture
  const expressionTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!showOverlay) {
      // Return a fully transparent texture
      const canvas = document.createElement("canvas");
      canvas.width = 4;
      canvas.height = 4;
      return new THREE.CanvasTexture(canvas);
    }
    return generateExpressionTexture(EXPRESSIONS[currentExpr]);
  }, [currentExpr, showOverlay]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".glb") || file.name.endsWith(".gltf"))) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
    }
  }, []);

  const handleMorphChange = useCallback((name: string, value: number) => {
    setMorphValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleMorphTargets = useCallback((targets: string[]) => {
    setMorphTargets(targets);
  }, []);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0a0a0f", overflow: "hidden" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragOver && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100,
          background: "rgba(34, 68, 170, 0.3)",
          border: "3px dashed rgba(100, 150, 255, 0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "monospace", fontSize: 18, color: "rgba(255,255,255,0.8)",
          pointerEvents: "none",
        }}>
          drop .glb model here
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, 3], fov: 40 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => { gl.setClearColor("#0a0a0f"); }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 4]} intensity={1.2} />
          <directionalLight position={[-2, 3, -3]} intensity={0.4} color="#8888ff" />
          <pointLight position={[0, 2, 2]} intensity={0.5} color="#ffccaa" />

          {expressionTex && (
            modelUrl ? (
              <LoadedModel
                url={modelUrl}
                expressionTex={expressionTex}
                onMorphTargets={handleMorphTargets}
              />
            ) : (
              <ProceduralChibi expressionTex={expressionTex} />
            )
          )}

          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
            <circleGeometry args={[1.5, 64]} />
            <meshStandardMaterial color="#151520" roughness={0.9} metalness={0.1} />
          </mesh>

          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.6}
            minDistance={1.5}
            maxDistance={8}
            target={[0, 0.8, 0]}
            maxPolarAngle={Math.PI * 0.85}
            autoRotate={autoRotate}
            autoRotateSpeed={rotateSpeed * 2}
          />
        </Suspense>
      </Canvas>

      {/* Title */}
      <div style={{
        position: "absolute", top: 20, left: 24,
        fontFamily: "var(--font-inter-tight), monospace",
        color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: 1,
      }}>
        3d characters
      </div>

      {/* Expression bar - bottom */}
      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 8, padding: "10px 16px",
        background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12, backdropFilter: "blur(12px)",
      }}>
        {EXPRESSIONS.map((expr, i) => (
          <button
            key={expr.name}
            onClick={() => setCurrentExpr(i)}
            style={{
              padding: "6px 14px", fontSize: 11, fontFamily: "monospace",
              background: i === currentExpr ? "rgba(255,100,150,0.25)" : "rgba(255,255,255,0.04)",
              border: i === currentExpr ? "1px solid rgba(255,100,150,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: i === currentExpr ? "#ff88aa" : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            {expr.name}
          </button>
        ))}
      </div>

      {/* Control panel - right */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            position: "absolute", top: 16, right: 16, padding: "6px 12px",
            fontSize: 11, fontFamily: "monospace",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6, color: "rgba(255,255,255,0.5)", cursor: "pointer",
          }}
        >
          controls
        </button>
      ) : (
        <div style={{
          position: "absolute", top: 16, right: 16, width: 240,
          maxHeight: "calc(100vh - 120px)", overflowY: "auto",
          background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#ddd",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>controls</span>
            <button onClick={() => setCollapsed(true)} style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", fontSize: 16, padding: 0,
            }}>×</button>
          </div>

          {/* Model upload */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5,
              color: "rgba(255,255,255,0.35)", marginBottom: 8,
            }}>
              model
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "10px 0", fontSize: 11, fontFamily: "monospace",
                background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: 6, color: "rgba(255,255,255,0.5)", cursor: "pointer",
              }}
            >
              {modelUrl ? "replace model (.glb)" : "load model (.glb)"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            {modelUrl && (
              <button
                onClick={() => { setModelUrl(null); setMorphTargets([]); }}
                style={{
                  width: "100%", padding: "5px 0", marginTop: 4, fontSize: 10,
                  fontFamily: "monospace", background: "none",
                  border: "1px solid rgba(255,100,100,0.2)", borderRadius: 4,
                  color: "rgba(255,100,100,0.5)", cursor: "pointer",
                }}
              >
                use placeholder
              </button>
            )}
          </div>

          {/* Face overlay toggle */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, marginBottom: 14 }}>
            <div style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5,
              color: "rgba(255,255,255,0.35)", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#ff88aa",
                display: "inline-block", boxShadow: "0 0 6px #ff88aa",
              }} />
              face overlay
              <label style={{ marginLeft: "auto", fontSize: 10, cursor: "pointer" }}>
                <input
                  type="checkbox" checked={showOverlay}
                  onChange={(e) => setShowOverlay(e.target.checked)}
                  style={{ marginRight: 4 }}
                />
                on
              </label>
            </div>
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 6,
            }}>
              current: <span style={{ color: "#ff88aa" }}>{EXPRESSIONS[currentExpr].name}</span>
            </div>
          </div>

          {/* Auto-rotate */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
            <div style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5,
              color: "rgba(255,255,255,0.35)", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              turntable
              <label style={{ marginLeft: "auto", fontSize: 10, cursor: "pointer" }}>
                <input
                  type="checkbox" checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  style={{ marginRight: 4 }}
                />
                on
              </label>
            </div>
            {autoRotate && (
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2,
                }}>
                  <span>speed</span>
                  <span>{rotateSpeed.toFixed(1)}</span>
                </div>
                <input
                  type="range" min={0.1} max={2} step={0.1}
                  value={rotateSpeed}
                  onChange={(e) => setRotateSpeed(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#88aaff" }}
                />
              </div>
            )}
          </div>

          {/* Morph targets (if model has them) */}
          <MorphTargetPanel
            morphTargets={morphTargets}
            morphValues={morphValues}
            onMorphChange={handleMorphChange}
          />

          {/* Pipeline info */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, marginTop: 14,
            fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
          }}>
            <div style={{ marginBottom: 4, color: "rgba(255,255,255,0.5)" }}>pipeline</div>
            <div>1. photo → stylized 2D (chatgpt/midjourney)</div>
            <div>2. 2D → 3D model (tripo/meshy)</div>
            <div>3. drop .glb here to preview</div>
            <div>4. apply expressions</div>
          </div>
        </div>
      )}

      {/* Keyboard shortcut hints */}
      <div style={{
        position: "absolute", bottom: 80, left: 24,
        fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.2)",
        lineHeight: 1.8,
      }}>
        <div>drag to orbit · scroll to zoom · drop .glb to load</div>
        <div>1-{EXPRESSIONS.length} keys for expressions</div>
      </div>

      {/* Keyboard handler */}
      <KeyboardHandler
        onExpression={setCurrentExpr}
        expressionCount={EXPRESSIONS.length}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
function KeyboardHandler({
  onExpression,
  expressionCount,
}: {
  onExpression: (idx: number) => void;
  expressionCount: number;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= expressionCount) {
        onExpression(num - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExpression, expressionCount]);

  return null;
}
