"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, DepthOfField } from "@react-three/postprocessing";
import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Trail config
// ---------------------------------------------------------------------------
const TRAIL_LENGTH = 8;
const TRAIL_DT = 0.04;

// ---------------------------------------------------------------------------
// Vortex config — Chakra Bloom with spherical distribution
// ---------------------------------------------------------------------------
const PARTICLE_COUNT = 1800;
const SPHERE_RADIUS = 4.55; // average radius of the fuzzy sphere (tightened 35%)
const RADIUS_FUZZ = 0.45; // how spread out the shell is (0 = hard shell, 1 = very fuzzy)
const SPEED = 1.04; // 0.8 * 1.3 = 30% faster
const PARTICLE_SIZE = 2.0;
const SIZE_VARIANCE = 0.35;
const OPACITY = 0.75;
const TRAIL_STRETCH = 0.8;

const COLOR1 = new THREE.Color("#ff44aa");
const COLOR2 = new THREE.Color("#44ffaa");
const COLOR3 = new THREE.Color("#ffff44");

// ---------------------------------------------------------------------------
// Spherical orbit position calculator
// Each particle orbits on a great circle tilted at its own inclination.
// theta0 = initial position on the orbit
// phi0 = azimuthal tilt of the orbital plane
// inclination = polar tilt of the orbital plane
// r = distance from center
// ---------------------------------------------------------------------------
function calcParticlePos(
  theta0: number,
  phi0: number,
  inclination: number,
  r: number,
  speedFactor: number,
  wobblePhase: number,
  wobbleAmount: number,
  t: number,
  out: { x: number; y: number; z: number }
) {
  // Orbital angle at time t
  const theta = theta0 + t * SPEED * speedFactor;

  // Position on a unit circle in the orbital plane (before tilt)
  const ox = Math.cos(theta);
  const oy = Math.sin(theta);

  // Rotate orbital plane by inclination around X axis, then by phi0 around Z axis
  // First: tilt by inclination around X
  const tx = ox;
  const ty = oy * Math.cos(inclination);
  const tz = oy * Math.sin(inclination);

  // Then: rotate by phi0 around Z
  const fx = tx * Math.cos(phi0) - ty * Math.sin(phi0);
  const fy = tx * Math.sin(phi0) + ty * Math.cos(phi0);
  const fz = tz;

  // Apply radius with subtle wobble
  const rWobble = r * (1 + wobbleAmount * Math.sin(t * 1.5 + wobblePhase));

  out.x = fx * rWobble;
  out.y = fy * rWobble;
  out.z = fz * rWobble;
}

// ---------------------------------------------------------------------------
// Tunable params
// ---------------------------------------------------------------------------
interface SceneParams {
  structureColor: string;
  structureOpacity: number;
  structureGlow: number;
  structureVisible: boolean;
  vortexVisible: boolean;
  dofEnabled: boolean;
  dofFocusDistance: number; // 0–1 normalized distance to focus plane
  dofFocalLength: number; // lens focal length — controls how narrow the DOF band is
  dofBokehScale: number; // size/intensity of the bokeh blur circles
}

const DEFAULT_PARAMS: SceneParams = {
  structureColor: "#3388cc",
  structureOpacity: 0.14,
  structureGlow: 0.87,
  structureVisible: true,
  vortexVisible: true,
  dofEnabled: true,
  dofFocusDistance: 0.004,
  dofFocalLength: 0.2,
  dofBokehScale: 6.0,
};

const ParamsContext = createContext<SceneParams>(DEFAULT_PARAMS);

// ---------------------------------------------------------------------------
// Mesh data types
// ---------------------------------------------------------------------------
interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
  center: THREE.Vector3;
}

