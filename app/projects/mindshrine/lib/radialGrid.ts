/**
 * radialGrid.ts
 * ES module version of the radial grid background.
 * Uses Three.js from npm instead of global CDN.
 */
import * as THREE from "three";

export interface RadialGridAPI {
  setCamera: (opts: { theta?: number; phi?: number; radius?: number }) => void;
  setPosition: (x: number, y: number, z: number) => void;
  setRotation: (x: number, y: number, z: number) => void;
  setOpacity: (v: number) => void;
  setFog: (opts: { on?: boolean; start?: number; end?: number; curve?: number }) => void;
  setLift: (height: number, radius: number) => void;
  spawnRipple: () => void;
  getProjectedCenterX: () => number;
  destroy: () => void;
}

export function initRadialGrid(canvas: HTMLCanvasElement): RadialGridAPI {
  const SPOKES = 192;
  const RINGS = 110;
  const TOTAL_R = 300;
  const MAX_RIPPLES = 6;

  const CFG = {
    ringDensity: 200,
    opacity: 0.4,
    bgColor: 0x050508,
    ripple: { amplitude: 0.84, speed: 6.5, wavelength: 11.3, interval: 3.7, decay: 0.008 },
    shimmer: { amount: 0.64, speed: 2.0, ringScale: 2.0, spokeScale: 1.77, complexity: 5 },
    fog: { on: 1.0, start: 0, end: 312, curve: 0.35 },
    camera: { theta: 0, phi: Math.PI / 3.5, radius: 80 },
  };

  // ── Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.05, 5000);

  const gridGroup = new THREE.Group();
  scene.add(gridGroup);

  // ── Uniforms
  const rippleVecs = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(-9999, 0, 0, 0));

  const U: Record<string, { value: unknown }> = {
    uTime: { value: 0.0 },
    uLift: { value: 0.0 },
    uLiftRadius: { value: 2.0 },
    uOpacity: { value: CFG.opacity },
    uFogOn: { value: CFG.fog.on },
    uFogStart: { value: CFG.fog.start },
    uFogEnd: { value: CFG.fog.end },
    uFogCurve: { value: CFG.fog.curve },
    uRippleDecay: { value: CFG.ripple.decay },
    uCamPos: { value: new THREE.Vector3() },
    uRipples: { value: rippleVecs },
    uShimmerAmt: { value: CFG.shimmer.amount },
    uShimmerSpd: { value: CFG.shimmer.speed },
    uShimmerRSc: { value: CFG.shimmer.ringScale },
    uShimmerSSc: { value: CFG.shimmer.spokeScale },
    uShimmerCmx: { value: CFG.shimmer.complexity },
  };

  // ── Shaders
  const VS = `
    #define MAX_RIPPLES ${MAX_RIPPLES}
    uniform float uTime, uLift, uLiftRadius, uRippleDecay;
    uniform vec4  uRipples[MAX_RIPPLES];
    uniform vec3  uCamPos;
    varying float vDist, vRadial, vAngle;
    void main() {
      vec3 pos = position;
      float d2d = length(pos.xz);
      pos.y += uLift * exp(-(d2d*d2d)/(2.0*uLiftRadius*uLiftRadius));
      for (int i = 0; i < MAX_RIPPLES; i++) {
        if (uRipples[i].x < -100.0) continue;
        float age = uTime - uRipples[i].x;
        float wf  = age * uRipples[i].z;
        if (d2d > wf) continue;
        float phase = (wf - d2d) / uRipples[i].w;
        pos.y += sin(phase * 6.28318) * uRipples[i].y
                 * exp(-d2d * uRippleDecay) * exp(-age * 0.35);
      }
      vec4 wp = modelMatrix * vec4(pos, 1.0);
      vDist   = distance(wp.xyz, uCamPos);
      vRadial = d2d;
      vAngle  = atan(pos.z, pos.x);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const FS_LINES = `
    uniform float uTime, uOpacity, uFogOn, uFogStart, uFogEnd, uFogCurve;
    uniform float uShimmerAmt, uShimmerSpd, uShimmerRSc, uShimmerSSc, uShimmerCmx;
    varying float vDist, vRadial, vAngle;
    void main() {
      float alpha = uOpacity;
      if (uFogOn > 0.5) {
        float ft = clamp((vDist - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
        alpha *= 1.0 - pow(ft, uFogCurve);
      }
      if (alpha < 0.001) discard;
      float t = uTime * uShimmerSpd;
      float r = vRadial, th = vAngle;
      float s = 0.0, w = 0.0;
      if (uShimmerCmx >= 1.0) { s += sin(r*uShimmerRSc*0.7 +t*1.0+0.0)*sin(th*uShimmerSSc*4.0 +t*0.7+1.1); w+=1.0; }
      if (uShimmerCmx >= 2.0) { s += sin(r*uShimmerRSc*1.9 +t*0.5+2.3)*sin(th*uShimmerSSc*9.0 +t*1.3+0.7); w+=1.0; }
      if (uShimmerCmx >= 3.0) { s += sin(r*uShimmerRSc*3.1 +t*1.7+4.1)*sin(th*uShimmerSSc*17.0+t*0.4+3.3); w+=1.0; }
      if (uShimmerCmx >= 4.0) { s += sin(r*uShimmerRSc*5.3 +t*0.9+1.8)*sin(th*uShimmerSSc*29.0+t*1.1+5.5); w+=1.0; }
      if (uShimmerCmx >= 5.0) { s += sin((r*uShimmerRSc+th*uShimmerSSc*6.0)*2.7+t*1.4+2.9); w+=1.0; }
      if (uShimmerCmx >= 6.0) { s += sin(r*uShimmerRSc*8.9+th*uShimmerSSc*41.0+t*0.6+0.3); w+=1.0; }
      float shimmer = (s/w)*0.5 + 0.5;
      alpha = clamp(alpha * mix(1.0, shimmer * 1.8, uShimmerAmt), 0.0, 1.0);
      if (alpha < 0.005) discard;
      gl_FragColor = vec4(0.627, 0.549, 1.0, alpha);
    }
  `;

  const FS_MESH = `
    uniform float uOpacity, uFogOn, uFogStart, uFogEnd, uFogCurve;
    varying float vDist;
    void main() {
      float alpha = uOpacity * 0.04;
      if (uFogOn > 0.5) {
        float t = clamp((vDist-uFogStart)/(uFogEnd-uFogStart), 0.0, 1.0);
        alpha *= 1.0 - pow(t, uFogCurve);
      }
      if (alpha < 0.001) discard;
      gl_FragColor = vec4(0.627, 0.549, 1.0, alpha);
    }
  `;

  // ── Geometry
  function vidx(r: number, s: number) { return 1 + r * SPOKES + (((s % SPOKES) + SPOKES) % SPOKES); }

  const totalVerts = 1 + RINGS * SPOKES;
  const pos = new Float32Array(totalVerts * 3);
  const ringRadii = new Float32Array(RINGS);

  {
    const base = CFG.ringDensity, denom = base - 1.0;
    for (let r = 0; r < RINGS; r++)
      ringRadii[r] = TOTAL_R * (Math.pow(base, (r + 1) / RINGS) - 1.0) / denom;
  }

  pos[0] = 0; pos[1] = 0; pos[2] = 0;
  for (let r = 0; r < RINGS; r++) {
    const radius = ringRadii[r];
    for (let s = 0; s < SPOKES; s++) {
      const a = (s / SPOKES) * Math.PI * 2, i = vidx(r, s);
      pos[i * 3] = Math.cos(a) * radius; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.sin(a) * radius;
    }
  }

  // Lines
  const lineIdx: number[] = [];
  for (let s = 0; s < SPOKES; s++) {
    lineIdx.push(0, vidx(0, s));
    for (let r = 0; r < RINGS - 1; r++) lineIdx.push(vidx(r, s), vidx(r + 1, s));
  }
  for (let r = 0; r < RINGS; r++)
    for (let s = 0; s < SPOKES; s++) lineIdx.push(vidx(r, s), vidx(r, s + 1));

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  lineGeo.setIndex(lineIdx);
  gridGroup.add(new THREE.LineSegments(lineGeo, new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS_LINES,
    uniforms: U, transparent: true, depthWrite: false,
  })));

  // Mesh (faint fill)
  const faceIdx: number[] = [];
  for (let s = 0; s < SPOKES; s++) faceIdx.push(0, vidx(0, s), vidx(0, s + 1));
  for (let r = 0; r < RINGS - 1; r++)
    for (let s = 0; s < SPOKES; s++) {
      faceIdx.push(vidx(r, s), vidx(r + 1, s), vidx(r + 1, s + 1));
      faceIdx.push(vidx(r, s), vidx(r + 1, s + 1), vidx(r, s + 1));
    }
  const meshGeo = new THREE.BufferGeometry();
  meshGeo.setAttribute("position", new THREE.BufferAttribute(pos.slice(), 3));
  meshGeo.setIndex(faceIdx);
  gridGroup.add(new THREE.Mesh(meshGeo, new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS_MESH,
    uniforms: U, transparent: true, side: THREE.DoubleSide, depthWrite: false,
  })));

  // ── Ripples
  let rippleHead = 0, lastRipple = -99;
  function spawnRipple(t: number) {
    rippleVecs[(rippleHead++) % MAX_RIPPLES]
      .set(t, CFG.ripple.amplitude, CFG.ripple.speed, CFG.ripple.wavelength);
  }

  // ── Resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  // ── Render loop
  const clock = new THREE.Clock();
  let animId: number;

  (function loop() {
    animId = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    (U.uTime.value as number) = t;

    if (t - lastRipple >= CFG.ripple.interval) { spawnRipple(t); lastRipple = t; }

    const { theta, phi, radius } = CFG.camera;
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(0, 0, 0);
    (U.uCamPos.value as THREE.Vector3).copy(camera.position);

    renderer.render(scene, camera);
  })();

  // ── Public API
  return {
    setCamera({ theta, phi, radius } = {}) {
      if (theta !== undefined) CFG.camera.theta = theta;
      if (phi !== undefined) CFG.camera.phi = phi;
      if (radius !== undefined) CFG.camera.radius = radius;
    },
    setPosition(x = 0, y = 0, z = 0) { gridGroup.position.set(x, y, z); },
    setRotation(x = 0, y = 0, z = 0) { gridGroup.rotation.set(x, y, z); },
    setOpacity(v: number) { U.uOpacity.value = v; },
    setLift(height: number, radius: number) {
      U.uLift.value = height;
      U.uLiftRadius.value = radius;
    },
    setFog({ on, start, end, curve } = {} as { on?: boolean; start?: number; end?: number; curve?: number }) {
      if (on !== undefined) U.uFogOn.value = on ? 1.0 : 0.0;
      if (start !== undefined) U.uFogStart.value = start;
      if (end !== undefined) U.uFogEnd.value = end;
      if (curve !== undefined) U.uFogCurve.value = curve;
    },
    spawnRipple() { spawnRipple(clock.getElapsedTime()); },
    /** Returns the screen-space X pixel of the grid center (where spokes converge) */
    getProjectedCenterX() {
      const v = gridGroup.position.clone().project(camera);
      // v.x is in NDC (-1 to 1), convert to pixels
      return (v.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    },
    destroy() {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    },
  };
}
