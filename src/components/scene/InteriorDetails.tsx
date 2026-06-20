"use client";

import React from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

export default function InteriorDetails() {
  const wallTexture = useLoader(THREE.TextureLoader, "/textures/walls.png");
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(3, 3); // Increased repetition for a denser texture
  wallTexture.anisotropy = 16;

  const baseFloorTexture = useLoader(
    THREE.TextureLoader,
    "/textures/floor.png",
  );
  // Clone the texture to ensure our tiling settings don't conflict with the global cache
  const floorTexture = baseFloorTexture.clone();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(12, 4); // Tile the floor texture proportionally to the room depth
  floorTexture.anisotropy = 16;
  floorTexture.needsUpdate = true;

  return (
    <>
      {/* Wide Floor strictly inside the room (Stops at the wall z=-16.15) */}
      <mesh position={[0, -6.5, -1.15]}>
        <boxGeometry args={[100, 1, 30]} />
        <meshStandardMaterial
          map={floorTexture}
          bumpMap={floorTexture}
          bumpScale={0.02}
          roughness={1}
          metalness={0}
          color="#ffffff"
        />
      </mesh>

      {/* Wide Ceiling strictly inside the room */}
      <mesh position={[0, 6.5, -1.15]}>
        <boxGeometry args={[100, 1, 30]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Interior Ambient Light */}
      <ambientLight intensity={1.5} color="#ffffff" />
    </>
  );
}
