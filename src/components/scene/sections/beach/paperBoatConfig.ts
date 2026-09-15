import { BEACH, JOURNEY } from "../../journeyConfig";

export const PAPER_BOAT_MOTION = {
  bob: 0.04,
  pitch: 0.02,
  roll: 0.024,
  driftX: 0.12,
  driftZ: 0.45,
  yaw: 0.05,
} as const;

export type PaperBoatPlacement = {
  id: string;
  x: number;
  z: number;
  scale: number;
  heading: number;
  phase: number;
};

/** World-space, NOT lane-scaled: the boardwalk retains its fixed 3.4 width.
 * Its group shifts z by -1.72 and its extended end is currently -247.745.
 * These sit outboard of that end, clear of planks, posts and the landing lane.
 */
export const PAPER_BOATS: readonly PaperBoatPlacement[] = [
  {
    id: "near-left",
    x: -2.65,
    z: BEACH.boardwalk.endZ - 12.4,
    scale: 0.8,
    heading: 0.35,
    phase: 0.4,
  },
  {
    id: "far-left",
    x: -3.4,
    z: BEACH.boardwalk.endZ - 17.2,
    scale: 0.68,
    heading: -0.48,
    phase: 2.7,
  },
  {
    id: "right",
    x: 3.28,
    z: BEACH.boardwalk.endZ - 13.6,
    scale: 0.76,
    heading: -0.55,
    phase: 4.6,
  },
];

export type PaperBoatLighting = {
  enabled: boolean;
  outerColor: string;
  innerColor: string;
  outerEmission: number;
  innerEmission: number;
  washColor: string;
  washIntensity: number;
  washWidth: number;
  washLength: number;
  washOffsetX: number;
  washOffsetZ: number;
};

export const PAPER_BOAT_LIGHTING: Readonly<PaperBoatLighting> = {
  enabled: true,
  outerColor: "#acb4c1",
  innerColor: "#f4ecd9",
  outerEmission: 0.28,
  innerEmission: 1.65,
  washColor: "#ffe6b5",
  washIntensity: 0.5,
  washWidth: 4.2,
  washLength: 3.6,
  washOffsetX: 0,
  washOffsetZ: 0,
};

/** Stable authored settings, independent of each boat's animated bob/drift. */
export function createPaperBoatSettings() {
  return {
    autoFit: true,
    motion: 1,
    boats: PAPER_BOATS.map((boat) => ({
      ...boat,
      visible: true,
      hullHeight: 0,
      lighting: { ...PAPER_BOAT_LIGHTING },
    })),
  };
}

export type PaperBoatSettings = ReturnType<typeof createPaperBoatSettings>;

/** Swept width includes drift, gentle heading changes and both tilt axes. */
export function paperBoatHalfWidth(boat: PaperBoatPlacement) {
  return (
    boat.scale *
    (1.12 * Math.abs(Math.cos(boat.heading)) +
      0.4 * Math.abs(Math.sin(boat.heading)) +
      0.7 * (PAPER_BOAT_MOTION.pitch + PAPER_BOAT_MOTION.roll) +
      1.52 * PAPER_BOAT_MOTION.yaw + PAPER_BOAT_MOTION.driftX)
  );
}

/** On portrait phones, full-size near boats would sit behind the contact signs.
 * Use smaller paper companions in the foreground gaps instead, anchoring their
 * outside edges to the actual pier (never multiply absolute x by laneScale).
 * The farther left boat occupies a separate horizon pocket before dense fog.
 */
export function paperBoatForView(
  boat: PaperBoatPlacement,
  aspect: number,
  cameraFov: number,
): PaperBoatPlacement {
  const aperture = Math.tan((cameraFov * Math.PI) / 360) * aspect;
  const compact = Math.max(0, Math.min(1, (0.27 - aperture) / 0.09));
  if (compact === 0) return boat;
  if (boat.id === "far-left") {
    return {
      ...boat,
      x: boat.x + (-2.85 - boat.x) * compact,
      scale: boat.scale + (0.48 - boat.scale) * compact,
      z: boat.z + (JOURNEY.farBound - 22 - boat.z) * compact,
    };
  }
  const scale = boat.scale * (1 - compact * 0.66);
  const resized = { ...boat, scale };
  const side = boat.x < BEACH.boardwalk.x ? -1 : 1;
  const edge = BEACH.boardwalk.x + (side * BEACH.boardwalk.width) / 2;
  const compactX = edge + side * (paperBoatHalfWidth(resized) + 0.22);
  resized.x = boat.x + (compactX - boat.x) * compact;
  return resized;
}

/** Fit only the boats, with a small screen-edge gutter. */
export function paperBoatPosition(
  boat: PaperBoatPlacement,
  aspect: number,
  cameraFov: number,
): [number, number, number] {
  const halfView = Math.tan((cameraFov * Math.PI) / 360);
  const farBoat = boat.id === "far-left";
  const fitDepth =
    (Math.abs(boat.x) + paperBoatHalfWidth(boat) + (farBoat ? 0.12 : 0.025)) /
    (halfView * Math.max(0.28, aspect) * (farBoat ? 0.92 : 0.96));
  return [
    boat.x,
    BEACH.seaY,
    Math.min(boat.z, JOURNEY.farBound - fitDepth - PAPER_BOAT_MOTION.driftZ * boat.scale),
  ];
}

export type PaperBoatPose = {
  x: number; y: number; z: number;
  pitch: number; yaw: number; roll: number;
};

/** Writes a reused target each frame. Zero motion also resets an already-bobbing boat. */
export function writePaperBoatPose(
  target: PaperBoatPose,
  elapsed: number,
  phase: number,
  motionScale: number,
) {
  const amount = Math.max(0, Math.min(1, motionScale));
  if (amount === 0) {
    target.x = target.y = target.z = target.pitch = target.yaw = target.roll = 0;
    return;
  }
  // Closed, slow current paths: no accumulated drift or visible loop reset.
  // Independent phases keep neighbours from moving like synchronized toys.
  const current = elapsed * 0.26 + phase;
  const wave = elapsed * 0.72 + phase;
  target.x = Math.sin(current) * PAPER_BOAT_MOTION.driftX * amount;
  target.z = Math.cos(current) * PAPER_BOAT_MOTION.driftZ * amount;
  target.yaw = Math.sin(current + 0.65) * PAPER_BOAT_MOTION.yaw * amount;
  target.y = Math.sin(wave) * PAPER_BOAT_MOTION.bob * amount;
  // Crest and slope share a phase so the hull rocks as each swell passes.
  target.pitch = Math.cos(wave) * PAPER_BOAT_MOTION.pitch * amount;
  target.roll = Math.sin(wave + 0.8) * PAPER_BOAT_MOTION.roll * amount;
}
