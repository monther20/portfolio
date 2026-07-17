"use client";

import WrappedImageMesh from "../WrappedImageMesh";

const C = "/textures/corridor";

const CABINET = {
  position: [-3.09, -2.4, -71] as [number, number, number],
  rotation: [0, 4.6228, -0.0002] as [number, number, number],
  size: 1.6,
  depth: 0.9,
  horizontalBorderUv: 0.055,
  verticalBorderUv: 0.055,
  revealNear: 8,
  revealFar: 16,
} as const;

/** The cabinet artwork wrapped around a square mesh with fixed production values. */
export default function CorridorCabinet() {
  return (
    <WrappedImageMesh
      name="Corridor Cabinet"
      sketch={`${C}/szafkaprzod.webp`}
      width={CABINET.size}
      height={CABINET.size}
      depth={CABINET.depth}
      position={CABINET.position}
      rotation={CABINET.rotation}
      horizontalBorderUv={CABINET.horizontalBorderUv}
      verticalBorderUv={CABINET.verticalBorderUv}
      revealNear={CABINET.revealNear}
      revealFar={CABINET.revealFar}
    />
  );
}