// ---------------------------------------------------------------------------
// Laplacian smoothing — moves each vertex toward the average of its neighbors
// ---------------------------------------------------------------------------
function laplacianSmooth(
  positions: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  iterations: number,
  factor: number
) {
  // Build adjacency list
  const neighbors: Set<number>[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) neighbors[i] = new Set();
  const triCount = indices.length / 3;
  for (let t = 0; t < triCount; t++) {
    const a = indices[t * 3];
    const b = indices[t * 3 + 1];
    const c = indices[t * 3 + 2];
    neighbors[a].add(b);
    neighbors[a].add(c);
    neighbors[b].add(a);
    neighbors[b].add(c);
    neighbors[c].add(a);
    neighbors[c].add(b);
  }

  const temp = new Float32Array(vertexCount * 3);

  for (let iter = 0; iter < iterations; iter++) {
    temp.set(positions);
    for (let i = 0; i < vertexCount; i++) {
      const nbrs = neighbors[i];
      if (nbrs.size === 0) continue;
      let ax = 0,
        ay = 0,
        az = 0;
      nbrs.forEach((j) => {
        ax += positions[j * 3];
        ay += positions[j * 3 + 1];
        az += positions[j * 3 + 2];
      });
      const n = nbrs.size;
      temp[i * 3] = positions[i * 3] + factor * (ax / n - positions[i * 3]);
      temp[i * 3 + 1] =
        positions[i * 3 + 1] + factor * (ay / n - positions[i * 3 + 1]);
      temp[i * 3 + 2] =
        positions[i * 3 + 2] + factor * (az / n - positions[i * 3 + 2]);
    }
    positions.set(temp);
  }
}

function useMeshData(url: string): MeshData | null {
  const [data, setData] = useState<MeshData | null>(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        const view = new DataView(buf);
        const vertexCount = view.getUint32(0, true);
        const indexCount = view.getUint32(4, true);

        const positions = new Float32Array(buf, 8, vertexCount * 3);
        const indices = new Uint32Array(
          buf,
          8 + vertexCount * 3 * 4,
          indexCount
        );

        // Center positions
        let cx = 0,
          cy = 0,
          cz = 0;
        for (let i = 0; i < vertexCount; i++) {
          cx += positions[i * 3];
          cy += positions[i * 3 + 1];
          cz += positions[i * 3 + 2];
        }
        cx /= vertexCount;
        cy /= vertexCount;
        cz /= vertexCount;
        for (let i = 0; i < vertexCount; i++) {
          positions[i * 3] -= cx;
          positions[i * 3 + 1] -= cy;
          positions[i * 3 + 2] -= cz;
        }

        // Gentle smoothing to soften angular joints without collapsing thin strands
        laplacianSmooth(positions, indices, vertexCount, 3, 0.25);

        setData({
          positions,
          indices,
          vertexCount,
          indexCount,
          center: new THREE.Vector3(cx, cy, cz),
        });
      });
  }, [url]);

  return data;
}

// ---------------------------------------------------------------------------
// Structure layer — solid inner fill + scaled glow shells for outer glow
// ---------------------------------------------------------------------------
// Glow shells: render the mesh at progressively larger scales along normals
// with decreasing opacity for a feathered volumetric glow effect.
const GLOW_SHELLS = [
  { expand: 0.3, opacity: 0.12 },
  { expand: 0.7, opacity: 0.07 },
  { expand: 1.2, opacity: 0.04 },
  { expand: 2.0, opacity: 0.02 },
  { expand: 3.0, opacity: 0.01 },
];

