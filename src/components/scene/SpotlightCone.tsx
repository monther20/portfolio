"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";

// Real Three.js SpotLight that illuminates surrounding geometry
export default function SpotlightCone({
  position,
  targetPosition,
  isNight,
  intensity = 12,
  angle = Math.PI / 4,
  penumbra = 0.6,
  distance = 15,
  color = "#ffe4a0",
  decay = 1.5,
}: {
  position: [number, number, number];
  targetPosition: [number, number, number];
  isNight: boolean;
  intensity?: number;
  angle?: number;
  penumbra?: number;
  distance?: number;
  color?: string;
  decay?: number;
}) {
  const lightRef = useRef<THREE.SpotLight>(null);

  // Add spotlight target to the scene and aim at targetPosition
  useEffect(() => {
    const light = lightRef.current;
    if (light) {
      light.target.position.set(...targetPosition);
      light.parent?.add(light.target);
    }
    return () => {
      if (light?.target && light.parent) {
        light.parent.remove(light.target);
      }
    };
  }, [targetPosition]);

  // Animate intensity on day/night toggle
  useEffect(() => {
    if (lightRef.current) {
      gsap.to(lightRef.current, {
        intensity: isNight ? intensity : 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight, intensity]);

  return (
    <spotLight
      ref={lightRef}
      position={position}
      angle={angle}
      penumbra={penumbra}
      intensity={0}
      color={color}
      distance={distance}
      decay={decay}
      castShadow={false}
    />
  );
}

// Soft glowing pool of light on the floor where the beam lands
export function FloorGlow({
  position,
  isNight,
  radius = 2.0,
  maxOpacity = 0.55,
}: {
  position: [number, number, number];
  isNight: boolean;
  radius?: number;
  maxOpacity?: number;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    if (materialRef.current) {
      gsap.to(materialRef.current, {
        opacity: isNight ? maxOpacity : 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight, maxOpacity]);

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
