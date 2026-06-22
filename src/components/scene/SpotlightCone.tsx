"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import gsap from "gsap";

// Volumetric light cone — open cylinder tapered from lantern tip down
export default function SpotlightCone({
  position,
  rotation,
  isNight,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  isNight: boolean;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Cone height ~6 units (from lantern down to floor)
  // Top is narrow (0.05), bottom fans wide (2.5)
  // Origin sits at the TOP of the cone (the lantern tip)
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.05, 2.5, 6, 32, 1, true);
    geo.translate(0, -3, 0); // origin at top
    return geo;
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      gsap.to(materialRef.current, {
        opacity: isNight ? 0.28 : 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <meshBasicMaterial
        ref={materialRef}
        color="#ffe4a0"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Soft glowing pool of light on the floor where the beam lands
export function FloorGlow({
  position,
  isNight,
  radius = 2.0,
}: {
  position: [number, number, number];
  isNight: boolean;
  radius?: number;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    if (materialRef.current) {
      gsap.to(materialRef.current, {
        opacity: isNight ? 0.55 : 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ffe4a0"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
