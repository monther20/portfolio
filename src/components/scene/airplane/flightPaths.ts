import * as THREE from "three";

import { BEACH, CORRIDOR } from "../journeyConfig";

/**
 * flightPaths — the airplane's scripted routes. Each returns a fresh curve so
 * a path can start from wherever the plane currently is.
 */

/** Off the corridor table, through the window, out into the sky. */
export function createLaunchCurve(from: THREE.Vector3): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    from.clone(),
    from.clone().add(new THREE.Vector3(0, 0.55, -0.6)),
    new THREE.Vector3(CORRIDOR.window.x, CORRIDOR.window.y, CORRIDOR.window.z),
    new THREE.Vector3(0, 0.2, CORRIDOR.window.z - 4.5),
  ]);
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
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(...BEACH.landing),
    new THREE.Vector3(-1.5, -0.6, -191),
    new THREE.Vector3(1.5, 1.8, -198),
    new THREE.Vector3(4, 4, -206),
  ]);
}

/** Swooping back in to land again after the send-off. */
export function createReturnCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.5, 2.2, -178),
    new THREE.Vector3(2.2, 0.2, -181.5),
    new THREE.Vector3(...BEACH.landing),
  ]);
}
