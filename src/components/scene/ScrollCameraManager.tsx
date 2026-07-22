"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  JOURNEY,
  CORRIDOR_INFO_STATIONS,
  cameraYAt,
  corridorStationInfluenceAt,
  descentProgressAt,
  journeyPhaseAt,
  windowProgressAt,
} from "./journeyConfig";
import { getJourneyState, setJourneyState } from "./journeyState";
import { playFootstep } from "./walkAudio";
import { corridor } from "@/data/portfolio";

// Flight feel, inspired by ITom's About-room momentum controller.
const FLIGHT_SPEED = 0.0028;
/** Walking through the corridor is slower than flying. */
const WALK_SPEED_FACTOR = 0.55;
const FRICTION = 0.92;
const MIN_VELOCITY = 0.00015;
const CHUNK_LENGTH = 40;
/** Subtle cursor-follow parallax; pointer values are normalized from -1 to 1. */
const MOUSE_POSITION_X = 0.12;
const MOUSE_POSITION_Y = 0.06;
const MOUSE_YAW = 0.018;
const MOUSE_PITCH = 0.012;
/** World units of walking between footstep sounds. */
const STEP_DISTANCE = 1.4;

export default function ScrollCameraManager({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();

  // The scroll controller is only active after entering the journey/corridor.
  const flightVelocity = useRef(0);
  const stepAccumulator = useRef(0);
  const corridorFocuses = useMemo(
    () =>
      corridor.stations.map((station, index) => ({
        index,
        side: station.side,
      })),
    [],
  );

  useEffect(() => {
    flightVelocity.current = 0;
    stepAccumulator.current = 0;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      const journey = getJourneyState();
      // A gsap cinematic (window launch handoff, contact letter) owns the camera.
      if (journey.cameraLocked || journey.contactOpen) return;

      const walking = journeyPhaseAt(camera.position.z) === "corridor";
      flightVelocity.current += e.deltaY * FLIGHT_SPEED * (walking ? WALK_SPEED_FACTOR : 1);
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [enabled, camera]);

  useFrame((state, delta) => {
    if (!enabled) return;

    const journey = getJourneyState();
    if (journey.cameraLocked || journey.contactOpen) {
      // Bleed momentum while a cinematic owns the camera so it doesn't jump after.
      flightVelocity.current = 0;
      return;
    }

    const frameScale = delta * 60;

    // Momentum: velocity moves the camera, then decays. Back-scroll is allowed
    // all the way into the corridor even after flying out through the window.
    const nearBound = JOURNEY.corridorStart;
    const prevZ = camera.position.z;
    const proposedZ = prevZ - flightVelocity.current * frameScale;
    const nextZ = THREE.MathUtils.clamp(proposedZ, JOURNEY.farBound, nearBound);

    if (journey.windowLaunched && nextZ > JOURNEY.corridorReturnResetZ) {
      setJourneyState({ windowLaunched: false, airplaneMode: "resting" });
    }

    // Stop pushing into the bounds.
    if (nextZ === JOURNEY.farBound || nextZ === nearBound) {
      flightVelocity.current *= 0.35;
    }

    camera.position.z = nextZ;

    flightVelocity.current *= Math.pow(FRICTION, frameScale);
    if (Math.abs(flightVelocity.current) < MIN_VELOCITY) {
      flightVelocity.current = 0;
    }

    const phase = journeyPhaseAt(nextZ);
    const t = state.clock.elapsedTime;
    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;

    // ── Height + subtle mouse parallax around the journey's base camera path ──
    const bob = phase === "corridor"
      ? Math.sin(t * 2.1) * 0.015
      : Math.sin(t * 1.7) * 0.025;
    const targetY = cameraYAt(nextZ) + bob + mouseY * MOUSE_POSITION_Y;
    const targetX = mouseX * MOUSE_POSITION_X;
    const positionLerp = 1 - Math.pow(0.02, delta);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, positionLerp);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, positionLerp * 0.6);

    // ── Footsteps while walking the corridor ──
    if (phase === "corridor") {
      stepAccumulator.current += Math.abs(nextZ - prevZ);
      if (stepAccumulator.current >= STEP_DISTANCE) {
        stepAccumulator.current = 0;
        playFootstep(0.12);
      }
    }

    // ── Corridor reading focus: glance toward wall stations as you reach them ──
    let yawTarget = 0;
    let corridorPitchTarget = 0;
    let corridorRollTarget = 0;
    if (phase === "corridor") {
      let strongestInfluence = 0;

      for (const focus of corridorFocuses) {
        const influence = corridorStationInfluenceAt(focus.index, nextZ);
        if (influence <= strongestInfluence) continue;

        strongestInfluence = influence;
        yawTarget = -focus.side * CORRIDOR_INFO_STATIONS.focusYaw * influence;
        corridorPitchTarget = CORRIDOR_INFO_STATIONS.focusPitch * influence;
        corridorRollTarget = focus.side * CORRIDOR_INFO_STATIONS.focusRoll * influence;
      }

      const windowInfluence =
        1 -
        THREE.MathUtils.smoothstep(
          Math.abs(nextZ - CORRIDOR_INFO_STATIONS.windowFocusZ),
          0.5,
          CORRIDOR_INFO_STATIONS.windowFocusRadius,
        );
      if (windowInfluence > strongestInfluence) {
        yawTarget = CORRIDOR_INFO_STATIONS.windowFocusYaw * windowInfluence;
        corridorPitchTarget = CORRIDOR_INFO_STATIONS.windowFocusPitch * windowInfluence;
        corridorRollTarget = 0;
      }
    }

    // ── Flight maneuvers: banking only exists once we're out of the window ──
    const flightDistance = Math.max(0, JOURNEY.windowExitZ - nextZ);
    const descent = descentProgressAt(nextZ);
    let bankTarget = corridorRollTarget;
    let pitchTarget = corridorPitchTarget;

    if (flightDistance > 0) {
      const chunkProgress = (flightDistance % CHUNK_LENGTH) / CHUNK_LENGTH;
      const easeIn = Math.min(1, flightDistance / 8);
      // Level out again while gliding down to the beach.
      const fade = easeIn * (1 - descent);

      // A looping flight path (not tied to scroll direction), like ITom's About
      // scene, so forward/backward scrolling still produces varied motion.
      bankTarget =
        (Math.sin(chunkProgress * Math.PI * 2) * 0.08 +
          Math.sin(chunkProgress * Math.PI * 5 + 0.8) * 0.025) *
        fade;
      pitchTarget =
        (Math.sin(chunkProgress * Math.PI * 4) * 0.032 +
          Math.cos(chunkProgress * Math.PI * 3) * 0.012) *
        fade;
    }

    // Nose up a touch while rising through the window, down while descending.
    const windowProgress = windowProgressAt(nextZ);
    pitchTarget += Math.sin(Math.PI * windowProgress) * 0.07;
    pitchTarget += Math.sin(Math.PI * descent) * -0.15;

    // Follow the cursor slightly without overpowering station focus or flight motion.
    yawTarget -= mouseX * MOUSE_YAW;
    pitchTarget += mouseY * MOUSE_PITCH;

    // Lerp the actual camera rotation toward the targets. Approaching (instead
    // of assigning) keeps hand-offs from gsap cinematics snap-free.
    const rotationLerp = 1 - Math.pow(0.03, delta);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, pitchTarget, rotationLerp);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, bankTarget, rotationLerp);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, yawTarget, rotationLerp * (phase === "corridor" ? 0.9 : 0.5));
  });

  return null;
}
