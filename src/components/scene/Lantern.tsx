"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, extend, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import gsap from "gsap";

const LanternMaterial = shaderMaterial(
  {
    texBase: null,
    texOn: null,
    progress: 0,
    tintColor: new THREE.Color("#ffffff"),
    // Manual fog uniforms — synced each frame from the scene fog
    fogColor: new THREE.Color(1, 1, 1),
    fogNear: 5,
    fogFar: 55,
  },
  // Vertex Shader — passes fog depth to fragment
  `
    varying vec2 vUv;
    varying float vFogDepth;
    void main() {
      vUv = uv;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPos;
      vFogDepth = -mvPos.z;
    }
  `,
  // Fragment Shader — applies manual linear fog after colour computation
  `
    varying vec2 vUv;
    varying float vFogDepth;
    uniform sampler2D texBase;
    uniform sampler2D texOn;
    uniform float progress;
    uniform vec3 tintColor;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;

    void main() {
      vec4 base = texture2D(texBase, vUv);
      vec4 on   = texture2D(texOn,   vUv);

      // Map progress from [0, 1] to [-0.2, 1.2] to ensure the soft edge fully clears
      float p = progress * 1.4 - 0.2;

      // Top-to-bottom wipe: reveal line Y moves from 1.0 down to 0.0
      float Y = 1.0 - p;

      // Smoothstep creates a soft gradient at the wipe edge
      float mixVal = smoothstep(Y - 0.15, Y + 0.15, vUv.y);

      vec4 finalColor = mix(base, on, mixVal);

      // Alpha-test threshold
      if (finalColor.a < 0.01) discard;

      gl_FragColor = finalColor * vec4(tintColor, 1.0);

      // Apply linear fog — blends output toward fogColor with distance
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    }
  `
);

extend({ LanternMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    lanternMaterial: any;
  }
}

export default function Lantern({
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  visible = true,
  renderOrder = 0,
  texBase,
  texOn,
  isNight,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  visible?: boolean;
  renderOrder?: number;
  texBase: THREE.Texture;
  texOn: THREE.Texture;
  isNight: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
}) {
  const materialRef = useRef<any>(null);
  const { scene } = useThree();

  // Sync the manual fog uniforms with the scene's live fog each frame
  useFrame(() => {
    if (materialRef.current && scene.fog instanceof THREE.Fog) {
      materialRef.current.fogColor = scene.fog.color;
      materialRef.current.fogNear  = scene.fog.near;
      materialRef.current.fogFar   = scene.fog.far;
    }
  });

  // Animate the progress uniform when hover or night state changes
  useEffect(() => {
    // If it's night, or if we are hovering, the light image should be fully revealed
    const targetProgress = isNight || isHovered ? 1 : 0;

    // Tint the lantern darker when it's night
    const targetTint = new THREE.Color(isNight ? "#EEEEEE" : "#ffffff");

    if (materialRef.current) {
      gsap.to(materialRef.current, {
        progress: targetProgress,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(materialRef.current.tintColor, {
        r: targetTint.r,
        g: targetTint.g,
        b: targetTint.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight, isHovered]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      visible={visible}
      renderOrder={renderOrder}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        if (onPointerOver) onPointerOver(e);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "auto";
        if (onPointerOut) onPointerOut(e);
      }}
    >
      <planeGeometry args={[1.38, 3.39]} />
      <lanternMaterial
        ref={materialRef}
        texBase={texBase}
        texOn={texOn}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
