"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useLoader, useFrame, useThree, extend } from "@react-three/fiber";
import { Billboard, shaderMaterial } from "@react-three/drei";

/**
 * SketchPaintMaterial — blends a grayscale "pencil" look into the full-colour
 * "painted" texture with a soft top-to-bottom wipe driven by `reveal` (0→1).
 * Mirrors the DoorWipeMaterial / Lantern shader convention, including the
 * manually-synced linear fog (three.js fog is not applied to custom shaders).
 */
const SketchPaintMaterial = shaderMaterial(
  {
    texSketch: null,
    texPaint: null,
    reveal: 0,
    tintColor: new THREE.Color("#ffffff"),
    fogColor: new THREE.Color(1, 1, 1),
    fogNear: 5,
    fogFar: 55,
  },
  /* glsl */ `
    varying vec2 vUv;
    varying float vFogDepth;
    void main() {
      vUv = uv;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPos;
      vFogDepth = -mvPos.z;
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying float vFogDepth;
    uniform sampler2D texSketch;
    uniform sampler2D texPaint;
    uniform float reveal;
    uniform vec3 tintColor;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;

    void main() {
      vec4 sketch = texture2D(texSketch, vUv);
      vec4 paint  = texture2D(texPaint, vUv);

      // Unrevealed look = grayscale of the sketch art (pencil on paper).
      float luma = dot(sketch.rgb, vec3(0.299, 0.587, 0.114));
      vec3 inked = vec3(luma);

      // Soft top→bottom wipe. reveal 0 keeps everything sketched, 1 fully paints.
      float p = reveal * 1.35 - 0.18;
      float Y = 1.0 - p;
      float w = smoothstep(Y - 0.16, Y + 0.16, vUv.y);

      vec3 rgb = mix(inked, paint.rgb, w);
      float a  = mix(sketch.a, paint.a, w);

      if (a < 0.35) discard;

      gl_FragColor = vec4(rgb, 1.0) * vec4(tintColor, 1.0);
      #include <colorspace_fragment>

      // Manual linear fog, synced each frame from the scene fog.
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    }
  `
);

extend({ SketchPaintMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    sketchPaintMaterial: any;
  }
}

export type PaintSpriteProps = {
  /** monochrome / line-art texture */
  sketch: string;
  /** coloured texture cross-faded in (defaults to `sketch` → grayscale→colour reveal) */
  painted?: string;
  position?: [number, number, number];
  /** target height in world units; width is derived from the image aspect ratio */
  height?: number;
  /** face the camera (default true) */
  billboard?: boolean;
  /** distance (world units) at which the sprite is fully painted */
  revealNear?: number;
  /** distance beyond which the sprite is fully pencil */
  revealFar?: number;
  /** if false the sprite only paints on hover (not by proximity) */
  autoReveal?: boolean;
  renderOrder?: number;
  onClick?: (e: any) => void;
  /** show a pointer cursor + scale-up on hover */
  interactive?: boolean;
  /** extra hover scale multiplier (default 1.04 when interactive) */
  hoverScale?: number;
};

export default function PaintSprite({
  sketch,
  painted,
  position = [0, 0, 0],
  height = 2,
  billboard = true,
  revealNear = 14,
  revealFar = 34,
  autoReveal = true,
  renderOrder = 0,
  onClick,
  interactive = false,
  hoverScale = 1.04,
}: PaintSpriteProps) {
  const matRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { scene, camera } = useThree();

  // useLoader must run unconditionally — load `painted` (or reuse sketch when absent).
  const texSketch = useLoader(THREE.TextureLoader, sketch);
  const texPaint = useLoader(THREE.TextureLoader, painted ?? sketch);

  useEffect(() => {
    [texSketch, texPaint].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    });
  }, [texSketch, texPaint]);

  // Derive plane size from the (painted) image's natural aspect ratio.
  const [w, h] = useMemo(() => {
    const img = (texPaint.image ?? texSketch.image) as HTMLImageElement | undefined;
    const aspect = img && img.height ? img.width / img.height : 1;
    return [height * aspect, height];
  }, [texPaint, texSketch, height]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const revealTarget = useRef(0);

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;

    // Proximity-driven reveal (+ hover boost to fully painted).
    let target = hovered ? 1 : 0;
    if (autoReveal && groupRef.current) {
      groupRef.current.getWorldPosition(tmp);
      const dist = tmp.distanceTo(camera.position);
      const t = THREE.MathUtils.smoothstep(dist, revealNear, revealFar); // 0 near → 1 far
      target = Math.max(target, 1 - t);
    }
    revealTarget.current = target;
    mat.reveal = THREE.MathUtils.lerp(mat.reveal, revealTarget.current, 0.08);

    // Hover pop.
    if (scaleRef.current) {
      const s = interactive && hovered ? hoverScale : 1;
      scaleRef.current.scale.x = THREE.MathUtils.lerp(scaleRef.current.scale.x, s, 0.15);
      scaleRef.current.scale.y = scaleRef.current.scale.x;
    }

    // Keep the custom shader's fog in step with the scene fog.
    if (scene.fog instanceof THREE.Fog) {
      mat.fogColor = scene.fog.color;
      mat.fogNear = scene.fog.near;
      mat.fogFar = scene.fog.far;
    }
  });

  const handlers = interactive
    ? {
        onClick: (e: any) => {
          e.stopPropagation();
          onClick?.(e);
        },
        onPointerEnter: (e: any) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        },
        onPointerLeave: (e: any) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "auto";
        },
      }
    : {};

  const plane = (
    <group ref={scaleRef}>
      <mesh renderOrder={renderOrder} {...handlers}>
        <planeGeometry args={[w, h]} />
        <sketchPaintMaterial
          ref={matRef}
          texSketch={texSketch}
          texPaint={texPaint}
          transparent={false}
        />
      </mesh>
    </group>
  );

  if (billboard) {
    return (
      <Billboard ref={groupRef as any} position={position} follow lockX={false} lockY lockZ={false}>
        {plane}
      </Billboard>
    );
  }
  return (
    <group ref={groupRef} position={position}>
      {plane}
    </group>
  );
}
