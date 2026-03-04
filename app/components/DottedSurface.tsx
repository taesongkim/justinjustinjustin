'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function DottedSurface({ className, ...props }: Omit<React.ComponentProps<'div'>, 'ref'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 40;

    // Scene setup
    const scene = new THREE.Scene();
    // scene.fog = new THREE.Fog(0x000000, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    );
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    // Create particles
    const positions: number[] = [];
    const colors: number[] = [];
    const softnesses: number[] = [];
    const dotOpacities: number[] = [];

    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const y = 0;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
        positions.push(x, y, z);

        // Initial grayscale (will be animated)
        colors.push(0.7, 0.7, 0.7);

        // Per-row softness and opacity
        let soft = 0.0;
        let opac = 0.9;

        if (iy >= 21 && iy <= 25) {
          // Rows 21–25: softness 0.1→0.56, opacity 0.86→0.3
          const t = (iy - 21) / 4;
          soft = 0.1 + t * 0.46;
          opac = 0.86 - t * 0.56;
        } else if (iy > 25) {
          // Rows 26–39: continue from where 25 left off
          const t = (iy - 25) / 14;
          soft = 0.56 + t * 0.44;
          opac = 0.3 - t * 0.1;
        } else if (iy < 15) {
          // Rows 14→0: softness 0.1→0.35, opacity 0.9→0.2
          const t = (14 - iy) / 14;
          soft = 0.1 + t * 0.25;
          opac = 0.9 - t * 0.7;
        }

        softnesses.push(soft);
        dotOpacities.push(opac);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('softness', new THREE.Float32BufferAttribute(softnesses, 1));
    geometry.setAttribute('dotOpacity', new THREE.Float32BufferAttribute(dotOpacities, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uSize: { value: 48.0 * window.devicePixelRatio },
      },
      vertexShader: /* glsl */ `
        attribute float softness;
        attribute float dotOpacity;
        varying vec3 vColor;
        varying float vSoftness;
        varying float vOpacity;
        uniform float uSize;

        void main() {
          vColor = color;
          vSoftness = softness;
          vOpacity = dotOpacity;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Size attenuation
          float baseSize = uSize * (600.0 / -mvPosition.z);
          if (vSoftness < 0.01) {
            // Sharp dots: small, crisp
            gl_PointSize = baseSize * 0.15;
          } else {
            // Blurry dots: enlarged for soft falloff
            gl_PointSize = baseSize * (1.0 + vSoftness * 5.0);
          }
          gl_PointSize = max(gl_PointSize, 1.0);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vSoftness;
        varying float vOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));

          float alpha;
          if (vSoftness < 0.01) {
            // Sharp dots: hard circle filling the point
            alpha = dist < 0.5 ? 1.0 : 0.0;
          } else {
            // Blurry dots: wide gaussian-like falloff
            float edge = mix(0.15, 0.5, vSoftness);
            alpha = 1.0 - smoothstep(0.0, edge, dist);
          }

          // Apply per-vertex opacity
          alpha *= vOpacity;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(vColor * alpha, alpha);
        }
      `,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId: number = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position;
      const pos = positionAttribute.array as Float32Array;

      const colorAttribute = geometry.attributes.color;
      const col = colorAttribute.array as Float32Array;
      const tempColor = new THREE.Color();

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;
          pos[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;

          // Cycle each dot through white → midgray over time
          const wave = (Math.sin(((ix + iy) / (AMOUNTX + AMOUNTY)) * Math.PI * 2 + count * 0.02) + 1) * 0.5;
          // Range: 0.35 (midgray) to 1.0 (white)
          const brightness = 0.35 + wave * 0.65;
          col[index] = brightness;
          col[index + 1] = brightness;
          col[index + 2] = brightness;

          i++;
        }
      }

      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      renderer.render(scene, camera);

      // Slowed down: 0.025 vs original 0.1
      count += 0.025;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    sceneRef.current = { scene, camera, renderer, animationId };

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.scene.traverse((object) => {
          if (object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        sceneRef.current.renderer.dispose();
        if (containerRef.current && sceneRef.current.renderer.domElement) {
          containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
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