function StructureLayer({ meshData }: { meshData: MeshData | null }) {
  const params = useContext(ParamsContext);

  const geo = useMemo(() => {
    if (!meshData) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(meshData.positions, 3)
    );
    g.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [meshData]);

  // Feathered fill shader — fades at edges based on view angle
  const fillMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color("#3388cc") },
        uOpacity: { value: 0.06 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          // Facing ratio: 1.0 when facing camera, 0.0 at edges
          float facing = abs(dot(vNormal, vViewDir));
          // Smooth feather: ramp from 0 at edge to full at face
          float feather = smoothstep(0.0, 0.6, facing);
          float alpha = uOpacity * feather;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Update fill uniforms
  useEffect(() => {
    fillMaterial.uniforms.uColor.value.set(params.structureColor);
    fillMaterial.uniforms.uOpacity.value = params.structureOpacity;
  }, [params.structureColor, params.structureOpacity, fillMaterial]);

  // Pre-build expanded geometries for glow shells (push verts along normals)
  const glowGeos = useMemo(() => {
    if (!geo) return [];
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const normAttr = geo.getAttribute("normal") as THREE.BufferAttribute;
    const index = geo.getIndex();
    if (!posAttr || !normAttr || !index) return [];

    return GLOW_SHELLS.map((shell) => {
      const g = new THREE.BufferGeometry();
      const expanded = new Float32Array(posAttr.array.length);
      for (let i = 0; i < posAttr.count; i++) {
        expanded[i * 3] =
          posAttr.array[i * 3] + normAttr.array[i * 3] * shell.expand;
        expanded[i * 3 + 1] =
          posAttr.array[i * 3 + 1] + normAttr.array[i * 3 + 1] * shell.expand;
        expanded[i * 3 + 2] =
          posAttr.array[i * 3 + 2] + normAttr.array[i * 3 + 2] * shell.expand;
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(expanded, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    });
  }, [geo]);

  // Glow shell shader materials — each shell also feathers at edges
  const glowMaterials = useMemo(() => {
    return GLOW_SHELLS.map((shell) => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#3388cc") },
          uOpacity: { value: shell.opacity * 0.4 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPos.xyz);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            float facing = abs(dot(vNormal, vViewDir));
            // Outer shells fade more aggressively at edges for soft feathering
            float feather = smoothstep(0.0, 0.45, facing);
            float alpha = uOpacity * feather;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
  }, []);

  // Update glow shell uniforms
  useEffect(() => {
    glowMaterials.forEach((mat, i) => {
      mat.uniforms.uColor.value.set(params.structureColor);
      mat.uniforms.uOpacity.value =
        GLOW_SHELLS[i].opacity * params.structureGlow;
    });
  }, [params.structureColor, params.structureGlow, glowMaterials]);

  if (!params.structureVisible || !geo) return null;

  return (
    <group>
      {/* Inner fill — feathered edges */}
      <mesh geometry={geo} material={fillMaterial} />
      {/* Glow shells — feathered outer glow */}
      {glowGeos.map((shellGeo, i) => (
        <mesh key={i} geometry={shellGeo} material={glowMaterials[i]} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Spherical Vortex Particles with trailing afterglow
// ---------------------------------------------------------------------------
function VortexParticles() {
  const params = useContext(ParamsContext);
  const pointsRef = useRef<THREE.Points>(null);

  // Per-particle fixed state for spherical orbits
  const particleState = useRef<{
    theta0: Float32Array; // initial orbital angle
    phi0: Float32Array; // azimuthal tilt of orbital plane
    inclination: Float32Array; // polar tilt of orbital plane
    radius: Float32Array; // distance from center
    speedFactors: Float32Array;
    wobblePhase: Float32Array;
    wobbleAmount: Float32Array;
    baseSizes: Float32Array;
    colorBlends: Float32Array;
  } | null>(null);

  const initParticles = useCallback(() => {
    const n = PARTICLE_COUNT;
    const theta0 = new Float32Array(n);
    const phi0 = new Float32Array(n);
    const inclination = new Float32Array(n);
    const radius = new Float32Array(n);
    const speedFactors = new Float32Array(n);
    const wobblePhase = new Float32Array(n);
    const wobbleAmount = new Float32Array(n);
    const baseSizes = new Float32Array(n);
    const colorBlends = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      theta0[i] = Math.random() * Math.PI * 2;
      phi0[i] = Math.random() * Math.PI * 2;
      // Distribute inclinations across all orientations for a sphere
      inclination[i] = Math.acos(2 * Math.random() - 1);
      // Fuzzy shell: radius clustered around SPHERE_RADIUS with gaussian-ish spread
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2);
      radius[i] = SPHERE_RADIUS * (1 + gaussian * RADIUS_FUZZ * 0.5);
      radius[i] = Math.max(radius[i], SPHERE_RADIUS * 0.15); // prevent center clumping

      speedFactors[i] = 0.6 + Math.random() * 0.8;
      wobblePhase[i] = Math.random() * Math.PI * 2;
      wobbleAmount[i] = 0.05 + Math.random() * 0.12;
      baseSizes[i] =
        PARTICLE_SIZE *
        (1 - SIZE_VARIANCE + Math.random() * SIZE_VARIANCE * 2);
      colorBlends[i] = Math.random();
    }
    particleState.current = {
      theta0,
      phi0,
      inclination,
      radius,
      speedFactors,
      wobblePhase,
      wobbleAmount,
      baseSizes,
      colorBlends,
    };
    return n;
  }, []);

  const geo = useMemo(() => {
    const n = initParticles();
    const total = n * (1 + TRAIL_LENGTH);

    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const alphas = new Float32Array(total);
    const sizes = new Float32Array(total);

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));
    g.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    return g;
  }, [initParticles]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          // Multi-layer glow: bright core + soft outer halo
          float core = smoothstep(0.5, 0.05, d);
          float halo = smoothstep(0.5, 0.0, d) * 0.4;
          float glow = core + halo;
          float alpha = glow * vAlpha * uOpacity;
          vec3 brightened = vColor + vec3(0.35) * core * core;
          gl_FragColor = vec4(brightened, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const tmpPos = useRef({ x: 0, y: 0, z: 0 });

  useFrame(({ clock }) => {
    if (!pointsRef.current || !particleState.current || !geo) return;
    const state = particleState.current;
    const t = clock.getElapsedTime();
    const n = PARTICLE_COUNT;
    const stride = 1 + TRAIL_LENGTH;

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const alphaAttr = geo.getAttribute("alpha") as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;
    const alp = alphaAttr.array as Float32Array;
    const siz = sizeAttr.array as Float32Array;

    const c1 = COLOR1;
    const c2 = COLOR2;
    const c3 = COLOR3;
    const p = tmpPos.current;

    for (let i = 0; i < n; i++) {
      const baseIdx = i * stride;
      const blend = state.colorBlends[i];

      // Base color
      let cr: number, cg: number, cb: number;
      if (blend < 0.5) {
        const f = blend * 2;
        cr = c1.r + (c2.r - c1.r) * f;
        cg = c1.g + (c2.g - c1.g) * f;
        cb = c1.b + (c2.b - c1.b) * f;
      } else {
        const f = (blend - 0.5) * 2;
        cr = c2.r + (c3.r - c2.r) * f;
        cg = c2.g + (c3.g - c2.g) * f;
        cb = c2.b + (c3.b - c2.b) * f;
      }

      // Head + trail
      for (let trail = 0; trail <= TRAIL_LENGTH; trail++) {
        const idx = baseIdx + trail;
        const tOffset = t - trail * TRAIL_DT * TRAIL_STRETCH;

        calcParticlePos(
          state.theta0[i],
          state.phi0[i],
          state.inclination[i],
          state.radius[i],
          state.speedFactors[i],
          state.wobblePhase[i],
          state.wobbleAmount[i],
          tOffset,
          p
        );

        pos[idx * 3] = p.x;
        pos[idx * 3 + 1] = p.y;
        pos[idx * 3 + 2] = p.z;

        const trailFade = 1 - trail / (TRAIL_LENGTH + 1);
        const fadeCurve = trailFade * trailFade;

        col[idx * 3] = cr * (0.35 + 0.65 * fadeCurve);
        col[idx * 3 + 1] = cg * (0.35 + 0.65 * fadeCurve);
        col[idx * 3 + 2] = cb * (0.35 + 0.65 * fadeCurve);

        alp[idx] = OPACITY * fadeCurve;
        siz[idx] = state.baseSizes[i] * (0.25 + 0.75 * fadeCurve);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  if (!params.vortexVisible) return null;

  return (
    <group position={[0, 0, 22]}>
      <pointLight color="#ff55aa" intensity={1.5} distance={45} decay={2} />
      <points
        ref={pointsRef}
        geometry={geo}
        material={material}
        frustumCulled={false}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Axis Labels
// ---------------------------------------------------------------------------
function AxisLabels() {
  const axisLength = 30;
  const labelOffset = 35;

  return (
    <group position={[0, 0, -100]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, axisLength, 0, 0]), 3]}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff4444" transparent opacity={0.5} />
      </line>
      <sprite position={[labelOffset, 0, 0]} scale={[8, 4, 1]}>
        <spriteMaterial map={makeTextTexture("X", "#ff4444")} transparent />
      </sprite>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, axisLength, 0]), 3]}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#44ff44" transparent opacity={0.5} />
      </line>
      <sprite position={[0, labelOffset, 0]} scale={[8, 4, 1]}>
        <spriteMaterial map={makeTextTexture("Y", "#44ff44")} transparent />
      </sprite>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, axisLength]), 3]}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4488ff" transparent opacity={0.5} />
      </line>
      <sprite position={[0, 0, labelOffset]} scale={[8, 4, 1]}>
        <spriteMaterial
          map={makeTextTexture("Z (up)", "#4488ff")}
          transparent
        />
      </sprite>
    </group>
  );
}

function makeTextTexture(text: string, color: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.font = "bold 40px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Control Panel
// ---------------------------------------------------------------------------
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: color || "rgba(255,255,255,0.6)",
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span>{value.toFixed(step < 0.01 ? 3 : step < 0.1 ? 2 : 1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color || "#666" }}
      />
    </div>
  );
}

