"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

import {
  rotationTuple,
  scaleTuple,
  vector3Tuple,
  type RoomDebugState,
} from "./roomDebug/types";

const WALL_WIDTH = 32;
const WALL_HEIGHT = 16;
const WALL_TOP_EXTENSION_HEIGHT = 6;

export default function ExteriorRoof({ debug }: { debug: RoomDebugState }) {
  const bricksTexture = useLoader(THREE.TextureLoader, "/textures/room/wall_bricks_2.webp");
  // This is a color/albedo texture. Mark it as sRGB so it does not render
  // lighter/washed out than the original image.
  bricksTexture.colorSpace = THREE.SRGBColorSpace;
  // Set anisotropy for better quality when viewed at an angle
  bricksTexture.anisotropy = 16;
  bricksTexture.needsUpdate = true;

  const topExtensionTexture = useMemo(() => {
    const texture = bricksTexture.clone();

    // Mirror only the opaque top portion of the wall so the extension starts
    // seamlessly without repeating the transparent doorway lower in the map.
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, -WALL_TOP_EXTENSION_HEIGHT / WALL_HEIGHT);
    texture.offset.set(0, 1);
    texture.needsUpdate = true;

    return texture;
  }, [bricksTexture]);

  const wall = debug.meshes.exteriorWall;
  const wallMaterial = debug.materials.exteriorWall;

  return (
    <group
      position={vector3Tuple(wall.position)}
      rotation={rotationTuple(wall.rotation)}
      scale={scaleTuple(wall.scale)}
      visible={wall.visible}
    >
      {/* The Partition Wall / Skyscraper Exterior Face */}
      <mesh name="Exterior Wall" renderOrder={wall.renderOrder}>
        <planeGeometry args={[WALL_WIDTH, WALL_HEIGHT]} />
        <meshStandardMaterial
          map={bricksTexture}
          transparent={true}
          alphaTest={0.01}
          roughness={wallMaterial.roughness}
          metalness={wallMaterial.metalness}
          color={wallMaterial.color}
          wireframe={wallMaterial.wireframe}
        />
      </mesh>

      {/* Covers the taller portrait-camera frustum without moving the doorway. */}
      <mesh
        name="Exterior Wall Top Extension"
        position={[0, (WALL_HEIGHT + WALL_TOP_EXTENSION_HEIGHT) / 2, 0]}
        renderOrder={wall.renderOrder}
      >
        <planeGeometry args={[WALL_WIDTH, WALL_TOP_EXTENSION_HEIGHT]} />
        <meshStandardMaterial
          map={topExtensionTexture}
          roughness={wallMaterial.roughness}
          metalness={wallMaterial.metalness}
          color={wallMaterial.color}
          wireframe={wallMaterial.wireframe}
        />
      </mesh>
    </group>
  );
}
