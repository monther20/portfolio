"use client";

import { type RefObject, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { fogDepthForObject, fogOpacityForDepth } from "./fogVisibility";

type FadableMaterial = THREE.Material & {
  fog?: boolean;
  opacity: number;
  transparent: boolean;
};

type MaterialOwner = THREE.Object3D & {
  material?: THREE.Material | THREE.Material[];
};

type UseFogFadeOptions = {
  visibleThreshold?: number;
  /** Keep materials such as SDF text transparent even when the fog opacity is 1. */
  preserveTransparency?: boolean;
};

function forEachMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
  callback: (material: FadableMaterial) => void,
) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];

  for (const item of materials) {
    if ("opacity" in item && "transparent" in item) {
      callback(item as FadableMaterial);
    }
  }
}

/**
 * Three.js fog only blends colours toward the fog colour; it does not make
 * geometry transparent. That can leave white silhouettes/depth masks visible
 * through dense fog, so objects that must fully disappear also fade opacity.
 */
export function useFogFade(
  ref: RefObject<THREE.Object3D | null>,
  {
    visibleThreshold = 0.01,
    preserveTransparency = false,
  }: UseFogFadeOptions = {},
) {
  const { camera, scene } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const root = ref.current;
    if (!root) return;

    const opacity = scene.fog instanceof THREE.Fog
      ? fogOpacityForDepth(fogDepthForObject(root, camera, tmp), scene.fog)
      : 1;
    const transparent = opacity < 0.999;

    root.visible = opacity > visibleThreshold;

    root.traverse((object) => {
      forEachMaterial((object as MaterialOwner).material, (material) => {
        const baseOpacity = typeof material.userData.fogFadeBaseOpacity === "number"
          ? material.userData.fogFadeBaseOpacity
          : material.opacity;

        const baseTransparent = typeof material.userData.fogFadeBaseTransparent === "boolean"
          ? material.userData.fogFadeBaseTransparent
          : material.transparent;
        const baseDepthWrite = typeof material.userData.fogFadeBaseDepthWrite === "boolean"
          ? material.userData.fogFadeBaseDepthWrite
          : material.depthWrite;
        const nextTransparent = transparent || (preserveTransparency && baseTransparent);

        material.userData.fogFadeBaseOpacity = baseOpacity;
        material.userData.fogFadeBaseTransparent = baseTransparent;
        material.userData.fogFadeBaseDepthWrite = baseDepthWrite;
        material.opacity = baseOpacity * opacity;
        material.depthWrite = baseDepthWrite && !transparent;

        if (material.transparent !== nextTransparent) {
          material.transparent = nextTransparent;
          material.needsUpdate = true;
        }

        if ("fog" in material && material.fog !== true) {
          material.fog = true;
          material.needsUpdate = true;
        }
      });
    });
  });
}
