"use client";

import { useRef, useMemo, useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import type { Vision } from "../lib/types";

// ── Ambient particles / mist ──
function AmbientParticles({ count = 200 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 12,
        z: (Math.random() - 0.5) * 14 - 2,
        speed: 0.05 + Math.random() * 0.15,
        offset: Math.random() * Math.PI * 2,
        scale: 0.008 + Math.random() * 0.025,
        hue: Math.random(),
      })),
    [count]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.8,
        p.y + Math.cos(t * p.speed * 0.6 + p.offset) * 0.5,
        p.z + Math.sin(t * p.speed * 0.4 + p.offset * 2) * 0.3
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#7c6cff"
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// ── Shrine pedestal ──
function ShrinePedestal() {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(t * 0.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2.5, 0]}>
      {/* Main pedestal body */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.2, 1.6, 1, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.3}
          emissive="#2a1a4e"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Top platform */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[1.3, 1.2, 0.1, 32]} />
        <meshStandardMaterial
          color="#2a2040"
          metalness={0.9}
          roughness={0.2}
          emissive="#4a2a8e"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Base */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[1.8, 2, 0.1, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.7}
          roughness={0.4}
          emissive="#1a1a3e"
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Volumetric glow around pedestal */}
      <mesh ref={glowRef} position={[0, 0.8, 0]} scale={[3, 2.5, 3]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#6a4aff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ── Micro-orbs orbiting a vision orb ──
function MicroOrbs({
  actions,
  synchronicities,
  radius,
}: {
  actions: number;
  synchronicities: number;
  radius: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const total = actions + synchronicities;

  const orbs = useMemo(() => {
    const result = [];
    for (let i = 0; i < total; i++) {
      const isAction = i < actions;
      const angle = (i / Math.max(total, 1)) * Math.PI * 2;
      result.push({
        angle,
        speed: 0.3 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.5,
        color: isAction ? "#ffaa44" : "#44aaff",
      });
    }
    return result;
  }, [actions, synchronicities, total]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    orbs.forEach((orb, i) => {
      if (children[i]) {
        const a = orb.angle + t * orb.speed;
        children[i].position.set(
          Math.cos(a) * radius,
          Math.sin(a + orb.offset) * radius * 0.3 + orb.tilt,
          Math.sin(a) * radius
        );
      }
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Hover label that fades in/out ──
function OrbLabel({
  text,
  yOffset,
  hovered,
}: {
  text: string;
  yOffset: number;
  hovered: boolean;
}) {
  const textRef = useRef<THREE.Mesh>(null!);
  const opacityRef = useRef(0);

  useFrame(({ camera }, delta) => {
    const target = hovered ? 0.75 : 0;
    opacityRef.current += (target - opacityRef.current) * Math.min(delta * 6, 1);
    if (textRef.current) {
      const o = opacityRef.current;
      (textRef.current as unknown as { fillOpacity: number }).fillOpacity = o;
      // Hide mesh entirely when near-invisible to prevent black silhouette
      textRef.current.visible = o > 0.01;
      // Billboard: always face the camera
      textRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <Text
      ref={textRef}
      visible={false}
      position={[0, yOffset, 0]}
      fontSize={0.15}
      color="white"
      anchorX="center"
      anchorY="top"
      maxWidth={2.2}
      fillOpacity={0}
      font={undefined}
    >
      {text}
    </Text>
  );
}

// ── Vision orb ──
function VisionOrb({
  vision,
  orbitRadius,
  orbitSpeed,
  orbitOffset,
  baseY,
  yDrift,
  actions,
  synchronicities,
  onClick,
}: {
  vision: Vision;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  baseY: number;
  yDrift: number;
  actions: number;
  synchronicities: number;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const hue = vision.color_hue / 360;
  const color = useMemo(() => new THREE.Color().setHSL(hue, 0.7, 0.5), [hue]);
  const emissiveColor = useMemo(
    () => new THREE.Color().setHSL(hue, 0.8, 0.35),
    [hue]
  );

  const isFulfilled = vision.is_fulfilled;
  const baseScale = isFulfilled ? 0.55 : 0.42;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Slow orbital movement above the shrine
    if (groupRef.current) {
      const angle = orbitOffset + t * orbitSpeed;
      groupRef.current.position.set(
        Math.cos(angle) * orbitRadius,
        baseY + Math.sin(t * 0.4 + orbitOffset) * yDrift,
        Math.sin(angle) * orbitRadius
      );
    }

    if (meshRef.current) {
      if (isFulfilled) {
        const shimmer = Math.sin(t * 3) * 0.05 + 1;
        meshRef.current.scale.setScalar(baseScale * shimmer);
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.3;
      } else {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.5 + Math.sin(t * 1.5) * 0.15;
      }
    }
    if (haloRef.current && isFulfilled) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(t * 2) * 0.04;
      haloRef.current.rotation.y = t * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main orb — clickable + hoverable */}
      <mesh
        ref={meshRef}
        scale={baseScale}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
          metalness={isFulfilled ? 0.9 : 0.3}
          roughness={isFulfilled ? 0.1 : 0.4}
          transparent
          opacity={0.85}
          envMapIntensity={isFulfilled ? 2 : 0.5}
        />
      </mesh>

      {/* Outer glow */}
      <mesh scale={baseScale * 1.6}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Fulfilled halo */}
      {isFulfilled && (
        <mesh ref={haloRef} scale={baseScale * 2.2}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Micro-orbs */}
      <MicroOrbs
        actions={actions}
        synchronicities={synchronicities}
        radius={baseScale * 1.8}
      />

      {/* Hover label — fades in/out */}
      <OrbLabel
        text={vision.title}
        yOffset={-(baseScale + 0.35)}
        hovered={hovered}
      />
    </group>
  );
}

// ── Orbital parameters for each orb ──
interface OrbitalParams {
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  baseY: number;
  yDrift: number;
}

function getOrbitalParams(count: number): OrbitalParams[] {
  if (count === 0) return [];

  const params: OrbitalParams[] = [];
  const baseRadius = count <= 2 ? 2 : Math.min(1.8 + count * 0.35, 4.5);

  for (let i = 0; i < count; i++) {
    const angleOffset = (i / count) * Math.PI * 2;
    // Vary radius slightly per orb so they don't all share the same ring
    const radiusVariance = 0.85 + (((i * 7 + 3) % count) / count) * 0.3;
    params.push({
      orbitRadius: baseRadius * radiusVariance,
      orbitSpeed: 0.06 + (i % 3) * 0.015,       // slow orbit, slightly varied
      orbitOffset: angleOffset,
      baseY: 0.8 + (i % 2) * 0.5,               // float above shrine
      yDrift: 0.15 + (i % 3) * 0.08,             // gentle vertical bob
    });
  }
  return params;
}

// ── Scene content ──
function SceneContent({
  visions,
  ledgerCounts,
  onSelectVision,
}: {
  visions: Vision[];
  ledgerCounts: Record<string, { actions: number; synchronicities: number }>;
  onSelectVision: (v: Vision) => void;
}) {
  const { camera } = useThree();

  const orbitalParams = useMemo(
    () => getOrbitalParams(visions.length),
    [visions.length]
  );

  // Set camera position
  useMemo(() => {
    camera.position.set(0, 2, 7);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 3]} intensity={0.4} color="#8866ff" />
      <pointLight position={[-3, 2, -3]} intensity={0.2} color="#4466ff" />
      <pointLight position={[3, -1, 2]} intensity={0.15} color="#aa66ff" />

      <ShrinePedestal />
      <AmbientParticles count={150} />

      {visions.map((v, i) => {
        const counts = ledgerCounts[v.id] || {
          actions: 0,
          synchronicities: 0,
        };
        const op = orbitalParams[i];
        return (
          <VisionOrb
            key={v.id}
            vision={v}
            orbitRadius={op.orbitRadius}
            orbitSpeed={op.orbitSpeed}
            orbitOffset={op.orbitOffset}
            baseY={op.baseY}
            yDrift={op.yDrift}
            actions={counts.actions}
            synchronicities={counts.synchronicities}
            onClick={() => onSelectVision(v)}
          />
        );
      })}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.15}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 4}
        maxDistance={12}
        minDistance={5}
      />

      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.8} />
      </EffectComposer>
    </>
  );
}

// ── Main export ──
export default function ShrineScene({
  visions,
  ledgerCounts,
  onSelectVision,
}: {
  visions: Vision[];
  ledgerCounts: Record<string, { actions: number; synchronicities: number }>;
  onSelectVision: (v: Vision) => void;
}) {
  const handleSelect = useCallback(
    (v: Vision) => onSelectVision(v),
    [onSelectVision]
  );

  return (
    <Canvas
      camera={{ position: [0, 2, 7], fov: 50 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ background: "black" }}
    >
      <SceneContent
        visions={visions}
        ledgerCounts={ledgerCounts}
        onSelectVision={handleSelect}
      />
    </Canvas>
  );
}
