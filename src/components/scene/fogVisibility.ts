import * as THREE from "three";

/**
 * Hide hand-drawn sprites/HTML before they become visible silhouettes in the
 * room fog. Three.js fog blends custom/HTML content toward the fog color, but
 * it does not make DOM overlays disappear, so we use the same camera-space
 * depth and fade them out while they are deep in the fog curtain.
 */
export const FOG_HIDE_START = 0.45;
export const FOG_HIDE_END = 0.72;

export function getFogFadeRange(fog: THREE.Fog) {
  const span = Math.max(0.001, fog.far - fog.near);

  return {
    fadeNear: fog.near + span * FOG_HIDE_START,
    fadeFar: fog.near + span * FOG_HIDE_END,
  };
}

export function fogOpacityForDepth(depth: number, fog: THREE.Fog) {
  if (depth <= 0) return 0;

  const { fadeNear, fadeFar } = getFogFadeRange(fog);
  return THREE.MathUtils.clamp(1 - THREE.MathUtils.smoothstep(depth, fadeNear, fadeFar), 0, 1);
}

export function fogDepthForObject(object: THREE.Object3D, camera: THREE.Camera, target: THREE.Vector3) {
  object.getWorldPosition(target);
  target.applyMatrix4(camera.matrixWorldInverse);
  return -target.z;
}
