"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import { useDayNight } from "./DayNightProvider";
import { NIGHT_STARS } from "./config";
import {
  METEOR_PATHS,
  NIGHT_SKY_DEPTH,
  meteorSample,
  nightSkyLayout,
  nightSkyOpacity,
} from "./nightSkyLayout";
import {
  createMeteorMaterial,
  createMoonMaterial,
  createNightStarGeometry,
  createNightStarMaterial,
} from "./nightSkyModel";

const ignoreRaycast = () => {};

/** A distant illustrated sky shared by the flight and contact sea. Everything
 * stays behind the artwork, fades with the scene clock, and makes no asset requests.
 */
export default function NightSky() {
  const { transition } = useDayNight();
  const responsive = useResponsiveExperience();
  const sky = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const meteors = useRef<(THREE.Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const count = responsive.qualityTier === "low" ? NIGHT_STARS.lowCount : NIGHT_STARS.count;
  const stars = useMemo(() => createNightStarGeometry(count), [count]);
  const art = useMemo(() => ({
    starMaterial: createNightStarMaterial(),
    moonMaterial: createMoonMaterial(),
    moonPlane: new THREE.PlaneGeometry(2, 2),
    // The local origin is the meteor head, with its tail behind it.
    meteorPlane: new THREE.PlaneGeometry(1, 1).translate(-0.5, 0, 0),
    meteorMaterials: METEOR_PATHS.map(() => createMeteorMaterial()),
  }), []);

  useEffect(() => () => stars.dispose(), [stars]);
  useEffect(() => () => {
    art.starMaterial.dispose();
    art.moonMaterial.dispose();
    art.moonPlane.dispose();
    art.meteorPlane.dispose();
    art.meteorMaterials.forEach((material) => material.dispose());
  }, [art]);

  useFrame(({ camera, gl }, delta) => {
    if (!sky.current || !moon.current || !(camera instanceof THREE.PerspectiveCamera)) return;
    const opacity = nightSkyOpacity(camera.position.z, transition.uniforms.nightAmount.value);
    sky.current.visible = opacity > 0.001;
    if (!sky.current.visible) return;

    // Follow translation, not rotation: the moon still responds naturally to
    // flight banking/parallax. Do not advance a meteor behind the corridor/inactive tab.
    sky.current.position.copy(camera.position);
    if (!responsive.reducedMotion) elapsed.current += Math.min(delta, 0.05);
    art.starMaterial.uniforms.opacity.value = opacity * NIGHT_STARS.opacity;
    art.starMaterial.uniforms.time.value = responsive.reducedMotion ? 0 : elapsed.current;
    art.starMaterial.uniforms.pixelRatio.value = gl.getPixelRatio();
    art.moonMaterial.uniforms.opacity.value = opacity;

    const layout = nightSkyLayout(camera.getEffectiveFOV(), camera.aspect);
    moon.current.position.set(layout.moonX, layout.moonY, -NIGHT_SKY_DEPTH);
    moon.current.scale.setScalar(layout.moonSize);
    METEOR_PATHS.forEach((_, index) => {
      const mesh = meteors.current[index];
      if (!mesh) return;
      const sample = meteorSample(index, elapsed.current, responsive.reducedMotion);
      mesh.visible = sample.opacity > 0;
      if (!mesh.visible) return;
      mesh.position.set(sample.x * layout.halfWidth, sample.y * layout.halfHeight, -NIGHT_SKY_DEPTH + 1);
      mesh.rotation.z = Math.atan2(sample.dy * layout.halfHeight, sample.dx * layout.halfWidth);
      mesh.scale.set(layout.halfHeight * sample.length, layout.halfHeight * 0.028, 1);
      art.meteorMaterials[index].uniforms.opacity.value = opacity * sample.opacity * 0.82;
    });
  });

  return (
    <group ref={sky} name="Illustrated Night Sky" visible={false} dispose={null}>
      <points
        name="Illustrated Night Stars"
        geometry={stars}
        material={art.starMaterial}
        renderOrder={-50}
        frustumCulled={false}
        raycast={ignoreRaycast}
      />
      <mesh
        ref={moon}
        name="Pencil Crescent Moon"
        geometry={art.moonPlane}
        material={art.moonMaterial}
        renderOrder={-49}
        frustumCulled={false}
        raycast={ignoreRaycast}
      />
      {art.meteorMaterials.map((material, index) => (
        <mesh
          key={index}
          ref={(mesh) => { meteors.current[index] = mesh; }}
          name={`Pencil Meteor ${index + 1}`}
          geometry={art.meteorPlane}
          material={material}
          visible={false}
          renderOrder={-48}
          frustumCulled={false}
          raycast={ignoreRaycast}
        />
      ))}
    </group>
  );
}
