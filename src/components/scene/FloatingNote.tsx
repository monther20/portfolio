"use client";

import React from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

import { fogDepthForObject, fogOpacityForDepth } from "./fogVisibility";

/**
 * FloatingNote — a hand-written (Caveat) note that floats in 3D space.
 * Rendered as a drei <Html transform> overlay so it uses the real Caveat web
 * font already loaded app-wide, staying crisp at any zoom. Non-interactive by
 * default (pointer events pass through to the canvas so scrolling still works).
 */
export default function FloatingNote({
  children,
  position = [0, 0, 0],
  fontSize = 1.6,
  rotation = 0,
  color = "#2b2b2b",
  weight = 600,
  maxWidth = 320,
  distanceFactor = 9,
  align = "center",
  name,
  depthOcclude = false,
}: {
  children: React.ReactNode;
  position?: [number, number, number];
  fontSize?: number;
  /** small z-rotation in degrees for a hand-placed feel */
  rotation?: number;
  color?: string;
  weight?: number;
  maxWidth?: number;
  distanceFactor?: number;
  align?: "left" | "center" | "right";
  name?: string;
  /** Hide the DOM note when a 3D object is physically in front of it. */
  depthOcclude?: boolean | "raycast" | "blending";
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const noteRef = React.useRef<HTMLDivElement>(null);
  const tmp = React.useMemo(() => new THREE.Vector3(), []);
  const { camera, scene } = useThree();

  useFrame(() => {
    const note = noteRef.current;
    const group = groupRef.current;
    if (!note || !group) return;

    let opacity = 1;
    if (scene.fog instanceof THREE.Fog) {
      opacity = fogOpacityForDepth(fogDepthForObject(group, camera, tmp), scene.fog);
    }

    note.style.opacity = opacity.toFixed(3);
    note.style.visibility = opacity <= 0.02 ? "hidden" : "visible";
  });

  return (
    <group ref={groupRef} name={name ?? "Floating Note"} position={position}>
      <Html
        transform
        distanceFactor={distanceFactor}
        occlude={depthOcclude}
        pointerEvents="none"
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          ref={noteRef}
          style={{
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: `${fontSize}rem`,
            fontWeight: weight,
            color,
            textAlign: align,
            lineHeight: 1.15,
            maxWidth: `${maxWidth}px`,
            transform: `rotate(${rotation}deg)`,
            textShadow:
              "0 1px 0 rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.8)",
            whiteSpace: "pre-wrap",
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}
