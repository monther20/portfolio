/**
 * journeyConfig.ts — single source of truth for the scroll-journey timeline.
 *
 * Camera z is the master coordinate: every phase boundary, section anchor and
 * camera-path keyframe is expressed in world z (more negative = deeper in).
 *
 * The journey reads:
 *   room → (door) → corridor walk → window launch → sky flight
 *   (journey → skills → projects) → descent → beach boardwalk (contact)
 */

/**
 * Scale the complete, previously tuned corridor while keeping its entrance at
 * the doorway. Layout props use corridorLayoutZ so their spacing follows it,
 * while the window and every later journey section shift by the added depth.
 */
const CORRIDOR_REFERENCE_START_Z = -15.95;
const CORRIDOR_REFERENCE_END_WALL_Z = -82;
const BASE_CORRIDOR_LENGTH_EXTENSION = 16;
const CORRIDOR_LENGTH_SCALE = 1.5;

const CORRIDOR_REFERENCE_LENGTH =
  CORRIDOR_REFERENCE_START_Z - CORRIDOR_REFERENCE_END_WALL_Z;
const CORRIDOR_LENGTH_EXTENSION =
  BASE_CORRIDOR_LENGTH_EXTENSION +
  CORRIDOR_REFERENCE_LENGTH * (CORRIDOR_LENGTH_SCALE - 1);
const extendCorridorZ = (z: number) => z - CORRIDOR_LENGTH_EXTENSION;

/** Scale a position from the previous corridor layout away from the doorway. */
export function corridorLayoutZ(z: number): number {
  return (
    CORRIDOR_REFERENCE_START_Z +
    (z - CORRIDOR_REFERENCE_START_Z) * CORRIDOR_LENGTH_SCALE
  );
}

const CORRIDOR_AVATAR_Z = corridorLayoutZ(-27.5);
/** Keep the enlarged section gaps proportional when corridor length changes. */
const CORRIDOR_SECTION_SPACING = 20 * CORRIDOR_LENGTH_SCALE;

export const JOURNEY = {
  /** Where the camera lands after walking through the door. */
  corridorStart: -20,

  // ── Corridor geometry ──────────────────────────────────────────────────
  corridorHalfWidth: 3.6,
  corridorFloorY: -3.2,
  corridorCeilY: 2.8,
  /** The far wall that holds the window + table. */
  corridorEndWallZ: extendCorridorZ(-66),

  // ── Window / airplane launch ───────────────────────────────────────────
  /** Crossing this z starts the window/airplane launch cinematic. */
  launchTriggerZ: extendCorridorZ(-56),
  /** Back-scroll past this point resets the window/airplane so the corridor can be revisited. */
  corridorReturnResetZ: extendCorridorZ(-54.75),
  /** Camera fully out of the window, flying in the sky. */
  windowExitZ: extendCorridorZ(-74),

  // ── Sky section anchors ────────────────────────────────────────────────
  journeyAnchorZ: extendCorridorZ(-88),
  skillsAnchorZ: extendCorridorZ(-116),
  projectsAnchorZ: extendCorridorZ(-144),

  // ── Descent + beach ────────────────────────────────────────────────────
  descentStartZ: extendCorridorZ(-160),
  /** Airplane detaches from the camera and glides down to the boardwalk. */
  landingTriggerZ: extendCorridorZ(-176),
  beachZ: extendCorridorZ(-184),
  /** Stop scrolling at the far end of the boardwalk. */
  farBound: extendCorridorZ(-192),

  // ── Camera Y profile keys ──────────────────────────────────────────────
  walkY: -1.5,
  skyY: 0.7,
  beachY: -1.2,
} as const;

export type JourneyPhase = "corridor" | "window" | "sky" | "descent" | "beach";

export const CORRIDOR_INFO_STATIONS = {
  /** z of the first wall-mounted info station. */
  firstZ: CORRIDOR_AVATAR_Z - CORRIDOR_SECTION_SPACING,
  /** Distance between station centres down the corridor. */
  spacing: CORRIDOR_SECTION_SPACING,
  /** Distance used to ease a station in after the previous section is passed. */
  activationDistance: 6,
  /** Distance used to level the station and camera after it is passed. */
  exitDistance: 6,
  /** A small side glance toward the active wall section. */
  focusYaw: 0.09,
  /** Subtle upward glance so the framed artwork and title remain in view. */
  focusPitch: 0.02,
  /** Very small camera roll toward the active section. */
  focusRoll: 0.018,
  /** A subtle look toward the final wall note before the window launch. */
  windowFocusZ: extendCorridorZ(-53.35),
  windowFocusRadius: 4.8,
  windowFocusYaw: 0.055,
  windowFocusPitch: 0.04,
} as const;

export function corridorStationZ(index: number): number {
  return CORRIDOR_INFO_STATIONS.firstZ - index * CORRIDOR_INFO_STATIONS.spacing;
}

