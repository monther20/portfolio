import { MathUtils } from "three";
import { CORRIDOR } from "../journeyConfig";

/** Camera-relative distances, not an overlay: clouds and paper still cover the sky. */
export const NIGHT_SKY_DEPTH = 125;
export const METEOR_PERIOD = 22;
export const METEOR_PATHS = [
  { delay: 2.8, duration: 1.85, from: [-0.12, 0.88], to: [0.72, 0.35], length: 0.36 },
  { delay: 12.4, duration: 1.65, from: [0.62, 0.8], to: [-0.18, 0.37], length: 0.3 },
] as const;

export function nightSkyOpacity(cameraZ: number, nightAmount: number) {
  return MathUtils.clamp(nightAmount, 0, 1) * MathUtils.smoothstep(
    CORRIDOR.endWallZ + 3 - cameraZ,
    0,
    10,
  );
}

/** Reserve an upper-left pocket, clear of the right-hand navigation and contact controls. */
export function nightSkyLayout(fov: number, aspect: number) {
  const halfHeight = Math.tan(MathUtils.degToRad(fov / 2)) * NIGHT_SKY_DEPTH;
  const halfWidth = halfHeight * aspect;
  return {
    halfHeight,
    halfWidth,
    moonX: halfWidth * (aspect < 0.9 ? -0.42 : -0.57),
    moonY: halfHeight * 0.64,
    // Inset and cap width on portrait screens, including room for flight banking.
    moonSize: halfHeight * Math.min(0.23, aspect * 0.36),
  };
}

/** No timers/random respawns: reversible, bounded samples with a long quiet interval. */
export function meteorSample(index: number, elapsed: number, reducedMotion = false) {
  const path = METEOR_PATHS[index];
  const local = Math.max(0, elapsed) % METEOR_PERIOD - path.delay;
  const progress = MathUtils.clamp(local / path.duration, 0, 1);
  const opacity = reducedMotion || local <= 0 || local >= path.duration
    ? 0
    : MathUtils.smoothstep(progress, 0, 0.16) * (1 - MathUtils.smoothstep(progress, 0.67, 1));
  return {
    x: MathUtils.lerp(path.from[0], path.to[0], progress),
    y: MathUtils.lerp(path.from[1], path.to[1], progress),
    dx: path.to[0] - path.from[0],
    dy: path.to[1] - path.from[1],
    length: path.length,
    opacity,
  };
}
