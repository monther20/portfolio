"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

export default function ExteriorRoof() {
  const bricksTexture = useLoader(THREE.TextureLoader, "/textures/wall_bricks_2.png");
  // This is a color/albedo texture. Mark it as sRGB so it does not render
  // lighter/washed out than the original image.
  bricksTexture.colorSpace = THREE.SRGBColorSpace;
  // Set anisotropy for better quality when viewed at an angle
  bricksTexture.anisotropy = 16;
  bricksTexture.needsUpdate = true;

  return (
    <>
      {/* The Partition Wall / Skyscraper Exterior Face */}
      <mesh position={[0, 2, -16.15]}>
        <planeGeometry args={[32, 16]} />
        <meshStandardMaterial
          map={bricksTexture}
          transparent={true}
          alphaTest={0.01}
          roughness={0.9}
          color="#ffffff"
        />
      </mesh>


    </>
  );
}
