import * as THREE from "three";

/**
 * Hide hand-drawn sprites/HTML before they become visible silhouettes in the
 * room fog. Three.js fog blends custom/HTML content toward the fog color, but
 * it does not make DOM overlays disappear, so we use the same camera-space
 * depth and fade them out while they are deep in the fog curtain.
 */
const FOG_HIDE_START = 0.45;
const FOG_HIDE_END = 0.72;

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

/**
 * Skip a draw only once the object's entire local bounding sphere is beyond
 * the shader's fog curtain. Project its world transform onto camera depth so
 * banking, nonuniform parent scale and even nested scale/rotation shear cannot
 * hide a still-visible edge. The supplied vector avoids per-frame allocation.
 */
export function isSphereBeyondFog(
  object: THREE.Object3D,
  camera: THREE.Camera,
  fog: THREE.Fog,
  localRadius: number,
  target: THREE.Vector3,
  matricesCurrent = false,
) {
  // Camera/Float/hover transforms may have changed earlier in this frame;
  // renderer matrix updates happen after useFrame callbacks.
  if (!matricesCurrent) {
    camera.updateWorldMatrix(true, false);
    object.updateWorldMatrix(true, false);
  }
  target.setFromMatrixPosition(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);

  const world = object.matrixWorld.elements;
  const view = camera.matrixWorldInverse.elements;
  const depthScaleX = view[2] * world[0] + view[6] * world[1] + view[10] * world[2];
  const depthScaleY = view[2] * world[4] + view[6] * world[5] + view[10] * world[6];
  const depthScaleZ = view[2] * world[8] + view[6] * world[9] + view[10] * world[10];
  const depthRadius = localRadius * Math.hypot(depthScaleX, depthScaleY, depthScaleZ);
  const { fadeFar } = getFogFadeRange(fog);

  // No near/behind-camera cutoff: those fragments retain their existing
  // shader/frustum behavior. A small margin keeps the fog boundary conservative.
  return -target.z - depthRadius > fadeFar + 0.01;
}

type FogCullTarget = { readonly current: THREE.Object3D | null };
type FogCullEntry = { target: FogCullTarget; radius: number };
type BeforeSceneRender = THREE.Scene["onBeforeRender"];
type FogCullRegistry = {
  entries: Set<FogCullEntry>;
  previous: BeforeSceneRender;
  render: BeforeSceneRender;
};

const fogCullRegistries = new WeakMap<THREE.Scene, FogCullRegistry>();

/**
 * Three calls scene.onBeforeRender after world/camera matrix updates and before
 * constructing its render list. All Float/parting/camera callbacks have finished
 * here, so culling uses the same final transforms as the rendered image.
 */
export function registerFogCull(
  scene: THREE.Scene,
  target: FogCullTarget,
  radius: number,
) {
  let registry = fogCullRegistries.get(scene);
  if (!registry) {
    const entries = new Set<FogCullEntry>();
    const previous = scene.onBeforeRender;
    const scratch = new THREE.Vector3();
    const render: BeforeSceneRender = function (this: THREE.Scene, ...args) {
      previous.apply(this, args);
      const camera = args[2];
      for (const entry of entries) {
        const object = entry.target.current;
        if (!object) continue;
        object.visible = !(scene.fog instanceof THREE.Fog) ||
          !isSphereBeyondFog(object, camera, scene.fog, entry.radius, scratch, true);
      }
    };
    registry = { entries, previous, render };
    fogCullRegistries.set(scene, registry);
    scene.onBeforeRender = render;
  }

  const entry = { target, radius };
  registry.entries.add(entry);
  const owned = registry;
  return () => {
    if (!owned.entries.delete(entry)) return;
    if (target.current) target.current.visible = true;
    if (owned.entries.size > 0) return;
    if (scene.onBeforeRender === owned.render) {
      scene.onBeforeRender = owned.previous;
    }
    if (fogCullRegistries.get(scene) === owned) {
      fogCullRegistries.delete(scene);
    }
  };
}
