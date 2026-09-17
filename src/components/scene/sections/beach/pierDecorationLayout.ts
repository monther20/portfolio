import { JOURNEY } from "../../journeyConfig";
import { lastBoardwalkPosts } from "./boardwalkLayout";

export const PIER_DECORATION = {
  rodHeight: 1.22,
  rodReach: -0.54,
  lineLength: 0.415,
  envelopeWidth: 0.175,
  envelopeHeight: 0.108,
  lanternRadius: 0.078,
} as const;

/** Match the chosen 1440x1000 sketch, using the actual final pair of pier posts.
 * On narrow screens only the rod's bend and hook's reach turn inward; their
 * mounts stay on the timber rather than floating or shrinking the boardwalk.
 */
export function pierDecorationLayout(aspect: number, fov: number) {
  const post = lastBoardwalkPosts();
  const rodPosition: [number, number, number] = [post.leftX - 0.105, post.topY, post.z + 0.025];
  const hookPosition: [number, number, number] = [post.rightX - 0.105, post.topY - 0.035, post.z + 0.12];
  const aperture = Math.tan((fov * Math.PI) / 360) * Math.max(0.28, aspect);
  const leftLimit = -(JOURNEY.farBound - rodPosition[2]) * aperture * 0.94;
  const rightLimit = (JOURNEY.farBound - hookPosition[2]) * aperture * 0.88;
  const tipX = Math.max(rodPosition[0] + PIER_DECORATION.rodReach, leftLimit + PIER_DECORATION.envelopeWidth / 2);
  const hangerX = Math.min(hookPosition[0] - 0.155, rightLimit - PIER_DECORATION.lanternRadius);
  return {
    rodPosition,
    hookPosition,
    rodReach: tipX - rodPosition[0],
    hookReach: hangerX - hookPosition[0],
  };
}

export function pierDecorationMotion(elapsed: number, motionScale: number) {
  const amount = Math.max(0, Math.min(1, motionScale));
  if (amount === 0) return { letterSwing: 0, lanternSwing: 0, flameScale: 1 };
  return {
    letterSwing: Math.sin(elapsed * 0.7) * 0.018 * amount,
    lanternSwing: Math.sin(elapsed * 0.58 + 1.2) * 0.012 * amount,
    flameScale: 1 + Math.sin(elapsed * 4.1) * 0.035 * amount,
  };
}
