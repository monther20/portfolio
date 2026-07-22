"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";

import { AVATAR_FRAME_URLS } from "./assetPaths";
import { fogDepthForObject, fogOpacityForDepth } from "./fogVisibility";

function pingPongFrameIndex(step: number, count: number) {
  if (count <= 1) return 0;

  return step < count ? step : count * 2 - 2 - step;
}

/**
 * AnimatedAvatar — the hand-drawn character that greets you in the corridor.
 * Plays a generated 33-frame wave sequence in a ping-pong loop.
 */
export default function AnimatedAvatar({
  position,
  height = 2.7,
  fps = 28,
}: {
  position: [number, number, number];
  height?: number;
  fps?: number;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const lastFrame = useRef(-1);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const { camera, scene, gl } = useThree();
  const frames = useLoader(THREE.TextureLoader, AVATAR_FRAME_URLS);

  useEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

    frames.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, maxAnisotropy);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      // Upload every generated frame once so playback does not hitch.
      gl.initTexture(texture);
    });
  }, [frames, gl]);

  // Plane size follows the first generated frame's natural aspect ratio.
  const [w, h] = useMemo(() => {
    const img = frames[0]?.image as HTMLImageElement | undefined;
    const aspect = img && img.height ? img.width / img.height : 1;
    return [height * aspect, height];
  }, [frames, height]);

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;

    const count = frames.length;
    const cycle = count > 1 ? count * 2 - 2 : 1;
    const step = Math.floor(state.clock.elapsedTime * fps) % cycle;
    const index = pingPongFrameIndex(step, count);

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
        <meshBasicMaterial ref={materialRef} map={frames[0]} alphaTest={0.02} transparent depthWrite depthTest toneMapped={false} />
      </mesh>
    </Billboard>
  );
}
