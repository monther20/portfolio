import type { ResponsiveExperienceProfile } from "../../ResponsiveExperience";
import { corridorHingedWallSettings } from "./hingedWallSettings";
import { JOURNEY } from "../journeyConfig";

/** Leave enough distance for the full framed introduction and its notes. */
export const CORRIDOR_READING_DISTANCE = 12;

type FramingProfile = Pick<ResponsiveExperienceProfile,
  "width" | "height" | "aspect" | "cameraFov" | "isCompact" | "isPortrait" | "greeterScale"
>;

/** Fit both complete greeting lines before the visitor begins walking past. */
export function corridorGreeterLayout(profile: FramingProfile) {
  const stacked = profile.isCompact && profile.isPortrait;
  const widthAtSplit = 2 * 6 * Math.tan(profile.cameraFov * Math.PI / 360) * profile.aspect;
  const availableWidth = widthAtSplit * (profile.isCompact ? 0.88 : 0.92);
  const nameFontSize = Math.min(1.55, availableWidth / (4 * profile.greeterScale));
  const roleFontSize = Math.min(0.48, availableWidth / (8.8 * profile.greeterScale));

  return {
    nameFontSize,
    roleFontSize,
    nameY: stacked ? (profile.aspect < 0.6 ? 0.15 : -0.1) : -1.25,
    roleY: stacked ? -3 : -2.12,
    avatarY: stacked ? -1.5 : -1.85,
    avatarHeight: stacked ? 2.4 : 2.7,
    // Shrinking toward the origin would pull the portrait above eye level.
    y: stacked ? JOURNEY.walkY * (1 - profile.greeterScale) : 0,
  };
}

/** The actual centre of a hinged display, shared by reading and projection QA. */
export function corridorStationCenter(side: -1 | 1, z: number, influence = 1) {
  const settings = corridorHingedWallSettings;
  const yaw = -side * Math.PI / 2 + side * (settings.restAngle + settings.openAngle * influence);
  const localX = -side * settings.width / 2;
  return {
    x: side * settings.x + localX * Math.cos(yaw),
    y: settings.y - 0.25,
    z: z + settings.width / 2 - localX * Math.sin(yaw),
    yaw,
  };
}

/** Aim at the artwork rather than making a fixed, barely perceptible glance.
 * Bottom/rail gutters match the navigation, so content keeps its own space.
 * This returns only angles; the existing reversible journey retains its path.
 */
export function corridorStationReadingAngles(
  side: -1 | 1,
  z: number,
  cameraZ: number,
  profile: FramingProfile,
  influence = 1,
) {
  const center = corridorStationCenter(side, z, influence);
  // Once the visitor walks alongside a panel, keep facing down the corridor.
  // Tracking its centre all the way past would cause a sudden 90-degree turn.
  const depth = Math.max(CORRIDOR_READING_DISTANCE - 2, cameraZ - center.z);
  const distance = Math.hypot(center.x, depth);
  const tangent = Math.tan(profile.cameraFov * Math.PI / 360);
  const rightGutter = profile.isCompact ? 0 : Math.min(148, profile.width * 0.13);
  const bottomGutter = profile.isCompact ? Math.min(100, profile.height * 0.2) : 0;

  return {
    yaw: Math.atan2(-center.x, depth) - Math.atan(tangent * rightGutter / profile.height),
    pitch: Math.atan2(center.y - JOURNEY.walkY, distance) - Math.atan(tangent * bottomGutter / profile.height),
  };
}
