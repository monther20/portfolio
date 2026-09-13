import * as THREE from "three";
import {
  type LanternUniforms,
  NIGHT_CONFIG,
  NIGHT_LIGHT_COUNT,
} from "./config";

/** Extend, never replace, an unlit pencil material. Install AFTER other shader
 * patches (the door has a loading wipe). The day branch is an exact identity.
 */
export function addUnlitNightLighting(
  material: THREE.MeshBasicMaterial,
  uniforms: LanternUniforms,
  kind: keyof typeof NIGHT_CONFIG.unlitTint,
) {
  const previousCompile = material.onBeforeCompile;
  const previousProgramKey = material.customProgramCacheKey;
  const previousKey = previousProgramKey.call(material);
  const nightTint = { value: new THREE.Color(NIGHT_CONFIG.unlitTint[kind]) };

  material.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms, { nightTint });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vNightPosition;
        varying vec3 vNightNormal;`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vNightPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vNightNormal = inverseTransformDirection(normalMatrix * normal, viewMatrix);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float nightAmount;
        uniform vec3 nightTint;
        uniform vec3 lanternPositions[${NIGHT_LIGHT_COUNT}];
        uniform float lanternIntensities[${NIGHT_LIGHT_COUNT}];
        uniform vec3 lanternColor;
        uniform float lanternDistance;
        uniform float lanternDecay;
        varying vec3 vNightPosition;
        varying vec3 vNightNormal;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `
        if (nightAmount > 0.0) {
          vec3 illumination = mix(vec3(1.0), nightTint, nightAmount);
          for (int i = 0; i < ${NIGHT_LIGHT_COUNT}; i++) {
            vec3 toLight = lanternPositions[i] - vNightPosition;
            float d = length(toLight);
            // Three's punctual-light cutoff and decay, using the real light's uniforms.
            float attenuation = 1.0 / max(pow(d, lanternDecay), 0.01);
            attenuation *= pow2(saturate(1.0 - pow4(d / lanternDistance)));
            float facing = max(dot(normalize(vNightNormal), normalize(toLight)), 0.0);
            illumination += lanternColor * lanternIntensities[i] * attenuation * facing / PI;
          }
          outgoingLight *= illumination;
        }
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () =>
    `${previousKey}-illustrated-night-v2-${kind}-${NIGHT_LIGHT_COUNT}`;
  material.needsUpdate = true;
  return () => {
    material.onBeforeCompile = previousCompile;
    material.customProgramCacheKey = previousProgramKey;
    material.needsUpdate = true;
  };
}
