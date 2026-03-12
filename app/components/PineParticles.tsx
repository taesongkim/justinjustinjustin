'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PINE_PTS } from './pine-particles-data';

// ─── State defaults (from pine_bg.js) ────────────────────────────────────────
const STATE = {
  rotation: 0.15,
  totalCount: 150000,
  globalSpeed: 0.9,
  globalSize: 0.01,
  bloomStrength: 2.0,
  modelAlpha: 0.46,
  layers: [
    { id: 1, vis: true, ratio: 0.83, speed: 2.6, turb: 0.15, glow: 0.9, opacity: 0.82, color: '#c87a00', move: 'wiggle' as const, leash: 0.004 },
    { id: 2, vis: true, ratio: 0.10, speed: 1.6, turb: 2.3, glow: 1.4, opacity: 0.95, color: '#ffff00', move: 'pulse' as const, margin: 0.1, leash: 0.035 },
    { id: 3, vis: true, ratio: 0.10, speed: 1.5, turb: 1.8, glow: 3.0, opacity: 0.62, color: '#ff2200', move: 'pulse' as const, hoverOffset: 0.1, leash: 0.050 },
  ],
};

type Layer = (typeof STATE.layers)[number];
type MoveMode = 'wiggle' | 'pulse' | 'float' | 'drift' | 'swirl' | 'chaos';

interface SpawnPos {
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  fx: number; fy: number; fz: number;
}

interface ParticleSystem {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  phases: Float32Array;
  layer: Layer;
  spawnPositions: SpawnPos[];
  center: THREE.Vector3;
  size: THREE.Vector3;
  bbox: THREE.Box3;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function noise3(x: number, y: number, z: number) {
  return Math.sin(x * 1.3 + y * 0.9) * Math.cos(y * 1.1 + z * 0.7) * Math.sin(z * 1.5 + x * 0.8);
}

function makeGlowSprite(color: string, glowIntensity: number): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const r = size / 2;
  const grd = ctx.createRadialGradient(r, r, 0, r, r, r);

  const hex = color || '#7dffb3';
  const ri = parseInt(hex.slice(1, 3), 16);
  const gi = parseInt(hex.slice(3, 5), 16);
  const bi = parseInt(hex.slice(5, 7), 16);

  const coreAlpha = Math.min(1, 0.9 + glowIntensity * 0.1);
  const midAlpha = Math.min(1, glowIntensity * 0.5);
  const outerAlpha = Math.min(0.5, glowIntensity * 0.15);

