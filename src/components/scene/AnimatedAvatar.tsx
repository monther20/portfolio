"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";

import { AVATAR_FRAME_URLS } from "./assetPaths";
import { fogDepthForObject, fogOpacityForDepth } from "./fogVisibility";
import { useResponsiveExperience } from "../ResponsiveExperience";
import { useNightMaterialColor } from "./dayNight/useNightMaterials";

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
  useNightMaterialColor(materialRef, "illustration");
  const billboardRef = useRef<THREE.Group>(null);
  const lastFrame = useRef(-1);
  const readyFrameCount = useRef(1);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const { camera, scene, gl } = useThree();
  const responsive = useResponsiveExperience();
  const frameUrls = useMemo(
    () =>
      responsive.qualityTier === "low"
        ? AVATAR_FRAME_URLS.filter((_, index) => index % 2 === 0)
        : AVATAR_FRAME_URLS,
    [responsive.qualityTier],
  );
  const initialFrame = useLoader(THREE.TextureLoader, frameUrls[0]);
  const [frames, setFrames] = useState<THREE.Texture[]>(() => [initialFrame]);

  useEffect(() => {
    let cancelled = false;
    let ownedFrames: (typeof initialFrame)[] = [];
    const loader = new THREE.TextureLoader();

    void Promise.all(
      frameUrls.slice(1).map(async (url) => {
        try {
          return await loader.loadAsync(url);
        } catch {
          return null;
        }
      }),
    ).then((loadedFrames) => {
      ownedFrames = loadedFrames.filter(
        (texture): texture is typeof initialFrame => texture !== null,
      );
      if (cancelled) {
        ownedFrames.forEach((texture) => texture.dispose());
        return;
      }
      setFrames([initialFrame, ...ownedFrames]);
    });

    return () => {
      cancelled = true;
      ownedFrames.forEach((texture) => texture.dispose());
    };
  }, [frameUrls, initialFrame]);

  useEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

    frames.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, maxAnisotropy);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    });

    // Uploading every frame in one effect creates a multi-second long task on
    // throttled phones. The first frame is uploaded by the visible material;
    // warm one remaining frame per idle callback so playback stays smooth
    // without blocking the entrance.
    const idleWindow = window as unknown as {
      requestIdleCallback?: typeof window.requestIdleCallback;
      cancelIdleCallback?: typeof window.cancelIdleCallback;
    };
    let nextFrame = 1;
    let idleCallback = 0;
    let timer = 0;
    let cancelled = false;
    readyFrameCount.current = 1;
    lastFrame.current = -1;

    const uploadNextFrame = () => {
      if (cancelled || nextFrame >= frames.length) return;
      gl.initTexture(frames[nextFrame]);
      nextFrame += 1;
      readyFrameCount.current = nextFrame;
      scheduleNextFrame();
    };

    const scheduleNextFrame = () => {
      if (cancelled || nextFrame >= frames.length) return;
      if (idleWindow.requestIdleCallback) {
        idleCallback = idleWindow.requestIdleCallback(uploadNextFrame, {
          timeout: 250,
        });
      } else {
        timer = window.setTimeout(uploadNextFrame, 32);
      }
    };

    scheduleNextFrame();
    return () => {
      cancelled = true;
      if (idleCallback) idleWindow.cancelIdleCallback?.(idleCallback);
      if (timer) window.clearTimeout(timer);
    };
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

    const count = Math.max(1, readyFrameCount.current);
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
      opacity = fogOpacityForDepth(
        fogDepthForObject(billboardRef.current, camera, tmp),
        scene.fog,
      );
    }

    mat.opacity = opacity;
    mat.visible = opacity > 0.02;
  });

  return (
    <Billboard
      ref={billboardRef as any}
      name="Animated Avatar"
      position={position}
      follow
      lockX={false}
      lockY
      lockZ={false}
    >
      <mesh name="Animated Avatar Mesh">
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={materialRef}
          map={frames[0]}
          alphaTest={0.02}
          transparent
          depthWrite
          depthTest
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}
