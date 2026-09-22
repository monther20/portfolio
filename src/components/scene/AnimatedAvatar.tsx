"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";

import { AVATAR_SPRITE_SHEET } from "./assetPaths";
import { fogDepthForObject, fogOpacityForDepth } from "./fogVisibility";
import { useNightMaterialColor } from "./dayNight/useNightMaterials";

function pingPongFrameIndex(step: number, count: number) {
  if (count <= 1) return 0;

  return step < count ? step : count * 2 - 2 - step;
}

function setAvatarFrame(texture: THREE.Texture, index: number) {
  const sheet = AVATAR_SPRITE_SHEET;
  const column = index % sheet.columns;
  const row = Math.floor(index / sheet.columns);

  texture.repeat.set(
    sheet.frameWidth / sheet.atlasWidth,
    sheet.frameHeight / sheet.atlasHeight,
  );
  texture.offset.set(
    (column * sheet.cellWidth + sheet.gutter) / sheet.atlasWidth,
    1 -
      (row * sheet.cellHeight + sheet.gutter + sheet.frameHeight) /
        sheet.atlasHeight,
  );
}

function prepareAvatarTexture(
  texture: THREE.Texture,
  gl: THREE.WebGLRenderer,
) {
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const needsUpload =
    texture.colorSpace !== THREE.SRGBColorSpace ||
    texture.anisotropy !== anisotropy ||
    texture.minFilter !== THREE.LinearFilter ||
    texture.magFilter !== THREE.LinearFilter ||
    texture.generateMipmaps;

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  setAvatarFrame(texture, 0);

  if (needsUpload) texture.needsUpdate = true;

  // Decode and upload the single atlas while the entrance loader is visible.
  // Calling this again is cheap because Three caches the uploaded texture.
  gl.initTexture(texture);
}

/** Warm the avatar's one texture before the visitor opens the door. */
export function AvatarTexturePreloader() {
  const texture = useLoader(
    THREE.TextureLoader,
    AVATAR_SPRITE_SHEET.url,
  );
  const { gl } = useThree();

  useLayoutEffect(() => {
    prepareAvatarTexture(texture, gl);
  }, [gl, texture]);

  return null;
}

/**
 * Hand-drawn corridor greeter. Its sampled wave frames live in one cropped
 * texture atlas, avoiding dozens of requests, decodes, and GPU textures.
 */
export default function AnimatedAvatar({
  position,
  height = 2.7,
  fps = AVATAR_SPRITE_SHEET.fps,
}: {
  position: [number, number, number];
  height?: number;
  fps?: number;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  useNightMaterialColor(materialRef, "illustration");
  const billboardRef = useRef<THREE.Group>(null);
  const lastFrame = useRef(-1);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const { camera, scene, gl } = useThree();
  const texture = useLoader(
    THREE.TextureLoader,
    AVATAR_SPRITE_SHEET.url,
  );

  useLayoutEffect(() => {
    prepareAvatarTexture(texture, gl);
    lastFrame.current = -1;
  }, [gl, texture]);

  // The source frames had large transparent margins. Keep the artwork in its
  // original world-space position while drawing only the shared cropped area.
  const plane = useMemo(() => {
    const sheet = AVATAR_SPRITE_SHEET;
    const scale = height / sheet.sourceHeight;
    const cropCenterX = sheet.cropX + sheet.frameWidth / 2;
    const cropCenterY = sheet.cropY + sheet.frameHeight / 2;

    return {
      width: sheet.frameWidth * scale,
      height: sheet.frameHeight * scale,
      x: (cropCenterX - sheet.sourceWidth / 2) * scale,
      y: (sheet.sourceHeight / 2 - cropCenterY) * scale,
    };
  }, [height]);

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;

    const count = AVATAR_SPRITE_SHEET.frameCount;
    const cycle = count > 1 ? count * 2 - 2 : 1;
    const step = Math.floor(state.clock.elapsedTime * fps) % cycle;
    const index = pingPongFrameIndex(step, count);

    if (index !== lastFrame.current) {
      lastFrame.current = index;
      setAvatarFrame(texture, index);
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
      <mesh
        name="Animated Avatar Mesh"
        position={[plane.x, plane.y, 0]}
      >
        <planeGeometry args={[plane.width, plane.height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
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
