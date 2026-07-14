"use client";

import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

import {
  rotationTuple,
  scaleTuple,
  vector3Tuple,
  type RoomDebugState,
} from "./roomDebug/types";

export default function ExteriorRoof({ debug }: { debug: RoomDebugState }) {
  const bricksTexture = useLoader(THREE.TextureLoader, "/textures/wall_bricks_2.webp");
  // This is a color/albedo texture. Mark it as sRGB so it does not render
  // lighter/washed out than the original image.
  bricksTexture.colorSpace = THREE.SRGBColorSpace;
  // Set anisotropy for better quality when viewed at an angle
  bricksTexture.anisotropy = 16;
  bricksTexture.needsUpdate = true;

  const wall = debug.meshes.exteriorWall;
  const wallMaterial = debug.materials.exteriorWall;

  return (
    <>
      {/* The Partition Wall / Skyscraper Exterior Face */}
      <mesh
        name="Exterior Wall"
        position={vector3Tuple(wall.position)}
        rotation={rotationTuple(wall.rotation)}
        scale={scaleTuple(wall.scale)}
        renderOrder={wall.renderOrder}
        visible={wall.visible}
      >
        <planeGeometry args={[32, 16]} />
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
    </>
  );
}
