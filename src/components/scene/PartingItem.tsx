"use client";

import { type ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

const AIRPLANE_CAMERA_Z_OFFSET = 2.85;

export function seededUnit(seed: string | number) {
  let hash = 2166136261;
  const input = String(seed);

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

export function seededRange(seed: string | number, min: number, max: number) {
  return min + seededUnit(seed) * (max - min);
}

type PartingItemProps = {
  home: [number, number, number];
  children: ReactNode;
  name?: string;
  side?: -1 | 1;
  push?: number;
  lift?: number;
  forward?: number;
  influenceDistance?: number;
  lerp?: number;
};

/**
 * Moves a scene item aside only while it is directly in front of the paper
 * airplane. The named outer group remains a stable, editable anchor while an
 * inner motion group applies the reversible "clouds parting" offset.
 */
export default function PartingItem({
  home,
  children,
  name,
  side,
  push = 2.6,
  lift = 0.45,
  forward = 0.45,
  influenceDistance = 9.5,
  lerp = 0.09,
}: PartingItemProps) {
  const anchorRef = useRef<THREE.Group>(null);
  const motionRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const anchorWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const targetOffset = useMemo(() => new THREE.Vector3(), []);
  const fallbackSide = useMemo(() => {
    if (Math.abs(home[0]) > 0.35) return Math.sign(home[0]) as -1 | 1;
    return seededUnit(`${home.join(":")}:part-side`) < 0.5 ? -1 : 1;
  }, [home[0], home[1], home[2]]);

  useFrame(() => {
    const anchor = anchorRef.current;
    const motion = motionRef.current;
    if (!anchor || !motion) return;

    anchor.getWorldPosition(anchorWorldPosition);
    const airplaneZ = camera.position.z - AIRPLANE_CAMERA_Z_OFFSET;
    const distanceInFront = airplaneZ - anchorWorldPosition.z;
    const influence = distanceInFront >= 0
      ? 1 - THREE.MathUtils.smoothstep(distanceInFront, 0.5, influenceDistance)
      : 0;
    const moveSide = side ?? fallbackSide;

    targetOffset.set(
      moveSide * influence * push,
      influence * lift,
      influence * forward,
    );

    motion.position.lerp(targetOffset, lerp);
  });

  const itemName = name ?? "Parting Item";

  return (
    <group ref={anchorRef} name={itemName} position={home}>
      <group ref={motionRef} name={`${itemName} Motion`}>
        {children}
      </group>
    </group>
  );
}
