"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useResponsiveExperience } from "../../../ResponsiveExperience";
import { useDayNightTransition } from "../../dayNight/DayNightProvider";
import { useFogFade } from "../../useFogFade";
import { pierDecorationLayout } from "./pierDecorationLayout";
import { createPierDecorations } from "./pierDecorationModel";

/** Real, pencil-outlined meshes mounted on the last two posts, not image decals. */
export default function PierDecorations() {
  const responsive = useResponsiveExperience();
  const layout = useMemo(
    () => pierDecorationLayout(responsive.aspect, responsive.cameraFov),
    [responsive.aspect, responsive.cameraFov],
  );
  const rod = useRef<THREE.Group>(null);
  const hook = useRef<THREE.Group>(null);
  const models = useRef<ReturnType<typeof createPierDecorations> | null>(null);
  const night = useRef(0);
  useFogFade(rod, { preserveTransparency: true });
  useFogFade(hook, { preserveTransparency: true });

  useLayoutEffect(() => {
    const rodRoot = rod.current, hookRoot = hook.current;
    if (!rodRoot || !hookRoot) return;
    const owned = createPierDecorations(layout.rodReach, layout.hookReach);
    owned.applyNight(night.current);
    models.current = owned;
    rodRoot.add(owned.rod);
    hookRoot.add(owned.hook);
    return () => {
      models.current = null;
      rodRoot.remove(owned.rod);
      hookRoot.remove(owned.hook);
      owned.dispose();
    };
  }, [layout.rodReach, layout.hookReach]);

  useDayNightTransition(useCallback((amount: number) => {
    night.current = amount;
    models.current?.applyNight(amount);
  }, []));

  useFrame(({ clock }) => {
    models.current?.animate(clock.elapsedTime, responsive.motionScale);
  });

  return (
    <group name="Beach Pier Decorations" dispose={null}>
      <group ref={rod} name="Pier Fishing Rod Mount" position={layout.rodPosition} />
      <group ref={hook} name="Pier Lantern Post Mount" position={layout.hookPosition} />
    </group>
  );
}
