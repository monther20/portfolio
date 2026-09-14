import { CORRIDOR } from "../journeyConfig";
import { CORRIDOR_LAMPS, CORRIDOR_LAMP_DEPTHS, NIGHT_CONFIG } from "../dayNight/config";

type Vector3 = [number, number, number];

export type CorridorFixtureSettings = {
  pendant: boolean;
  visible: boolean;
  position: Vector3;
  /** Radians, matching Three.js. */
  rotation: Vector3;
  scale: number;
  intensityMultiplier: number;
  /** Offset from the GLB emitter in world units. */
  lightOffset: Vector3;
};

// Saved inspector offsets, ordered from the corridor entrance to its end.
const FIXTURE_LIGHT_OFFSETS: readonly Vector3[] = [
  [0.11, 0, 0],
  [0, 0, 0],
  [1.22, -0.37, 0],
  [-1.2, 0.37, 0],
  [1.2, 0.37, 0],
  [-1.2, 0.37, 0],
  [1.2, 0.37, 0],
  [0, -1.32, 0.11],
];

export function createCorridorLightSettings() {
  return {
    lighting: {
      intensity: Number(CORRIDOR_LAMPS.intensity),
      fadeNear: Number(CORRIDOR_LAMPS.fadeNear),
      fadeFar: Number(CORRIDOR_LAMPS.fadeFar),
    },
    lanterns: {
      glassEmission: Number(CORRIDOR_LAMPS.glassEmission),
      sourceEmission: Number(CORRIDOR_LAMPS.sourceEmission),
      glassColor: String(NIGHT_CONFIG.glassEmissiveColor),
      sourceColor: String(NIGHT_CONFIG.sourceEmissiveColor),
    },
    fixtures: CORRIDOR_LAMP_DEPTHS.map((depth, index): CorridorFixtureSettings => {
      const pendant = index === 1 || index === 7;
      const side = index % 2 === 0 ? -1 : 1;
      return {
        pendant,
        visible: true,
        position: [
          pendant ? 0 : side * (CORRIDOR.halfWidth - CORRIDOR_LAMPS.wallInset),
          pendant ? CORRIDOR.ceilY - CORRIDOR_LAMPS.ceilingInset : CORRIDOR_LAMPS.sconceHeight,
          CORRIDOR.startZ - depth,
        ],
        rotation: index === 7
          ? [-0.00159265358979299, 0, -0.00159265358979299]
          : [0, index === 3 ? -1.57159265358979 : pendant ? 0 : (-side * Math.PI) / 2, 0],
        scale: 1,
        intensityMultiplier: 1,
        lightOffset: [...FIXTURE_LIGHT_OFFSETS[index]],
      };
    }),
  };
}

export type CorridorLightSettings = ReturnType<typeof createCorridorLightSettings>;
