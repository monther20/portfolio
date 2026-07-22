import * as THREE from "three";

import { BEACH, CORRIDOR } from "../journeyConfig";

/**
 * flightPaths — the airplane's scripted routes. Each returns a fresh curve so
 * a path can start from wherever the plane currently is.
 */

/** Off the corridor table, through the window, out into the sky. */
export function createLaunchCurve(from: THREE.Vector3): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      from.clone(),
      // A small lift off the table before committing to the window.
      from.clone().add(new THREE.Vector3(0.12, 0.25, -0.35)),
      new THREE.Vector3(1.35, -0.88, CORRIDOR.window.z + 1.65),
      new THREE.Vector3(0.62, -0.58, CORRIDOR.window.z + 0.75),
      // Pass through the real opening, then climb into the sky.
      new THREE.Vector3(CORRIDOR.window.x, CORRIDOR.window.y - 0.04, CORRIDOR.window.z - 0.25),
      new THREE.Vector3(-0.18, 0.05, CORRIDOR.window.z - 3.25),
      new THREE.Vector3(0, 0.34, CORRIDOR.window.z - 6.4),
    ],
    false,
    "centripetal",
  );
}

/** A gentle glide down onto the boardwalk. */
export function createLandingCurve(from: THREE.Vector3): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    from.clone(),
    new THREE.Vector3(BEACH.landing[0] - 1.2, BEACH.landing[1] + 1.4, BEACH.landing[2] + 5),
    new THREE.Vector3(...BEACH.landing),
  ]);
}

/** Climbing away over the sea, carrying the visitor's message. */
export function createSendoffCurve(): THREE.CatmullRomCurve3 {
  const landingZ = BEACH.landing[2];

  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(...BEACH.landing),
    new THREE.Vector3(-1.5, -0.6, landingZ - 5),
    new THREE.Vector3(1.5, 1.8, landingZ - 12),
    new THREE.Vector3(4, 4, landingZ - 20),
  ]);
}

/** Swooping back in to land again after the send-off. */
export function createReturnCurve(): THREE.CatmullRomCurve3 {
  const landingZ = BEACH.landing[2];

  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.5, 2.2, landingZ + 8),
    new THREE.Vector3(2.2, 0.2, landingZ + 4.5),
    new THREE.Vector3(...BEACH.landing),
  ]);
}
