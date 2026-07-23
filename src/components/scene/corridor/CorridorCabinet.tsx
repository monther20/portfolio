"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import WrappedImageMesh from "../WrappedImageMesh";
import { useFogFade } from "../useFogFade";
import { useTiledTexture } from "./useTiledTexture";

const C = "/textures/corridor";

const CABINET = {
  position: [-3.1, -2.39, -111.77] as [number, number, number],
  rotation: [0, 4.6658, -0.0002] as [number, number, number],
  size: 1.6,
  depth: 0.9,
  sideOffset: 0.002,
  horizontalBorderUv: 0.055,
  verticalBorderUv: 0.055,
  revealNear: 8,
  revealFar: 16,
} as const;

/** Keep the illustrated front while giving the outer side panels their own artwork. */
export default function CorridorCabinet() {
  const outerSurfacesRef = useRef<THREE.Group>(null);
  const topTexture = useTiledTexture(`${C}/floor_wood.webp`, 1, 1);
  const sideTexture = useTiledTexture(`${C}/szafkaprzod_sides.png`, 1, 1);
  useFogFade(outerSurfacesRef);

  useEffect(() => {
    topTexture.center.set(0.5, 0.5);
    topTexture.rotation = Math.PI / 2;
    topTexture.needsUpdate = true;
  }, [topTexture]);

  return (
    <group
      name="Corridor Cabinet"
      position={CABINET.position}
      rotation={CABINET.rotation}
    >
      {/* Preserve the original cabinet mesh so its front remains unchanged. */}
      <WrappedImageMesh
        name="Corridor Cabinet Illustrated Front"
        sketch={`${C}/szafkaprzod.webp`}
        width={CABINET.size}
        height={CABINET.size}
        depth={CABINET.depth}
        horizontalBorderUv={CABINET.horizontalBorderUv}
        verticalBorderUv={CABINET.verticalBorderUv}
        revealNear={CABINET.revealNear}
        revealFar={CABINET.revealFar}
      />

      <group ref={outerSurfacesRef} name="Corridor Cabinet Outer Surfaces">
        <mesh
          name="Corridor Cabinet Wooden Top"
          position={[0, CABINET.size / 2 + CABINET.sideOffset, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[CABINET.size, CABINET.depth]} />
          <meshBasicMaterial
            map={topTexture}
            side={THREE.DoubleSide}
            fog
            toneMapped={false}
          />
        </mesh>
        <mesh
          name="Corridor Cabinet Illustrated Left Outer Side"
          position={[-CABINET.size / 2 - CABINET.sideOffset, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          <planeGeometry args={[CABINET.depth, CABINET.size]} />
          <meshBasicMaterial
            map={sideTexture}
            side={THREE.DoubleSide}
            fog
            toneMapped={false}
          />
        </mesh>
        <mesh
          name="Corridor Cabinet Illustrated Right Outer Side"
          position={[CABINET.size / 2 + CABINET.sideOffset, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[CABINET.depth, CABINET.size]} />
          <meshBasicMaterial
            map={sideTexture}
            side={THREE.DoubleSide}
            fog
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
