"use client";

/**
 * journeyState.ts — a tiny module-level store shared by the scroll manager,
 * the corridor, the paper-airplane actor and the beach contact scene.
 *
 * Most consumers read it inside useFrame (no React re-render needed); React
 * components that must re-render subscribe through useJourneyState().
 */

import { useSyncExternalStore } from "react";

export type AirplaneMode =
  | "resting" // parked above the corridor table
  | "launching" // gsap flight from the table out through the window
  | "locked" // glued in front of the camera during the sky flight
  | "landing" // gliding down to the boardwalk
  | "landed" // parked on the boardwalk
  | "unfolding" // opening up into the contact letter
  | "unfolded" // flat letter with the form visible
  | "folding" // folding back after send
  | "sendoff"; // flying away with the message, then returning

export type JourneyStateShape = {
  /** True while the corridor window is open and the airplane has launched. */
  windowLaunched: boolean;
  airplaneMode: AirplaneMode;
  /** While true, a gsap cinematic owns the camera and wheel input is ignored. */
  cameraLocked: boolean;
  /** The contact letter is open (used to swallow wheel input + show the form). */
  contactOpen: boolean;
};

const state: JourneyStateShape = {
  windowLaunched: false,
  airplaneMode: "resting",
  cameraLocked: false,
  contactOpen: false,
};

const listeners = new Set<() => void>();

/** A stable snapshot object, recreated only when something changes. */
let snapshot: JourneyStateShape = { ...state };

export function getJourneyState(): JourneyStateShape {
  return snapshot;
}

export function setJourneyState(patch: Partial<JourneyStateShape>) {
  let changed = false;
  for (const key of Object.keys(patch) as (keyof JourneyStateShape)[]) {
    if (state[key] !== patch[key]) {
      (state as Record<string, unknown>)[key] = patch[key];
      changed = true;
    }
  }
  if (!changed) return;
  snapshot = { ...state };
  listeners.forEach((listener) => listener());
}

export function subscribeJourney(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook — re-renders the component whenever the journey state changes. */
export function useJourneyState(): JourneyStateShape {
  return useSyncExternalStore(subscribeJourney, getJourneyState, getJourneyState);
}
