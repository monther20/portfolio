"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import { CORRIDOR } from "../journeyConfig";
import { useDayNight } from "./DayNightProvider";
import { NIGHT_STARS } from "./config";

/** One deterministic, sparse hemisphere. No star textures, lights or geometry
 * in the walking route; the same distant sky continues down to the contact sea.
 */
export default function NightSky() {
  const { transition } = useDayNight();
  const responsive = useResponsiveExperience();
  const points = useRef<THREE.Points>(null);
  const count =
    responsive.qualityTier === "low" ? NIGHT_STARS.lowCount : NIGHT_STARS.count;
  const geometry = useMemo(() => {
    let seed = 19507;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const cool = new THREE.Color(NIGHT_STARS.color);
    const warm = new THREE.Color(NIGHT_STARS.warmColor);
    for (let index = 0; index < count; index++) {
      const azimuth = random() * Math.PI * 2;
      const height = 0.06 + random() * 0.85;
      const horizontal = Math.sqrt(1 - height * height);
      positions.set(
        [
          Math.cos(azimuth) * horizontal * NIGHT_STARS.radius,
          height * NIGHT_STARS.radius,
          Math.sin(azimuth) * horizontal * NIGHT_STARS.radius,
        ],
        index * 3,
      );
      sizes[index] = THREE.MathUtils.lerp(
        NIGHT_STARS.minSize,
        NIGHT_STARS.maxSize,
        random() ** 2,
      );
      phases[index] = random() * Math.PI * 2;
      (random() > 0.84 ? warm : cool).toArray(colors, index * 3);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    result.setAttribute("starSize", new THREE.BufferAttribute(sizes, 1));
    result.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    result.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return result;
  }, [count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          opacity: { value: 0 },
          time: { value: 0 },
          pixelRatio: { value: 1 },
        },
        vertexShader: `attribute float starSize; attribute float phase;
      uniform float pixelRatio; uniform float time;
      varying float brightness; varying vec3 starColor;
      void main() {
        starColor = color;
        brightness = 0.9 + 0.1 * sin(time * 0.35 + phase);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = starSize * pixelRatio;
      }`,
        fragmentShader: `uniform float opacity; varying float brightness; varying vec3 starColor;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float core = exp(-5.0 * dot(p, p));
        float cross = exp(-22.0 * abs(p.x) - 3.0 * abs(p.y)) + exp(-22.0 * abs(p.y) - 3.0 * abs(p.x));
        float ink = min(1.0, core * 0.8 + cross * 0.18);
        gl_FragColor = vec4(starColor, ink * opacity * brightness);
        #include <colorspace_fragment>
      }`,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera, clock }) => {
    if (!points.current) return;
    const outside = THREE.MathUtils.smoothstep(
      CORRIDOR.endWallZ + 3 - camera.position.z,
      0,
      10,
    );
    material.uniforms.opacity.value =
      transition.uniforms.nightAmount.value * outside * NIGHT_STARS.opacity;
    material.uniforms.time.value = responsive.reducedMotion
      ? 0
      : clock.elapsedTime;
    material.uniforms.pixelRatio.value = responsive.maxDpr;
    points.current.position.copy(camera.position);
    points.current.visible = material.uniforms.opacity.value > 0;
  });
  return (
    <points
      ref={points}
      name="Illustrated Night Stars"
      geometry={geometry}
      material={material}
      renderOrder={-50}
      frustumCulled={false}
      raycast={() => {}}
    />
  );
}
