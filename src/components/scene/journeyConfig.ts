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

export const JOURNEY = {
  /** Where the camera lands after walking through the door. */
  corridorStart: -20,

  // ── Corridor geometry ──────────────────────────────────────────────────
  corridorHalfWidth: 3.6,
  corridorFloorY: -3.2,
  corridorCeilY: 2.8,
  /** The far wall that holds the window + table. */
  corridorEndWallZ: -66,

  // ── Window / airplane launch ───────────────────────────────────────────
  /** Crossing this z opens the window and launches the paper airplane. */
  launchTriggerZ: -56,
  /** Back-scroll past this point resets the window/airplane so the corridor can be revisited. */
  corridorReturnResetZ: -54.75,
  /** Camera fully out of the window, flying in the sky. */
  windowExitZ: -74,

  // ── Sky section anchors ────────────────────────────────────────────────
  journeyAnchorZ: -88,
  skillsAnchorZ: -116,
  projectsAnchorZ: -144,

  // ── Descent + beach ────────────────────────────────────────────────────
  descentStartZ: -160,
  /** Airplane detaches from the camera and glides down to the boardwalk. */
  landingTriggerZ: -176,
  beachZ: -184,
  farBound: -190,

  // ── Camera Y profile keys ──────────────────────────────────────────────
  walkY: -1.5,
  skyY: 0.7,
  beachY: -1.2,
} as const;

export type JourneyPhase = "corridor" | "window" | "sky" | "descent" | "beach";

export function journeyPhaseAt(z: number): JourneyPhase {
  if (z > JOURNEY.launchTriggerZ) return "corridor";
  if (z > JOURNEY.windowExitZ) return "window";
  if (z > JOURNEY.descentStartZ) return "sky";
  if (z > JOURNEY.beachZ) return "descent";
  return "beach";
}

/** Classic smoothstep, clamped. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
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
  const up = smoothstep(0, 1, (JOURNEY.launchTriggerZ - z) / (JOURNEY.launchTriggerZ - JOURNEY.windowExitZ));
  // Descent → beach: skyY → beachY
  const down = smoothstep(0, 1, (JOURNEY.descentStartZ - z) / (JOURNEY.descentStartZ - JOURNEY.beachZ));

  const cruise = JOURNEY.walkY + (JOURNEY.skyY - JOURNEY.walkY) * up;
  return cruise + (JOURNEY.beachY - JOURNEY.skyY) * down;
}

/** 0 → 1 while the camera slides from the launch trigger out through the window. */
export function windowProgressAt(z: number): number {
  return smoothstep(0, 1, (JOURNEY.launchTriggerZ - z) / (JOURNEY.launchTriggerZ - JOURNEY.windowExitZ));
}

/** 0 → 1 while the camera descends toward the beach. */
export function descentProgressAt(z: number): number {
  return smoothstep(0, 1, (JOURNEY.descentStartZ - z) / (JOURNEY.descentStartZ - JOURNEY.beachZ));
}

// ── Corridor layout anchors (shared by CorridorScene + PaperAirplaneActor) ──
export const CORRIDOR = {
  /** Corridor geometry begins at the doorway so the visible floor reaches the threshold. */
  startZ: -15.95,
  halfWidth: JOURNEY.corridorHalfWidth,
  floorY: JOURNEY.corridorFloorY,
  ceilY: JOURNEY.corridorCeilY,
  endWallZ: JOURNEY.corridorEndWallZ,

  /** The welcoming avatar, standing left of the walk line near the entrance. */
  avatar: { x: -1.35, z: -27.5 },

  /** Window in the end wall — the wall has a real hole here so the camera can fly through. */
  window: { x: 0, y: -0.35, z: -65.9, width: 2.4, height: 2.5 },

  /** Table beside the window (billboard decal standing on the floor). */
  table: { x: 1.95, z: -63.8 },

  /** Where the paper airplane rests above the table, nose angled toward the window. */
  airplaneRest: [1.9, -1.12, -63.6] as [number, number, number],
  airplaneRestYaw: 0.55,
} as const;

// ── Beach layout anchors (shared by BeachContactSection + PaperAirplaneActor) ──
export const BEACH = {
  seaY: -3.55,
  seaZ: -188,

  /** The wooden boardwalk the camera arrives over. */
  boardwalk: { x: 0.35, topY: -2.35, startZ: -172, endZ: -192, width: 2.7 },

  /** Where the paper airplane touches down on the boardwalk. */
  landing: [0.35, -2.08, -186.0] as [number, number, number],

  /** Floating crates on the sea, one per contact action. */
  crates: [
    { key: "message" as const, label: "message", x: -2.35, z: -184.5 },
    { key: "github" as const, label: "github", x: -3.15, z: -187.4 },
    { key: "linkedin" as const, label: "linkedin", x: 2.95, z: -186.2 },
  ],
  crateY: -3.0,

  /** Distant hand-drawn mountains on the horizon behind the sea. */
  mountainZ: -206,
} as const;

/** The airplane's camera-locked offset during the sky flight (from the old debug defaults). */
export const AIRPLANE_CAMERA_OFFSET = { x: 0, y: -0.46, z: -2.85 } as const;
