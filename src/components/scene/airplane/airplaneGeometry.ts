import * as THREE from "three";

/**
 * The origami paper-airplane mesh data + look, extracted from the original
 * JourneyScene airplane so every flight phase shares one source of truth.
 */
export function createAirplaneGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    // Nose tip
    0, 0, -1.5,
    // Wing tips
    -1.2, 0.05, 0.3,
    1.2, 0.05, 0.3,
    // Raised center fold
    0, 0.15, -0.5,
    0, 0.12, 0.5,
    // Tail
    -0.3, 0.08, 0.8,
    0.3, 0.08, 0.8,
    0, 0.1, 0.6,
    // Underside
    0, -0.02, -1.5,
    -1.2, -0.02, 0.3,
    1.2, -0.02, 0.3,
    0, 0, 0.5,
  ]);

  const indices = [
    0, 1, 3, 1, 4, 3, 1, 5, 4, 5, 7, 4,
    0, 3, 2, 3, 4, 2, 4, 6, 2, 4, 7, 6,
    8, 11, 9, 8, 10, 11,
    0, 8, 1, 8, 9, 1, 1, 9, 5,
    0, 2, 8, 8, 2, 10, 2, 6, 10,
    5, 9, 11, 5, 11, 7, 6, 7, 11, 6, 11, 10,
  ];

  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** The fold line down the airplane's spine. */
export const FOLD_LINE_POINTS = new Float32Array([
  0, 0, -1.5,
  0, 0.15, -0.5,
  0, 0.12, 0.5,
  0, 0.1, 0.6,
]);

export const AIRPLANE_LOOK = {
  paperColor: "#faf8f1",
  edgeColor: "#8e8a82",
  lineColor: "#8e8a82",
  roughness: 0.88,
  metalness: 0,
  edgeLinewidth: 2,
  edgeThreshold: 15,
  scale: 0.34,
  renderOrder: 1000,
} as const;

/** Looping in-flight maneuver parameters (the old debug-panel defaults). */
export const AIRPLANE_WOBBLE = {
  rollStrength: 0.18,
  rollFrequency: 0.28,
  rollSpeed: 0.55,
  pitchBase: 0.12,
  pitchStrength: 0.055,
  pitchFrequency: 0.42,
  pitchSpeed: 0.35,
  yawStrength: 0.08,
  yawFrequency: 0.2,
  yawSpeed: 0.45,
} as const;
