"use client";

import { useCallback, useLayoutEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useDayNight, useDayNightTransition } from "./DayNightProvider";
import { NIGHT_ART, NIGHT_CONFIG } from "./config";
import { addUnlitNightLighting } from "./unlitNightMaterial";

type TintKind = keyof typeof NIGHT_CONFIG.unlitTint;

/** For locally owned unlit surfaces (not cached GLTF materials). Keeps their
 * maps, original color and animation hooks; only extends the nighttime shader.
 */
export function useNightMaterials(
  root: RefObject<THREE.Object3D | null>,
  kind: TintKind,
) {
  const { transition } = useDayNight();
  useLayoutEffect(() => {
    const cleanups: (() => void)[] = [];
    const seen = new Set<THREE.Material>();
    root.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (
          !(material instanceof THREE.MeshBasicMaterial) ||
          seen.has(material)
        )
          continue;
        seen.add(material);
        cleanups.push(
          addUnlitNightLighting(material, transition.uniforms, kind),
        );
      }
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [kind, root, transition]);
}

/** Text is ink in day, soft chalk at night. Never opacity/outline hacks: Troika
 * retains its actual depth, fog and SDF edges so notes remain legible in the sky.
 */
export function useNightText(
  root: RefObject<THREE.Object3D | null>,
  dayColor: string,
) {
  const colors = useMemo(
    () => [new THREE.Color(dayColor), new THREE.Color(NIGHT_ART.text)],
    [dayColor],
  );
  const { transition } = useDayNight();
  // Troika may finish syncing after the transition/mount. Reapply to its live
  // derived material, otherwise late glyphs can revert to black on dark walls.
  useFrame(() => {
    const amount = transition.uniforms.nightAmount.value;
    root.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (
          material instanceof THREE.MeshBasicMaterial ||
          material instanceof THREE.MeshStandardMaterial
        ) {
          material.color.copy(colors[0]).lerp(colors[1], amount);
        }
      }
    });
  });
}

export function useNightMaterialColor(
  material: RefObject<THREE.MeshBasicMaterial | null>,
  kind: TintKind,
) {
  const night = useMemo(
    () => new THREE.Color(NIGHT_CONFIG.unlitTint[kind]),
    [kind],
  );
  const day = useMemo(() => new THREE.Color("#ffffff"), []);
  useDayNightTransition(
    useCallback(
      (amount) => {
        material.current?.color.copy(day).lerp(night, amount);
      },
      [day, material, night],
    ),
  );
}
