"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";

// Sigmoid helper for opacity
function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

// SH DC component to RGB (spherical harmonics degree 0)
function shToRgb(sh: number) {
  // SH DC coefficient to color: C0 = 0.28209479177387814
  return Math.max(0, Math.min(1, sh * 0.28209479177387814 + 0.5));
}

interface GaussianData {
  positions: Float32Array;
  colors: Float32Array;
  opacities: Float32Array;
  sizes: Float32Array;
  count: number;
  center: THREE.Vector3;
  radius: number;
}

async function parseSHARPPly(url: string): Promise<GaussianData> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Parse ASCII header
  let headerEnd = 0;
  const decoder = new TextDecoder();
  for (let i = 0; i < bytes.length - 1; i++) {
    if (
      bytes[i] === 0x65 &&
      bytes[i + 1] === 0x6e &&
      bytes[i + 2] === 0x64 &&
      bytes[i + 3] === 0x5f
    ) {
      for (let j = i; j < bytes.length; j++) {
        if (bytes[j] === 0x0a) {
          headerEnd = j + 1;
          break;
        }
      }
      break;
    }
  }

  const headerText = decoder.decode(bytes.slice(0, headerEnd));
  const lines = headerText.split("\n");

  let vertexCount = 0;
  for (const line of lines) {
    if (line.startsWith("element vertex")) {
      vertexCount = parseInt(line.split(" ")[2]);
    }
  }

  console.log(`Parsing ${vertexCount} Gaussians`);

  const floatsPerVertex = 14;
  const dataView = new DataView(buffer, headerEnd);

  // Subsample for performance
  const maxPoints = 500000;
  const stride = vertexCount > maxPoints ? Math.ceil(vertexCount / maxPoints) : 1;
  const count = Math.ceil(vertexCount / stride);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const sizes = new Float32Array(count);

  // First pass: collect positions to compute center
  let sumX = 0, sumY = 0, sumZ = 0;
  let idx = 0;

  for (let i = 0; i < vertexCount; i += stride) {
    const offset = i * floatsPerVertex * 4;

    const x = dataView.getFloat32(offset + 0, true);
    const y = dataView.getFloat32(offset + 4, true);
    const z = dataView.getFloat32(offset + 8, true);
    const dc0 = dataView.getFloat32(offset + 12, true);
    const dc1 = dataView.getFloat32(offset + 16, true);
    const dc2 = dataView.getFloat32(offset + 20, true);
    const opacity = dataView.getFloat32(offset + 24, true);
    const scale0 = dataView.getFloat32(offset + 28, true);
    const scale1 = dataView.getFloat32(offset + 32, true);
    const scale2 = dataView.getFloat32(offset + 36, true);

    // Store raw (flipped Y/Z for OpenCV -> GL)
    const px = x;
    const py = -y;
    const pz = -z;

    positions[idx * 3] = px;
    positions[idx * 3 + 1] = py;
    positions[idx * 3 + 2] = pz;

    sumX += px;
    sumY += py;
    sumZ += pz;

    // SH DC to sRGB
    colors[idx * 3] = shToRgb(dc0);
    colors[idx * 3 + 1] = shToRgb(dc1);
    colors[idx * 3 + 2] = shToRgb(dc2);

    const alpha = sigmoid(opacity);
    opacities[idx] = alpha;

    // Point size from scale
    const meanScale = (Math.exp(scale0) + Math.exp(scale1) + Math.exp(scale2)) / 3;
    sizes[idx] = meanScale * 150;

    idx++;
  }

  // Compute center and re-center positions
  const cx = sumX / idx;
  const cy = sumY / idx;
  const cz = sumZ / idx;
  const center = new THREE.Vector3(cx, cy, cz);

  let maxDist = 0;
  for (let i = 0; i < idx; i++) {
    positions[i * 3] -= cx;
    positions[i * 3 + 1] -= cy;
    positions[i * 3 + 2] -= cz;
    const dx = positions[i * 3];
    const dy = positions[i * 3 + 1];
    const dz = positions[i * 3 + 2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) maxDist = dist;
  }

  console.log(`Center: (${cx.toFixed(3)}, ${cy.toFixed(3)}, ${cz.toFixed(3)}), radius: ${maxDist.toFixed(3)}`);

  return { positions, colors, opacities, sizes, count: idx, center, radius: maxDist };
}

function PointCloud({ url, onLoaded }: { url: string; onLoaded: (radius: number) => void }) {
  const [data, setData] = useState<GaussianData | null>(null);

  useEffect(() => {
    parseSHARPPly(url)
      .then((d) => {
        setData(d);
        onLoaded(d.radius);
      })
      .catch((err) => console.error("PLY parse error:", err));
  }, [url, onLoaded]);

  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(data.opacities, 1));
    geo.setAttribute("size", new THREE.BufferAttribute(data.sizes, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 16.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float falloff = 1.0 - smoothstep(0.2, 0.5, dist);
          gl_FragColor = vec4(vColor, vOpacity * falloff);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
    });
  }, []);

  if (!geometry) return null;
  return <points geometry={geometry} material={material} />;
}

function CameraSetup({ radius }: { radius: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const dist = radius * 1.5;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = radius * 0.01;
      camera.far = radius * 10;
      camera.updateProjectionMatrix();
    }
  }, [camera, radius]);
  return null;
}

export default function SplatViewerPage() {
  const [radius, setRadius] = useState<number | null>(null);
  const controlsRef = useRef<any>(null);

  const onLoaded = useCallback((r: number) => {
    setRadius(r);
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <div className="absolute top-6 left-6 z-10 text-white/80 font-light tracking-wide">
        <h1 className="text-xl mb-1">SHARP Point Cloud Viewer</h1>
        <p className="text-sm text-white/40">
          bee.ply &middot; scroll to zoom &middot; drag to orbit
        </p>
      </div>
      <Canvas
        camera={{ fov: 50, position: [0, 0, 3] }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <PointCloud url="/models/bee.ply" onLoaded={onLoaded} />
        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={radius ? radius * 0.2 : 0.1}
          maxDistance={radius ? radius * 5 : 50}
        />
        {radius && <CameraSetup radius={radius} />}
      </Canvas>
      {!radius && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white/50">
          Loading point cloud...
        </div>
      )}
    </div>
  );
}
