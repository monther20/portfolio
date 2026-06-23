"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useLoader, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";

// Same wipe shader as the lanterns — blends from texBase to texOn top-to-bottom
const DoorWipeMaterial = shaderMaterial(
  {
    texBase: null,
    texOn: null,
    progress: 0,
    tintColor: new THREE.Color("#ffffff"),
  },
  // Vertex
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    varying vec2 vUv;
    uniform sampler2D texBase;
    uniform sampler2D texOn;
    uniform float progress;
    uniform vec3 tintColor;

    void main() {
      vec4 base = texture2D(texBase, vUv);
      vec4 on   = texture2D(texOn,   vUv);

      // progress 0→1: wipe line moves from top (1.0) to bottom (0.0)
      float p = progress * 1.4 - 0.2;
      float Y = 1.0 - p;
      float mixVal = smoothstep(Y - 0.15, Y + 0.15, vUv.y);

      gl_FragColor = mix(base, on, mixVal) * vec4(tintColor, 1.0);
      #include <colorspace_fragment>
    }
  `
);

extend({ DoorWipeMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    doorWipeMaterial: any;
  }
}

export default function AnimatedDoor({
  isOpen,
  isNight,
  onClick,
}: {
  isOpen: boolean;
  isNight: boolean;
  onClick?: () => void;
}) {
  const doorRef = useRef<THREE.Group>(null);
  const frameMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const wipeMaterialRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  const doorClosedTexture = useLoader(THREE.TextureLoader, "/textures/door.png");
  const doorOpenTexture = useLoader(THREE.TextureLoader, "/textures/door_handle_open.png");
  const doorColoredTexture = useLoader(THREE.TextureLoader, "/textures/door_colored.png");
  const frameTexture = useLoader(THREE.TextureLoader, "/textures/door_frame.png");

  // These are color/albedo textures. Without SRGBColorSpace three.js treats
  // them as linear data, which makes image colors render noticeably washed out.
  useEffect(() => {
    [doorClosedTexture, doorOpenTexture, doorColoredTexture, frameTexture].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });
  }, [doorClosedTexture, doorOpenTexture, doorColoredTexture, frameTexture]);

  // Animate the wipe progress on hover (only when door is closed)
  useEffect(() => {
    if (!wipeMaterialRef.current) return;
    const target = hovered && !isOpen ? 1 : 0;
    gsap.to(wipeMaterialRef.current, {
      progress: target,
      duration: 0.7,
      ease: "power2.inOut",
    });
  }, [hovered, isOpen]);

  // Rotate door open/closed
  useEffect(() => {
    if (doorRef.current) {
      gsap.to(doorRef.current.rotation, {
        y: isOpen ? Math.PI / 2 : 0,
        duration: 1.2,
        ease: "power2.inOut",
      });
    }
  }, [isOpen]);

  // Dim the door frame and the custom door shader at night.
  useEffect(() => {
    const targetColor = new THREE.Color(isNight ? "#888899" : "#ffffff");

    if (frameMaterialRef.current) {
      gsap.to(frameMaterialRef.current.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    if (wipeMaterialRef.current?.tintColor) {
      gsap.to(wipeMaterialRef.current.tintColor, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight]);

  return (
    <group position={[0, -1.285, -15.9]}>
      {/* Door frame */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0.2]}>
          <planeGeometry args={[7, 10.05]} />
          <meshStandardMaterial
            ref={frameMaterialRef}
            map={frameTexture}
            transparent={true}
            side={THREE.DoubleSide}
            roughness={1}
            metalness={0}
          />
        </mesh>
      </group>

      {/* Door panel — pivots for open animation */}
      <group
        ref={doorRef}
        position={[-2.555, -0.22, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <group position={[2.555, 0, 0]}>
          <mesh position={[0, -0.1, 0]}>
            <planeGeometry args={[4.9, 8.8]} />
            <doorWipeMaterial
              ref={wipeMaterialRef}
              texBase={isOpen ? doorOpenTexture : doorClosedTexture}
              texOn={doorColoredTexture}
              transparent={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
