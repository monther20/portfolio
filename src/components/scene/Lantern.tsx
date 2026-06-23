"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import gsap from "gsap";

const LanternMaterial = shaderMaterial(
  {
    texBase: null,
    texOn: null,
    progress: 0,
    tintColor: new THREE.Color("#ffffff"),
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    uniform sampler2D texBase;
    uniform sampler2D texOn;
    uniform float progress;
    uniform vec3 tintColor;

    void main() {
      vec4 base = texture2D(texBase, vUv);
      vec4 on = texture2D(texOn, vUv);
      
      // Map progress from [0, 1] to [-0.2, 1.2] to ensure the soft edge fully clears the top/bottom
      float p = progress * 1.4 - 0.2; 
      
      // Top to bottom wipe: reveal line Y moves from 1.0 down to 0.0
      float Y = 1.0 - p;
      
      // Smoothstep creates a soft gradient at the wipe edge
      // If vUv.y is above the line, mixVal approaches 1 (showing 'on' texture)
      float mixVal = smoothstep(Y - 0.15, Y + 0.15, vUv.y);

      vec4 finalColor = mix(base, on, mixVal);
      
      // Alpha test threshold
      if (finalColor.a < 0.01) discard;
      
      gl_FragColor = finalColor * vec4(tintColor, 1.0);
    }
  `
);

extend({ LanternMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      lanternMaterial: any;
    }
  }
}

export default function Lantern({
  position,
  texBase,
  texOn,
  isNight,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  position: [number, number, number];
  texBase: THREE.Texture;
  texOn: THREE.Texture;
  isNight: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
}) {
  const materialRef = useRef<any>(null);

  // Animate the progress uniform when hover or night state changes
  useEffect(() => {
    // If it's night, or if we are hovering, the light image should be fully revealed
    const targetProgress = isNight || isHovered ? 1 : 0;
    
    // Tint the lantern darker when it's night
    const targetTint = new THREE.Color(isNight ? "#EEEEEE" : "#ffffff");
    
    if (materialRef.current) {
      gsap.to(materialRef.current, {
        progress: targetProgress,
        duration: 0.6,
        ease: "power2.inOut",
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
