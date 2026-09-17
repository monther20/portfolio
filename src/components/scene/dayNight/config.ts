import * as THREE from "three";

export type TimeOfDay = "day" | "night";

// Day values are the original hero settings, not a new daytime grade.
export const DAY_CONFIG = {
  background: "#ffffff",
  fog: "#ffffff",
  ambient: { color: "#ffffff", intensity: 2.5 },
  hemisphere: { sky: "#ffffff", ground: "#ffffff", intensity: 0 },
  directional: { color: "#ffffff", intensity: 0 },
  environmentIntensity: 0.2,
  exposure: 1,
  lanternIntensity: 0,
  glassColor: "#bcbcbc",
  glassEmissiveColor: "#ffae50",
  glassEmissiveIntensity: 0,
  sourceColor: "#505050",
  sourceEmissiveIntensity: 0,
  glowOpacity: 0,
  bloomIntensity: 0,
} as const;

export const NIGHT_CONFIG = {
  background: "#202c43",
  fog: "#202c43",
  ambient: { color: "#8399b8", intensity: 0.3 },
  hemisphere: { sky: "#91a9c8", ground: "#344158", intensity: 0.55 },
  directional: { color: "#9caecb", intensity: 0.16 },
  environmentIntensity: 0.025,
  exposure: 0.86,
  lanternColor: "#ffc477",
  // World units: bulbs sit ~4.25 above the path. Slightly softened inverse-square
  // falloff carries an illustrated wash onto the path/furniture without more lights.
  lanternIntensity: 5.5,
  lanternDistance: 18,
  lanternDecay: 1.65,
  glassColor: "#ffe5bc",
  glassEmissiveColor: "#ffbd69",
  glassEmissiveIntensity: 1.65,
  sourceColor: "#ffe5c4",
  sourceEmissiveColor: "#ffd59c",
  sourceEmissiveIntensity: 3,
  glowOpacity: 0.12,
  bloomIntensity: 0.28,
  // Only the GLB's unlit materials need help; all other pencil art receives lights.
  unlitTint: {
    door: "#b2bdcd",
    lantern: "#8191a9",
    corridor: "#535f76",
    timber: "#8b8d99",
    sea: "#627e9c",
    illustration: "#b9c5d8",
  },
} as const;

export const DAY_NIGHT_TRANSITION = {
  duration: 2,
  reducedDuration: 0.01,
  ease: "power2.inOut",
} as const;
export const NIGHT_BLOOM = {
  threshold: 1.1,
  smoothing: 0.35,
  resolutionScale: 0.5,
  levels: 4,
  radius: 0.55,
} as const;
export const LANTERN_GLOW = {
  width: 3.8,
  height: 4.6,
  wallOffset: 0.015,
} as const;
export const MOON_POSITION: [number, number, number] = [-6, 9, -5];

export type LanternIndex = 0 | 1;

export const NIGHT_ART = {
  text: "#ded2bc",
  paperEmission: "#c9c9c5",
  foldedPaperEmission: 0.2,
  letterPaperEmission: 0.85,
} as const;

// Four reusable corridor lights cover eight fixtures. Each slot is assigned to
// fixtures farther apart than the culling radius, so it moves only while dark.
export const CORRIDOR_LAMP_DEPTHS = [12, 24, 37, 49, 62, 74, 87, 97] as const;
export const CORRIDOR_LAMPS = {
  lightPoolSize: 4,
  sconceHeight: 0.45,
  wallInset: 0.025,
  ceilingInset: 0.035,
  intensity: 4.8,
  glassEmission: 2.9,
  sourceEmission: 6.05,
  fadeNear: 19,
  fadeFar: 23,
} as const;
export const NIGHT_LIGHT_COUNT = 2 + CORRIDOR_LAMPS.lightPoolSize;
export const NIGHT_STARS = {
  count: 960,
  lowCount: 520,
  radius: 130,
  opacity: 0.85,
  minSize: 1.35,
  maxSize: 6.5,
  color: "#d5ddec",
  warmColor: "#e2d4b8",
} as const;

/** These same uniforms are fed from the actual PointLights, not guessed lights.
 * Unlit GLBs keep their baked atlas and gain just a Lambert-like nighttime wash.
 */
export function createLanternUniforms() {
  return {
    nightAmount: { value: 0 },
    lanternPositions: {
      value: Array.from(
        { length: NIGHT_LIGHT_COUNT },
        () => new THREE.Vector3(),
      ),
    },
    lanternIntensities: { value: Array<number>(NIGHT_LIGHT_COUNT).fill(0) },
    lanternColor: { value: new THREE.Color(NIGHT_CONFIG.lanternColor) },
    lanternDistance: { value: NIGHT_CONFIG.lanternDistance },
    lanternDecay: { value: NIGHT_CONFIG.lanternDecay },
  };
}
export type LanternUniforms = ReturnType<typeof createLanternUniforms>;
