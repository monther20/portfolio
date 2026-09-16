import * as THREE from "three";
import { PAPER_BOAT_LIGHTING, type PaperBoatLighting } from "./paperBoatConfig";

// White sketch paper by day; texture and vertex shading still define the folds.
const DAY_OUTER = new THREE.Color("#ffffff");
const DAY_INNER = new THREE.Color("#ffffff");
const NIGHT_OUTER = new THREE.Color("#aab2bd");
const NIGHT_INNER = new THREE.Color("#e9ddc5");
const DAY_PENCIL = new THREE.Color("#514d47");
const NIGHT_PENCIL = new THREE.Color("#272c36");

/** Own only this sampling configuration; the loader's cached source is borrowed. */
export function clonePaperBoatTexture(source: THREE.Texture) {
  const texture = source.clone();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.4);
  texture.needsUpdate = true;
  return texture;
}

/** An illustrated spill on the unlit sea, not a reflection/render pass. */
function createWaterGlow() {
  return new THREE.ShaderMaterial({
    uniforms: {
      // useFogFade enables material.fog; Three refreshes these even though
      // this additive wash fades alpha instead of blending toward fog colour.
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      nightAmount: { value: 0 },
      fade: { value: 1 },
      glowColor: { value: new THREE.Color(PAPER_BOAT_LIGHTING.washColor) },
      intensity: { value: PAPER_BOAT_LIGHTING.washIntensity },
    },
    vertexShader: `varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec2 vUv;
      uniform float nightAmount;
      uniform float fade;
      uniform float intensity;
      uniform vec3 glowColor;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x += 0.035 * sin(p.y * 21.0);
        float r = dot(p, p);
        float feather = exp(-3.0 * r) * (1.0 - smoothstep(0.3, 1.0, r));
        // Quiet broken pencil-like wave bands; the underlying sea stays visible.
        float ripples = 0.72 + 0.28 * sin(p.y * 48.0 + sin(p.x * 12.0));
        gl_FragColor = vec4(glowColor, feather * ripples * nightAmount * fade * intensity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Each boat owns its materials so useFogFade cannot change a neighbour's opacity. */
export function createPaperBoatMaterials(texture: THREE.Texture) {
  const outer = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture, // Keep the shader feature attached through every toggle.
    emissive: PAPER_BOAT_LIGHTING.outerColor,
    emissiveIntensity: 0,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
    flatShading: true,
    vertexColors: true,
    fog: true,
    // Push only the paper depth slightly back so authored graphite stays crisp.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const inner = outer.clone();
  inner.emissive.set(PAPER_BOAT_LIGHTING.innerColor);
  const pencil = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    fog: true,
  });
  const surfaces = [outer, inner];
  const wash = createWaterGlow();

  function applyNight(
    amount: number,
    lighting: Readonly<PaperBoatLighting> = PAPER_BOAT_LIGHTING,
  ) {
    const mix = THREE.MathUtils.clamp(amount, 0, 1);
    outer.color.lerpColors(DAY_OUTER, NIGHT_OUTER, mix);
    inner.color.lerpColors(DAY_INNER, NIGHT_INNER, mix);
    pencil.color.lerpColors(DAY_PENCIL, NIGHT_PENCIL, mix);
    const lightMix = lighting.enabled ? mix : 0;
    wash.uniforms.nightAmount.value = lightMix;
    wash.uniforms.glowColor.value.set(lighting.washColor);
    wash.uniforms.intensity.value = lighting.washIntensity;
    outer.emissive.set(lighting.outerColor);
    inner.emissive.set(lighting.innerColor);
    // Bright inner folds read as a paper lantern even on tiers without bloom.
    outer.emissiveIntensity = lighting.outerEmission * lightMix;
    inner.emissiveIntensity = lighting.innerEmission * lightMix;
  }
  applyNight(0);
  return {
    outer,
    inner,
    pencil,
    wash,
    surfaces,
    applyNight,
    dispose() {
      outer.dispose();
      inner.dispose();
      pencil.dispose();
      wash.dispose();
      // The shared cloned texture belongs to the section, not these materials.
    },
  };
}