  grd.addColorStop(0, `rgba(255,255,255,${coreAlpha})`);
  grd.addColorStop(0.15, `rgba(${ri},${gi},${bi},${Math.min(1, glowIntensity * 0.9)})`);
  grd.addColorStop(0.4, `rgba(${ri},${gi},${bi},${midAlpha})`);
  grd.addColorStop(0.7, `rgba(${ri},${gi},${bi},${outerAlpha})`);
  grd.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

function getMovement(
  mode: MoveMode, i: number, t: number, layer: Layer,
  pos: { x: number; y: number; z: number },
  spawnPos: SpawnPos,
  center: THREE.Vector3,
) {
  const turb = layer.turb;
  const spd = layer.speed * STATE.globalSpeed;
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  const dz = pos.z - center.z;

  switch (mode) {
    case 'wiggle': {
      const { sx, sy, sz, fx, fy, fz } = spawnPos;
      const n1 = noise3(sx + t * fx * 0.4, sy + t * 0.3, sz);
      const n2 = noise3(sy + t * fy * 0.35, sz + t * 0.28, sx + t * 0.2);
      const n3 = noise3(sz + t * fz * 0.38, sx + t * 0.25, sy + t * 0.32);
      return {
        vx: n1 * 0.006 * spd * turb,
        vy: n2 * 0.006 * spd * turb,
        vz: n3 * 0.006 * spd * turb,
      };
    }
    case 'pulse': {
      const pulse = Math.sin(t * 0.8 + i * 0.05) * 0.01 * spd;
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const nv = noise3(pos.x * 0.6 + t * 0.1, pos.y * 0.6, pos.z * 0.6 + t * 0.08) * turb;
      return {
        vx: (dx / mag) * pulse + nv * 0.003 * spd,
        vy: (dy / mag) * pulse + nv * 0.002 * spd,
        vz: (dz / mag) * pulse + nv * 0.003 * spd,
      };
    }
    case 'float': {
      const n = noise3(pos.x * 0.5 + t * 0.1, pos.y * 0.3, pos.z * 0.5 + t * 0.07) * turb;
      return {
        vx: Math.sin(t * 0.3 + i * 0.1) * 0.002 * spd + n * 0.003 * spd,
        vy: (0.004 + Math.sin(t * 0.5 + i * 0.2) * 0.002) * spd,
        vz: Math.cos(t * 0.25 + i * 0.15) * 0.002 * spd + n * 0.002 * spd,
      };
    }
    case 'drift': {
      const n = noise3(pos.x * 0.4 + t * 0.08, pos.y * 0.4, pos.z * 0.4 + t * 0.06) * turb;
      return {
        vx: 0.003 * spd + n * 0.004 * spd,
        vy: Math.sin(t * 0.4 + i * 0.3) * 0.003 * spd,
        vz: -0.002 * spd + n * 0.003 * spd,
      };
    }
    case 'swirl': {
      const r = Math.sqrt(dx * dx + dz * dz);
      const nv = noise3(pos.x * 0.3 + t * 0.05, pos.y * 0.3, pos.z * 0.3 + t * 0.04) * turb;
      return {
        vx: (-dz / (r + 0.1) * 0.008 + nv * 0.005) * spd,
        vy: Math.sin(t * 0.6 + i * 0.2) * 0.003 * spd,
        vz: (dx / (r + 0.1) * 0.008 + nv * 0.005) * spd,
      };
    }
    case 'chaos': {
      const n1 = noise3(pos.x * 0.7 + t * 0.15, pos.y * 0.5 + t * 0.1, pos.z * 0.6) * turb;
      const n2 = noise3(pos.y * 0.6 + t * 0.12, pos.z * 0.7 + t * 0.09, pos.x * 0.5) * turb;
      const n3 = noise3(pos.z * 0.5 + t * 0.11, pos.x * 0.6 + t * 0.08, pos.y * 0.7) * turb;
      return { vx: n1 * 0.008 * spd, vy: n2 * 0.008 * spd, vz: n3 * 0.008 * spd };
    }
    default:
      return { vx: 0, vy: 0, vz: 0 };
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export function PineParticles({ className, ...props }: Omit<React.ComponentProps<'div'>, 'ref'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Load model points from pre-baked data ──
    const modelPoints: THREE.Vector3[] = [];
    for (let i = 0; i < PINE_PTS.length; i += 3) {
      modelPoints.push(new THREE.Vector3(PINE_PTS[i], PINE_PTS[i + 1], PINE_PTS[i + 2]));
    }

    // ── Compute bounding box from model points ──
    const modelBoundingBox = new THREE.Box3();
    modelPoints.forEach(p => modelBoundingBox.expandByPoint(p));

    const bboxCenter = modelBoundingBox.getCenter(new THREE.Vector3());
    const bboxSize = modelBoundingBox.getSize(new THREE.Vector3());

    // ── L1 shuffled index pool ──
    let l1IndexPool = new Int32Array(0);
    let l1PoolCursor = 0;

    function rebuildL1Pool(count: number) {
      const n = modelPoints.length;
      if (n === 0) { l1IndexPool = new Int32Array(0); return; }
      l1IndexPool = new Int32Array(count);
      for (let i = 0; i < count; i++) l1IndexPool[i] = i % n;
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = l1IndexPool[i]; l1IndexPool[i] = l1IndexPool[j]; l1IndexPool[j] = tmp;
      }
      l1PoolCursor = 0;
    }

    // ── Spawn particle ──
    function spawnParticle(layer: Layer, _idx: number): THREE.Vector3 {
      const bbox = modelBoundingBox;
      const center = bboxCenter;

      if (layer.id === 1) {
        if (modelPoints.length > 0) {
          const mi = l1IndexPool.length > 0
            ? l1IndexPool[l1PoolCursor++ % l1IndexPool.length]
            : Math.floor(Math.random() * modelPoints.length);
          const mp = modelPoints[mi].clone();
          const jitter = 0.008;
          mp.x += (Math.random() - 0.5) * jitter;
          mp.y += (Math.random() - 0.5) * jitter;
          mp.z += (Math.random() - 0.5) * jitter;
          return mp;
        }
      } else if (layer.id === 2) {
        if (modelPoints.length > 0) {
          const mi = Math.floor(Math.random() * modelPoints.length);
          const mp = modelPoints[mi].clone();
          const outward = mp.clone().sub(center).normalize();
          const margin = 'margin' in layer ? (layer as any).margin : 0.8;
          const offset = margin * 0.1;
          mp.addScaledVector(outward, offset);
          mp.x += (Math.random() - 0.5) * 0.02;
          mp.y += (Math.random() - 0.5) * 0.02;
          mp.z += (Math.random() - 0.5) * 0.02;
          return mp;
        }
      } else {
        if (modelPoints.length > 0) {
          const mi = Math.floor(Math.random() * modelPoints.length);
          const mp = modelPoints[mi].clone();
          const outward = mp.clone().sub(center).normalize();
          const hoverOffset = 'hoverOffset' in layer ? (layer as any).hoverOffset : 2.5;
          mp.addScaledVector(outward, hoverOffset);
          mp.x += (Math.random() - 0.5) * 0.04;
          mp.y += (Math.random() - 0.5) * 0.04;
          mp.z += (Math.random() - 0.5) * 0.04;
          return mp;
        }
        const outerR = 'hoverOffset' in layer ? (layer as any).hoverOffset : 2.5;
        const r = outerR * (0.8 + Math.random() * 0.4);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return new THREE.Vector3(
          center.x + r * Math.sin(phi) * Math.cos(theta),
          center.y + r * Math.cos(phi) * 0.7,
          center.z + r * Math.sin(phi) * Math.sin(theta),
        );
      }

      return new THREE.Vector3(
        THREE.MathUtils.randFloat(bbox.min.x, bbox.max.x),
        THREE.MathUtils.randFloat(bbox.min.y, bbox.max.y),
        THREE.MathUtils.randFloat(bbox.min.z, bbox.max.z),
      );
    }

    // ── Check boundary ──
    function checkBoundary(layer: Layer, positions: ArrayLike<number>, ix: number, iy: number, iz: number) {
      const x = positions[ix], y = positions[iy], z = positions[iz];
      const bbox = modelBoundingBox;

      if (layer.id === 1) {
        const margin = 0.12;
        return (x < bbox.min.x - margin || x > bbox.max.x + margin ||
          y < bbox.min.y - margin || y > bbox.max.y + margin ||
          z < bbox.min.z - margin || z > bbox.max.z + margin);
      } else if (layer.id === 2) {
        const margin = 0.3;
        return (x < bbox.min.x - margin || x > bbox.max.x + margin ||
          y < bbox.min.y - margin || y > bbox.max.y + margin ||
          z < bbox.min.z - margin || z > bbox.max.z + margin);
      } else {
        const hoverOffset = 'hoverOffset' in layer ? (layer as any).hoverOffset : 2.5;
        const margin = hoverOffset * 1.5;
        return (x < bbox.min.x - margin || x > bbox.max.x + margin ||
          y < bbox.min.y - margin || y > bbox.max.y + margin ||
          z < bbox.min.z - margin || z > bbox.max.z + margin);
      }
    }

    // ── Build layer particles ──
    function buildLayerParticles(layer: Layer, count: number): ParticleSystem {
      const positions = new Float32Array(count * 3);
      const velocities: THREE.Vector3[] = [];
      const phases = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const pos = spawnParticle(layer, i);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        phases[i] = Math.random() * Math.PI * 2;
        velocities.push(new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
        ));
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const sprite = makeGlowSprite(layer.color, layer.glow);
      const mat = new THREE.PointsMaterial({
        map: sprite,
        size: STATE.globalSize,
        sizeAttenuation: true,
        transparent: true,
        opacity: layer.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: false,
      });

      const rgb = hexToRgb(layer.color);
      mat.color.setRGB(rgb.r, rgb.g, rgb.b);

      const points = new THREE.Points(geo, mat);
      points.renderOrder = 1;
      points.visible = layer.vis;

      return {
        points, velocities, phases, layer,
        spawnPositions: Array.from({ length: count }, (_, i) => ({
          x: positions[i * 3], y: positions[i * 3 + 1], z: positions[i * 3 + 2],
          sx: Math.random() * 100, sy: Math.random() * 100, sz: Math.random() * 100,
          fx: 0.6 + Math.random() * 0.8, fy: 0.5 + Math.random() * 0.9, fz: 0.55 + Math.random() * 0.85,
        })),
        center: bboxCenter.clone(),
        size: bboxSize.clone(),
        bbox: modelBoundingBox.clone(),
      };
    }

    // ── Scene setup ──
    const clock = new THREE.Clock();
    let time = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030a06, 0.05);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 2, 8);

    // Lights
    const amb = new THREE.AmbientLight(0x112211, 0.5);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0x7dffb3, 0.8);
    dir.position.set(3, 8, 5);
    scene.add(dir);
    const pt = new THREE.PointLight(0x4eff8c, 0.6, 20);
    pt.position.set(0, 3, 0);
    scene.add(pt);

    // Scene group (rotates everything)
    const sceneGroup = new THREE.Group();
    sceneGroup.position.y = 1.0;
    scene.add(sceneGroup);

    // ── Build all particles ──
    const ratios = STATE.layers.map(l => l.ratio);
    const ratioSum = ratios.reduce((a, b) => a + b, 0) || 1;
    const counts = ratios.map(r => Math.round(STATE.totalCount * r / ratioSum));

    rebuildL1Pool(counts[0]);

    const particleSystems: ParticleSystem[] = [];
    STATE.layers.forEach((layer, li) => {
      const ps = buildLayerParticles(layer, counts[li]);
      particleSystems.push(ps);
      sceneGroup.add(ps.points);
    });

    // Point camera at model center
    camera.lookAt(0, 1, 0);

    // ── Animation loop ──
    let animationId = 0;

    function animate() {
      animationId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      time += dt;

      // Slow rotation
      sceneGroup.rotation.y += STATE.rotation * 0.002;

      // Update particles
      particleSystems.forEach(ps => {
        if (!ps.points.visible) return;
        const positions = ps.points.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        const layer = ps.layer;
        const center = ps.center;

        for (let i = 0; i < count; i++) {
          const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
          const pos = { x: positions[ix], y: positions[iy], z: positions[iz] };
          const sp = ps.spawnPositions[i];

          const mv = getMovement(layer.move as MoveMode, i, time, layer, pos, sp, center);

          positions[ix] += mv.vx;
          positions[iy] += mv.vy;
          positions[iz] += mv.vz;

          // Leash: pull back toward spawn if too far
          if (layer.leash !== undefined) {
            const leashRadius = layer.leash;
            const ox = positions[ix] - sp.x;
            const oy = positions[iy] - sp.y;
            const oz = positions[iz] - sp.z;
            const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
            if (dist > leashRadius) {
              const pullStrength = layer.id === 1 ? 0.4 : layer.id === 2 ? 0.35 : 0.25;
              const pull = (dist - leashRadius) / dist * pullStrength;
              positions[ix] -= ox * pull;
              positions[iy] -= oy * pull;
              positions[iz] -= oz * pull;
            }
          }

          // Boundary respawn
          if (checkBoundary(layer, positions, ix, iy, iz)) {
            const np = spawnParticle(layer, i);
            positions[ix] = np.x;
            positions[iy] = np.y;
            positions[iz] = np.z;
            ps.spawnPositions[i] = {
              x: np.x, y: np.y, z: np.z,
              sx: Math.random() * 100, sy: Math.random() * 100, sz: Math.random() * 100,
              fx: 0.6 + Math.random() * 0.8, fy: 0.5 + Math.random() * 0.9, fz: 0.55 + Math.random() * 0.85,
            };
          }
        }

        ps.points.geometry.attributes.position.needsUpdate = true;
      });

      // Bloom exposure
      renderer.toneMappingExposure = 1.0 + STATE.bloomStrength * 0.4;
      renderer.render(scene, camera);
    }

    animate();

    // ── Resize ──
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationId);

      particleSystems.forEach(ps => {
        ps.points.geometry.dispose();
        if (ps.points.material instanceof THREE.PointsMaterial) {
          ps.points.material.map?.dispose();
          ps.points.material.dispose();
        }
      });

      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      {...props}
    />
  );
}
