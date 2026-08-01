"use client";

import { type MutableRefObject, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";

import { BEACH, JOURNEY } from "../journeyConfig";
import { setJourneyState, type AirplaneMode } from "../journeyState";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import {
  createLandingCurve,
  createLaunchCurve,
  createReturnCurve,
  createSendoffCurve,
} from "./flightPaths";

/** Preserve the existing framing while viewing the contact paper face-on. */
const CONTACT_CAMERA_DISTANCE = 3.2;

/**
 * The scripted route the frame loop is currently following. Scroll position
 * advances launch/landing progress while gsap advances the contact send-off;
 * PaperAirplaneActor remains the single writer for the airplane transform.
 */
export type AirplaneFoldAnimationControls = {
  duration: number;
  /** 0 = Basis flat paper, 1 = fully folded through step 3. */
  setProgress: (progress: number) => void;
};

export type ModeAnim = {
  curve: THREE.CatmullRomCurve3 | null;
  t: number;
  kind: "launch" | "landing" | "sendoffOut" | "sendoffReturn" | null;
  /** Orientation at the moment a curve starts, used to ease into tangent-following. */
  startQuaternion: THREE.Quaternion;
  /** Retained so back-scrolling can reverse the exact same flight paths. */
  launchCurve: THREE.CatmullRomCurve3 | null;
  launchStartQuaternion: THREE.Quaternion;
  landingCurve: THREE.CatmullRomCurve3 | null;
  landingStartQuaternion: THREE.Quaternion;
  landingStartZ: number | null;
};

type Refs = {
  airplaneMode: AirplaneMode;
  camera: THREE.Camera;
  rootRef: MutableRefObject<THREE.Group | null>;
  planeRef: MutableRefObject<THREE.Group | null>;
  letterRef: MutableRefObject<THREE.Group | null>;
  foldAnimationRef: MutableRefObject<AirplaneFoldAnimationControls | null>;
  modeAnim: ModeAnim;
  sendRequested: MutableRefObject<boolean>;
};

/**
 * Prepares scroll-owned flight routes and runs the one-shot gsap transitions
 * for the contact-letter cinematic and send-off.
 */
export function useAirplaneModeEffects({
  airplaneMode,
  camera,
  rootRef,
  planeRef,
  letterRef,
  foldAnimationRef,
  modeAnim,
  sendRequested,
}: Refs) {
  const responsive = useResponsiveExperience();

  useEffect(() => {
    const root = rootRef.current;
    const plane = planeRef.current;
    const letter = letterRef.current;
    if (!root || !plane || !letter) return;

    const motionDurationScale = responsive.reducedMotion ? 0.01 : 1;
    const duration = (seconds: number) => seconds * motionDurationScale;
    const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];
    const track = <T extends gsap.core.Tween | gsap.core.Timeline>(tween: T): T => {
      tweens.push(tween);
      return tween;
    };

    /** Ease the camera back to the scroll path and hand control back. */
    const releaseToBeach = () => {
      track(
        gsap.to(camera.position, {
          x: BEACH.landing[0],
          y: JOURNEY.beachY,
          z: JOURNEY.farBound,
          duration: duration(1),
          ease: "power2.inOut",
        }),
      );
      track(
        gsap.to(camera.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: duration(1),
          ease: "power2.inOut",
          onComplete: () =>
            setJourneyState({
              airplaneMode: "landed",
              cameraLocked: false,
              contactOpen: false,
              interactionLocked: false,
            }),
        }),
      );
    };

    switch (airplaneMode) {
      case "resting": {
        // A complete return to the corridor starts a fresh reversible journey.
        modeAnim.curve = null;
        modeAnim.kind = null;
        modeAnim.launchCurve = null;
        modeAnim.landingCurve = null;
        modeAnim.landingStartZ = null;
        break;
      }

      case "launching": {
        // Scroll owns launch progress. Retaining the initial path lets the
        // airplane follow it backward when the visitor reverses direction.
        if (!modeAnim.launchCurve) {
          modeAnim.launchCurve = createLaunchCurve(root.position);
          modeAnim.launchStartQuaternion.copy(root.quaternion);
        }
        modeAnim.curve = modeAnim.launchCurve;
        modeAnim.startQuaternion.copy(modeAnim.launchStartQuaternion);
        modeAnim.kind = "launch";
        modeAnim.t = 0;
        break;
      }

      case "landing": {
        if (!modeAnim.landingCurve) {
          modeAnim.landingCurve = createLandingCurve(root.position.clone());
          modeAnim.landingStartQuaternion.copy(root.quaternion);
          // Start at the camera position that produced the curve's first pose,
          // avoiding a jump when momentum crosses the nominal trigger.
          modeAnim.landingStartZ = camera.position.z;
        }
        modeAnim.curve = modeAnim.landingCurve;
        modeAnim.startQuaternion.copy(modeAnim.landingStartQuaternion);
        modeAnim.kind = "landing";
        modeAnim.t = 0;
        break;
      }

      case "unfolding": {
        // Move directly above the horizontal paper so the camera meets its
        // surface at 90 degrees instead of viewing the form in perspective.
        track(
          gsap.to(camera.position, {
            x: BEACH.landing[0],
            y: BEACH.landing[1] + CONTACT_CAMERA_DISTANCE,
            z: BEACH.landing[2],
            duration: duration(1.4),
            ease: "power2.inOut",
          }),
        );
        track(
          gsap.to(camera.rotation, {
            x: -Math.PI / 2,
            y: 0,
            z: 0,
            duration: duration(1.4),
            ease: "power2.inOut",
          }),
        );
        track(
          gsap.to(root.rotation, {
            x: 0,
            y: 0.15,
            z: 0,
            duration: duration(1),
            ease: "power2.inOut",
          }),
        );

        const foldProgress = { value: 1 };
        foldAnimationRef.current?.setProgress(foldProgress.value);
        plane.visible = true;
        letter.visible = true;
        letter.scale.set(0.05, 0.05, 1);
        const unfold = track(
          gsap.timeline({
            onComplete: () => {
              foldAnimationRef.current?.setProgress(0);
              plane.visible = true;
              setJourneyState({ airplaneMode: "unfolded" });
            },
          }),
        );
        // Run the GLB shape-key fold sequence backward, then reveal the contact form.
        unfold.to(
          foldProgress,
          {
            value: 0,
            duration: duration(foldAnimationRef.current?.duration ?? 0.9),
            ease: "power2.inOut",
            onUpdate: () =>
              foldAnimationRef.current?.setProgress(foldProgress.value),
          },
          duration(0.35),
        );
        unfold.to(
          letter.scale,
          { x: 1, duration: duration(0.45), ease: "power2.out" },
          duration(0.95),
        );
        unfold.to(
          letter.scale,
          { y: 1, duration: duration(0.5), ease: "power2.out" },
          duration(1.25),
        );
        break;
      }

      case "folding": {
        plane.visible = true;
        const foldProgress = { value: 0 };
        foldAnimationRef.current?.setProgress(foldProgress.value);
        const fold = track(
          gsap.timeline({
            onComplete: () => {
              foldAnimationRef.current?.setProgress(1);
              letter.visible = false;
              if (sendRequested.current) {
                setJourneyState({ airplaneMode: "sendoff" });
              } else {
                releaseToBeach();
              }
            },
          }),
        );
        fold.to(letter.scale, {
          y: 0.05,
          duration: duration(0.4),
          ease: "power2.in",
        });
        fold.to(letter.scale, {
          x: 0.05,
          duration: duration(0.35),
          ease: "power2.in",
        });
        fold.to(
          foldProgress,
          {
            value: 1,
            duration: duration(foldAnimationRef.current?.duration ?? 0.9),
            ease: "power2.inOut",
            onUpdate: () =>
              foldAnimationRef.current?.setProgress(foldProgress.value),
          },
          duration(0.2),
        );
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
        sendoff.to(modeAnim, {
          t: 1,
          duration: duration(3.2),
          ease: "power1.in",
        });
        sendoff.to(
          camera.rotation,
          { x: -0.05, duration: duration(2.2), ease: "power2.inOut" },
          duration(0.4),
        );
        // …then swoop back in and land, ready for the next message.
        sendoff.call(() => {
          modeAnim.startQuaternion.copy(root.quaternion);
          modeAnim.curve = createReturnCurve();
          modeAnim.kind = "sendoffReturn";
          modeAnim.t = 0;
        });
        sendoff.to(modeAnim, {
          t: 1,
          duration: duration(2.2),
          ease: "power1.out",
        });
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
