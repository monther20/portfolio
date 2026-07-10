"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";

import { fogDepthForObject, fogOpacityForDepth } from "./fogVisibility";

const FRAME_URLS = Array.from(
  { length: 9 },
  (_, i) => `/textures/textures/corridor/avatar_anim/${i + 1}.webp`,
);

/**
 * AnimatedAvatar — the hand-drawn character that greets you in the corridor.
 * Plays the 9 sketch frames in a ping-pong loop by swapping the material map.
 */
export default function AnimatedAvatar({
  position,
  height = 2.7,
  fps = 7,
}: {
  position: [number, number, number];
  height?: number;
  fps?: number;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const lastFrame = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const { camera, scene } = useThree();
  const frames = useLoader(THREE.TextureLoader, FRAME_URLS);

  useEffect(() => {
    frames.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    });
  }, [frames]);

  // Plane size follows the first frame's natural aspect ratio.
  const [w, h] = useMemo(() => {
    const img = frames[0]?.image as HTMLImageElement | undefined;
    const aspect = img && img.height ? img.width / img.height : 1;
    return [height * aspect, height];
  }, [frames, height]);

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;

    // Ping-pong 1→9→1 so the idle never visibly restarts.
    const count = frames.length;
    const cycle = count * 2 - 2;
    const step = Math.floor(state.clock.elapsedTime * fps) % cycle;
    const index = step < count ? step : cycle - step;

    if (index !== lastFrame.current) {
      lastFrame.current = index;
      mat.map = frames[index];
      mat.needsUpdate = true;
    }

    let opacity = 1;
    if (billboardRef.current && scene.fog instanceof THREE.Fog) {
      opacity = fogOpacityForDepth(fogDepthForObject(billboardRef.current, camera, tmp), scene.fog);
    }

    mat.opacity = opacity;
    mat.visible = opacity > 0.02;
  });

  return (
    <Billboard ref={billboardRef as any} name="Animated Avatar" position={position} follow lockX={false} lockY lockZ={false}>
      <mesh name="Animated Avatar Mesh">
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial ref={materialRef} map={frames[0]} alphaTest={0.4} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}
