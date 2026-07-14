import { CORRIDOR } from "../journeyConfig";

/** Shared values read every frame by the corridor hinged mini-walls. */
export const corridorHingedWallSettings = {
  // Wall layout
  x: CORRIDOR.halfWidth - 0.04,
  y: (CORRIDOR.floorY + CORRIDOR.ceilY) / 2,
  width: 4.1,
  height: CORRIDOR.ceilY - CORRIDOR.floorY,
  depth: 0.08,
  contentOffset: 0.05,

  // Texture tiling on the extra wall surface
  textureRepeatX: 1.05,
  textureRepeatY: 1.35,

  // Lean / hinge behavior
  restAngle: 0.08,
  openAngle: 0.7,
  fullyOpenDistance: 4.8,
  startOpenDistance: 13.2,
  followDamping: 0.045,
} as const;

export function hingedWallContentZ() {
  return corridorHingedWallSettings.depth / 2 + corridorHingedWallSettings.contentOffset;
}