/** Each station activates as soon as the camera passes the preceding section. */
function corridorStationActivationZ(index: number): number {
  return index === 0 ? CORRIDOR_AVATAR_Z : corridorStationZ(index - 1);
}

/** Smooth, reversible lean amount for the station currently being approached. */
export function corridorStationInfluenceAt(index: number, cameraZ: number): number {
  const activation = smoothstep(
    0,
    CORRIDOR_INFO_STATIONS.activationDistance,
    corridorStationActivationZ(index) - cameraZ,
  );
  const exit = smoothstep(
    0,
    CORRIDOR_INFO_STATIONS.exitDistance,
    corridorStationZ(index) - cameraZ,
  );

  return activation * (1 - exit);
}

export function journeyPhaseAt(z: number): JourneyPhase {
  if (z > JOURNEY.launchTriggerZ) return "corridor";
  if (z > JOURNEY.windowExitZ) return "window";
  if (z > JOURNEY.descentStartZ) return "sky";
  if (z > JOURNEY.beachZ) return "descent";
  return "beach";
}

/** Classic smoothstep, clamped. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * The camera's base height along the journey:
 * level walk through the corridor, a rise as it escapes through the window,
 * a steady cruise across the sky, then a glide down onto the beach.
 */
export function cameraYAt(z: number): number {
  // z decreases as we go deeper, so each ramp measures how far past a key we are.
  // Corridor → window exit: walkY → skyY
  const up = smoothstep(
    0,
    1,
    (JOURNEY.launchTriggerZ - z) /
      (JOURNEY.launchTriggerZ - JOURNEY.windowExitZ),
  );
  // Descent → beach: skyY → beachY
  const down = smoothstep(
    0,
    1,
    (JOURNEY.descentStartZ - z) / (JOURNEY.descentStartZ - JOURNEY.beachZ),
  );

  const cruise = JOURNEY.walkY + (JOURNEY.skyY - JOURNEY.walkY) * up;
  return cruise + (JOURNEY.beachY - JOURNEY.skyY) * down;
}

/** 0 → 1 while the camera slides from the launch trigger out through the window. */
export function windowProgressAt(z: number): number {
  return smoothstep(
    0,
    1,
    (JOURNEY.launchTriggerZ - z) /
      (JOURNEY.launchTriggerZ - JOURNEY.windowExitZ),
  );
}

/** 0 → 1 while the camera descends toward the beach. */
export function descentProgressAt(z: number): number {
  return smoothstep(
    0,
    1,
    (JOURNEY.descentStartZ - z) / (JOURNEY.descentStartZ - JOURNEY.beachZ),
  );
}

// ── Corridor layout anchors (shared by CorridorScene + PaperAirplaneActor) ──
export const CORRIDOR = {
  /** Corridor geometry begins at the doorway so the visible floor reaches the threshold. */
  startZ: CORRIDOR_REFERENCE_START_Z,
  halfWidth: JOURNEY.corridorHalfWidth,
  floorY: JOURNEY.corridorFloorY,
  ceilY: JOURNEY.corridorCeilY,
  endWallZ: JOURNEY.corridorEndWallZ,

  /** The welcoming avatar, centered on the corridor walk line. */
  avatar: { x: 0, z: CORRIDOR_AVATAR_Z },

  /** Window in the end wall — the wall has a real hole here so the camera can fly through. */
  window: {
    x: 0,
    y: -0.35,
    z: JOURNEY.corridorEndWallZ + 0.1,
    width: 2.4,
    height: 2.5,
  },

  /** Table beside the window (billboard decal standing on the floor). */
  table: { x: 1.95, z: JOURNEY.corridorEndWallZ + 2.2 },

  /** Where the paper airplane rests above the table, nose angled toward the window. */
  airplaneRest: [1.9, -1.12, JOURNEY.corridorEndWallZ + 2.4] as [
    number,
    number,
    number,
  ],
  airplaneRestYaw: 0.55,
} as const;

// ── Beach layout anchors (shared by BeachContactSection + PaperAirplaneActor) ──
export const BEACH = {
  seaY: -3.55,
  seaZ: extendCorridorZ(-188),

  /** The wooden boardwalk the camera arrives over. Wide enough for the camera path and airplane landing. */
  boardwalk: {
    x: 0.35,
    topY: -2.35,
    startZ: extendCorridorZ(-172),
    endZ: extendCorridorZ(-192),
    width: 3.4,
  },

  /** Where the paper airplane touches down at the far end of the boardwalk. */
  landing: [0.35, -2.63, -245.805] as [number, number, number],

  /** Contact barrels are centered dynamically according to the links that are available. */
  crates: [
    { key: "message" as const, label: "message" },
    { key: "github" as const, label: "github" },
    { key: "linkedin" as const, label: "linkedin" },
  ],
} as const;

/** The airplane's camera-locked offset during the sky flight (from the old debug defaults). */
export const AIRPLANE_CAMERA_OFFSET = { x: 0, y: -0.46, z: -2.85 } as const;
