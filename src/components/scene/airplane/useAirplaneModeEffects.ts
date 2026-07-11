"use client";

import { type MutableRefObject, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";

import { JOURNEY } from "../journeyConfig";
import { setJourneyState, type AirplaneMode } from "../journeyState";
import { AIRPLANE_LOOK } from "./airplaneGeometry";
import {
  createLandingCurve,
  createLaunchCurve,
  createReturnCurve,
  createSendoffCurve,
} from "./flightPaths";

/**
 * The scripted route the frame loop is currently following. gsap only
 * advances `t`; PaperAirplaneActor applies it to the group every frame so
 * there is a single writer for the airplane transform.
 */
export type ModeAnim = {
  curve: THREE.CatmullRomCurve3 | null;
  t: number;
  kind: "launch" | "landing" | "sendoffOut" | "sendoffReturn" | null;
  /** Orientation at the moment a curve starts, used to ease into tangent-following. */
  startQuaternion: THREE.Quaternion;
};

type Refs = {
  airplaneMode: AirplaneMode;
  camera: THREE.Camera;
  rootRef: MutableRefObject<THREE.Group | null>;
  planeRef: MutableRefObject<THREE.Group | null>;
  letterRef: MutableRefObject<THREE.Group | null>;
  modeAnim: ModeAnim;
  relock: { from: THREE.Vector3; t: number };
  sendRequested: MutableRefObject<boolean>;
};

/**
 * useAirplaneModeEffects — every one-shot gsap transition of the airplane's
 * state machine (launch, landing, contact-letter cinematic, send-off).
 */
export function useAirplaneModeEffects({
  airplaneMode,
  camera,
  rootRef,
  planeRef,
  letterRef,
  modeAnim,
  relock,
  sendRequested,
}: Refs) {
  useEffect(() => {
    const root = rootRef.current;
    const plane = planeRef.current;
    const letter = letterRef.current;
    if (!root || !plane || !letter) return;

    const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];
    const track = <T extends gsap.core.Tween | gsap.core.Timeline>(tween: T): T => {
      tweens.push(tween);
      return tween;
    };

    /** Ease the camera back to the scroll path and hand control back. */
    const releaseToBeach = () => {
      track(gsap.to(camera.position, { x: 0.35, y: JOURNEY.beachY, duration: 1, ease: "power2.inOut" }));
      track(
        gsap.to(camera.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          ease: "power2.inOut",
          onComplete: () =>
            setJourneyState({ airplaneMode: "landed", cameraLocked: false, contactOpen: false }),
        }),
      );
    };

    switch (airplaneMode) {
      case "launching": {
        // Scroll owns launch progress. The frame loop updates modeAnim.t from
        // camera z, so stopping the scroll freezes the airplane in place.
        modeAnim.startQuaternion.copy(root.quaternion);
        modeAnim.curve = createLaunchCurve(root.position);
        modeAnim.kind = "launch";
        modeAnim.t = 0;
        break;
      }

      case "locked": {
        // Blend in from wherever the plane was (launch end, or re-lock from the boardwalk).
        relock.from.copy(root.position);
        relock.t = 0;
        break;
      }

      case "landing": {
        modeAnim.startQuaternion.copy(root.quaternion);
        modeAnim.curve = createLandingCurve(root.position.clone());
        modeAnim.kind = "landing";
        modeAnim.t = 0;
        track(
          gsap.to(modeAnim, {
            t: 1,
            duration: 2.4,
            ease: "power1.inOut",
            onComplete: () => setJourneyState({ airplaneMode: "landed" }),
          }),
        );
        break;
      }

      case "unfolding": {
        // The cinematic owns the camera (cameraLocked was set by the crate click).
        track(gsap.to(camera.position, { x: 0.35, y: -0.85, z: -183.3, duration: 1.4, ease: "power2.inOut" }));
        track(gsap.to(camera.rotation, { x: -0.52, y: 0, z: 0, duration: 1.4, ease: "power2.inOut" }));
        track(gsap.to(root.rotation, { x: 0, y: 0.15, z: 0, duration: 1, ease: "power2.inOut" }));

        letter.visible = true;
        letter.scale.set(0.05, 0.05, 1);
        const unfold = track(
          gsap.timeline({
            onComplete: () => {
              plane.visible = false;
              setJourneyState({ airplaneMode: "unfolded" });
            },
          }),
        );
        // Flatten the origami plane, then open the letter in two folds.
        unfold.to(plane.scale, { x: 0.4, y: 0.02, z: 0.4, duration: 0.7, ease: "power2.inOut" }, 0.4);
        unfold.to(letter.scale, { x: 1, duration: 0.45, ease: "power2.out" }, 0.9);
        unfold.to(letter.scale, { y: 1, duration: 0.5, ease: "power2.out" }, 1.25);
        break;
      }

      case "folding": {
        plane.visible = true;
        const fold = track(
          gsap.timeline({
            onComplete: () => {
              letter.visible = false;
              if (sendRequested.current) {
                setJourneyState({ airplaneMode: "sendoff" });
              } else {
                releaseToBeach();
              }
            },
          }),
        );
        fold.to(letter.scale, { y: 0.05, duration: 0.4, ease: "power2.in" });
        fold.to(letter.scale, { x: 0.05, duration: 0.35, ease: "power2.in" });
        fold.to(plane.scale, {
          x: AIRPLANE_LOOK.scale,
          y: AIRPLANE_LOOK.scale,
          z: AIRPLANE_LOOK.scale,
          duration: 0.5,
          ease: "back.out(2)",
        });
        break;
      }

      case "sendoff": {
        const sendoff = track(
          gsap.timeline({
            onComplete: () => {
              sendRequested.current = false;
              releaseToBeach();
            },
          }),
        );
        // Climb away over the sea while the camera watches it go…
        sendoff.call(() => {
          modeAnim.startQuaternion.copy(root.quaternion);
          modeAnim.curve = createSendoffCurve();
          modeAnim.kind = "sendoffOut";
          modeAnim.t = 0;
        });
        sendoff.to(modeAnim, { t: 1, duration: 3.2, ease: "power1.in" });
        sendoff.to(camera.rotation, { x: -0.05, duration: 2.2, ease: "power2.inOut" }, 0.4);
        // …then swoop back in and land, ready for the next message.
        sendoff.call(() => {
          modeAnim.startQuaternion.copy(root.quaternion);
          modeAnim.curve = createReturnCurve();
          modeAnim.kind = "sendoffReturn";
          modeAnim.t = 0;
        });
        sendoff.to(modeAnim, { t: 1, duration: 2.2, ease: "power1.out" });
        break;
      }
    }

    return () => {
      tweens.forEach((tween) => tween.kill());
    };
    // Refs and scratch objects are stable; only the mode drives transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airplaneMode]);
}
