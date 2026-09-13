"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import type { RoomDebugState } from "../roomDebug/types";
import { DAY_CONFIG, MOON_POSITION, NIGHT_CONFIG } from "./config";
import { useDayNight, useDayNightTransition } from "./DayNightProvider";

const NightPostProcessing = lazy(() => import("./NightPostProcessing"));

export default function DayNightLighting({ debug }: { debug: RoomDebugState }) {
  const { gl, scene } = useThree();
  const { transition } = useDayNight();
  const { qualityTier } = useResponsiveExperience();
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const [bloomActive, setBloomActive] = useState(false);
  const activeRef = useRef(false);
  const originalRenderer = useMemo(
    () => ({ exposure: gl.toneMappingExposure, toneMapping: gl.toneMapping }),
    [gl],
  );
  const colors = useMemo(
    () => ({
      background: [
        new THREE.Color(debug.scene.dayBackgroundColor),
        new THREE.Color(NIGHT_CONFIG.background),
      ],
      fog: [
        new THREE.Color(debug.scene.dayFogColor),
        new THREE.Color(NIGHT_CONFIG.fog),
      ],
      ambient: [
        new THREE.Color(debug.lights.interiorAmbient.color),
        new THREE.Color(NIGHT_CONFIG.ambient.color),
      ],
      sky: [
        new THREE.Color(DAY_CONFIG.hemisphere.sky),
        new THREE.Color(NIGHT_CONFIG.hemisphere.sky),
      ],
      ground: [
        new THREE.Color(DAY_CONFIG.hemisphere.ground),
        new THREE.Color(NIGHT_CONFIG.hemisphere.ground),
      ],
      moon: [
        new THREE.Color(DAY_CONFIG.directional.color),
        new THREE.Color(NIGHT_CONFIG.directional.color),
      ],
    }),
    [debug],
  );

  useDayNightTransition(
    useCallback(
      (amount) => {
        const mixColor = (target: THREE.Color, pair: THREE.Color[]) =>
          target.copy(pair[0]).lerp(pair[1], amount);
        if (scene.background instanceof THREE.Color)
          mixColor(scene.background, colors.background);
        if (scene.fog instanceof THREE.Fog)
          mixColor(scene.fog.color, colors.fog);
        if (ambient.current) {
          mixColor(ambient.current.color, colors.ambient);
          ambient.current.intensity = THREE.MathUtils.lerp(
            debug.lights.interiorAmbient.dayIntensity,
            NIGHT_CONFIG.ambient.intensity,
            amount,
          );
        }
        if (hemisphere.current) {
          mixColor(hemisphere.current.color, colors.sky);
          mixColor(hemisphere.current.groundColor, colors.ground);
          hemisphere.current.intensity = THREE.MathUtils.lerp(
            DAY_CONFIG.hemisphere.intensity,
            NIGHT_CONFIG.hemisphere.intensity,
            amount,
          );
        }
        if (moon.current) {
          mixColor(moon.current.color, colors.moon);
          moon.current.intensity = THREE.MathUtils.lerp(
            DAY_CONFIG.directional.intensity,
            NIGHT_CONFIG.directional.intensity,
            amount,
          );
        }
        scene.environmentIntensity = THREE.MathUtils.lerp(
          debug.environment.studioHdri.environmentIntensity,
          NIGHT_CONFIG.environmentIntensity,
          amount,
        );
        gl.toneMappingExposure = THREE.MathUtils.lerp(
          originalRenderer.exposure,
          NIGHT_CONFIG.exposure,
          amount,
        );
        const nextActive = amount > 0 && qualityTier !== "low";
        if (nextActive !== activeRef.current) {
          activeRef.current = nextActive;
          setBloomActive(nextActive);
        }
      },
      [colors, debug, gl, originalRenderer, qualityTier, scene],
    ),
  );

  useEffect(() => {
    if (qualityTier !== "low") void import("./NightPostProcessing");
  }, [qualityTier]);

  // NoToneMapping ignores exposure. On the inexpensive direct-render path use
  // identity-at-1 LinearToneMapping only at night; the HDR composer instead applies
  // the same exposure in its final linear tone-mapping pass. Never switch to ACES.
  useFrame(() => {
    // Canvas reapplies gl props when page-level door/navigation state changes.
    gl.toneMappingExposure = THREE.MathUtils.lerp(
      originalRenderer.exposure,
      NIGHT_CONFIG.exposure,
      transition.uniforms.nightAmount.value,
    );
    // Drei reassigns this when the HDR environment mounts after a quality resize.
    scene.environmentIntensity = THREE.MathUtils.lerp(
      debug.environment.studioHdri.environmentIntensity,
      NIGHT_CONFIG.environmentIntensity,
      transition.uniforms.nightAmount.value,
    );
    gl.toneMapping =
      qualityTier === "low" && transition.uniforms.nightAmount.value > 0
        ? THREE.LinearToneMapping
        : originalRenderer.toneMapping;
  }, -1);

  useEffect(
    () => () => {
      gl.toneMapping = originalRenderer.toneMapping;
      gl.toneMappingExposure = originalRenderer.exposure;
    },
    [gl, originalRenderer],
  );

  return (
    <>
      <ambientLight
        ref={ambient}
        name="Day Night Ambient"
        visible={debug.lights.interiorAmbient.visible}
        color={debug.lights.interiorAmbient.color}
        intensity={debug.lights.interiorAmbient.dayIntensity}
      />
      <hemisphereLight ref={hemisphere} name="Night Sky Fill" intensity={0} />
      <directionalLight
        ref={moon}
        name="Night Readability Fill"
        position={MOON_POSITION}
        intensity={0}
      />
      {bloomActive ? (
        <Suspense fallback={null}>
          <NightPostProcessing />
        </Suspense>
      ) : null}
    </>
  );
}
