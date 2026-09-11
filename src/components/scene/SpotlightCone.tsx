"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";

// Real Three.js SpotLight that illuminates surrounding geometry
export default function SpotlightCone({
  position,
  targetPosition,
  isNight,
  visible = true,
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
  visible?: boolean;
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
  }, [targetPosition[0], targetPosition[1], targetPosition[2]]);

  return (
    <spotLight
      ref={lightRef}
      position={position}
      visible={visible}
      angle={angle}
      penumbra={penumbra}
      intensity={isNight && visible ? intensity : 0}
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
  rotation = [-Math.PI / 2, 0, 0],
  scale = [1, 1, 1],
  visible = true,
  renderOrder = 0,
  isNight,
  radius = 2.0,
  color = "#ffe4a0",
  maxOpacity = 0.55,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  visible?: boolean;
  renderOrder?: number;
  isNight: boolean;
  radius?: number;
  color?: string;
  maxOpacity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} visible={visible} renderOrder={renderOrder}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isNight && visible ? maxOpacity : 0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