function ControlPanel({
  params,
  setParams,
  cameraPos,
  cameraTarget,
}: {
  params: SceneParams;
  setParams: React.Dispatch<React.SetStateAction<SceneParams>>;
  cameraPos: string;
  cameraTarget: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const set = useCallback(
    (key: keyof SceneParams, value: number | string | boolean) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [setParams]
  );

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          padding: "6px 12px",
          fontSize: 11,
          fontFamily: "monospace",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6,
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
        }}
      >
        controls
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 260,
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        background: "rgba(0,0,0,0.85)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: 16,
        fontFamily: "monospace",
        fontSize: 12,
        color: "#ddd",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          controls
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            fontSize: 16,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* ── STRUCTURE ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: params.structureColor,
              display: "inline-block",
              boxShadow: `0 0 6px ${params.structureColor}`,
            }}
          />
          nervous system
          <label
            style={{ marginLeft: "auto", fontSize: 10, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={params.structureVisible}
              onChange={(e) => set("structureVisible", e.target.checked)}
              style={{ marginRight: 4 }}
            />
            on
          </label>
        </div>
        <Slider
          label="fill opacity"
          value={params.structureOpacity}
          min={0}
          max={0.3}
          step={0.005}
          onChange={(v) => set("structureOpacity", v)}
          color="#888"
        />
        <Slider
          label="edge glow"
          value={params.structureGlow}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set("structureGlow", v)}
          color="#88bbff"
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            color
          </span>
          <input
            type="color"
            value={params.structureColor}
            onChange={(e) => set("structureColor", e.target.value)}
            style={{
              width: 24,
              height: 18,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* ── VORTEX ── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 14,
        }}
      >
        <div style={labelStyle}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff44aa",
              display: "inline-block",
              boxShadow: "0 0 6px #ff44aa",
            }}
          />
          heart vortex
          <label
            style={{ marginLeft: "auto", fontSize: 10, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={params.vortexVisible}
              onChange={(e) => set("vortexVisible", e.target.checked)}
              style={{ marginRight: 4 }}
            />
            on
          </label>
        </div>
        <div
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            fontStyle: "italic",
          }}
        >
          chakra bloom · spherical orbit
        </div>
      </div>

      {/* ── DEPTH OF FIELD ── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 14,
          marginTop: 14,
        }}
      >
        <div style={labelStyle}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#aa88ff",
              display: "inline-block",
              boxShadow: "0 0 6px #aa88ff",
            }}
          />
          depth of field
          <label
            style={{ marginLeft: "auto", fontSize: 10, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={params.dofEnabled}
              onChange={(e) => set("dofEnabled", e.target.checked)}
              style={{ marginRight: 4 }}
            />
            on
          </label>
        </div>
        <Slider
          label="focus distance"
          value={params.dofFocusDistance}
          min={0}
          max={0.1}
          step={0.001}
          onChange={(v) => set("dofFocusDistance", v)}
          color="#aa88ff"
        />
        <Slider
          label="focal length"
          value={params.dofFocalLength}
          min={0.01}
          max={0.5}
          step={0.005}
          onChange={(v) => set("dofFocalLength", v)}
          color="#aa88ff"
        />
        <Slider
          label="bokeh scale"
          value={params.dofBokehScale}
          min={0}
          max={15}
          step={0.5}
          onChange={(v) => set("dofBokehScale", v)}
          color="#aa88ff"
        />
      </div>

      {/* ── CAMERA ── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 14,
          marginTop: 14,
        }}
      >
        <div style={labelStyle}>
          <span style={{ opacity: 0.5 }}>📷</span>
          camera position
        </div>
        <div
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            padding: "6px 8px",
            marginBottom: 6,
            wordBreak: "break-all",
            lineHeight: 1.6,
          }}
        >
          <div>
            pos: <span style={{ color: "rgba(255,255,255,0.8)" }}>{cameraPos}</span>
          </div>
          <div>
            target: <span style={{ color: "rgba(255,255,255,0.8)" }}>{cameraTarget}</span>
          </div>
        </div>
        <button
          onClick={() => {
            const text = `camera position: ${cameraPos}\ncamera target: ${cameraTarget}`;
            navigator.clipboard.writeText(text);
          }}
          style={{
            width: "100%",
            padding: "5px 0",
            fontSize: 9,
            fontFamily: "monospace",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
          }}
        >
          copy to clipboard
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Camera readout — reports position to parent via callback
// ---------------------------------------------------------------------------
function CameraReadout({
  onUpdate,
}: {
  onUpdate: (pos: string, target: string) => void;
}) {
  const lastRef = useRef("");
  useFrame(({ camera }) => {
    const p = camera.position;
    const posStr = `[${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}]`;
    // OrbitControls target is at (0,0,0) by default, but let's read it from the controls
    // For simplicity, we'll compute a lookAt direction
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const targetStr = `[${(p.x + dir.x * 100).toFixed(1)}, ${(p.y + dir.y * 100).toFixed(1)}, ${(p.z + dir.z * 100).toFixed(1)}]`;
    const key = posStr + targetStr;
    if (key !== lastRef.current) {
      lastRef.current = key;
      onUpdate(posStr, targetStr);
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// Loading indicator
// ---------------------------------------------------------------------------
function LoadingScreen() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        fontSize: 14,
        color: "rgba(255,255,255,0.3)",
      }}
    >
      loading model…
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BodyEnergy0Page() {
  const [params, setParams] = useState<SceneParams>(DEFAULT_PARAMS);
  const meshData = useMeshData("/models/nervous-system-mesh.bin");
  const [cameraPos, setCameraPos] = useState("[21.4, -76.7, 52.6]");
  const [cameraTarget, setCameraTarget] = useState("[21.9, 21.7, 34.9]");

  const handleCameraUpdate = useCallback((pos: string, target: string) => {
    setCameraPos(pos);
    setCameraTarget(target);
  }, []);

  return (
    <ParamsContext.Provider value={params}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#111111",
          overflow: "hidden",
        }}
      >
        {!meshData ? (
          <LoadingScreen />
        ) : (
          <Canvas
            camera={{ position: [21.4, -76.7, 52.6], fov: 45 }}
            gl={{ antialias: true, alpha: false }}
            style={{ width: "100%", height: "100%" }}
            onCreated={({ gl }) => {
              gl.setClearColor("#111111");
            }}
          >
            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.6}
              panSpeed={0.5}
              zoomSpeed={0.8}
              minDistance={20}
              maxDistance={600}
              target={[21.9, 21.7, 34.9]}
            />
            <StructureLayer meshData={meshData} />
            <VortexParticles />
            <AxisLabels />
            <CameraReadout onUpdate={handleCameraUpdate} />
            {params.dofEnabled && (
              <EffectComposer multisampling={0}>
                <DepthOfField
                  focusDistance={params.dofFocusDistance}
                  focalLength={params.dofFocalLength}
                  bokehScale={params.dofBokehScale}
                />
              </EffectComposer>
            )}
          </Canvas>
        )}

        <ControlPanel
          params={params}
          setParams={setParams}
          cameraPos={cameraPos}
          cameraTarget={cameraTarget}
        />
      </div>
    </ParamsContext.Provider>
  );
}
