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
import { corridor } from "@/data/portfolio";

const SCROLL_SPEED = 0.0028;
const FRICTION = 0.92;
const MIN_VELOCITY = 0.00015;
const MAX_WHEEL_DELTA = 100;
const MAX_SCROLL_VELOCITY = 0.38;
const MAX_FRAME_SCALE = 2;
const CHUNK_LENGTH = 40;
const MOUSE_POSITION_X = 0.12;
const MOUSE_POSITION_Y = 0.06;
const MOUSE_YAW = 0.018;
const MOUSE_PITCH = 0.012;

export default function ScrollCameraManager({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();

  const flightVelocity = useRef(0);
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
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      const journey = getJourneyState();
      if (journey.cameraLocked || journey.contactOpen) return;

      const deltaMultiplier =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const wheelDelta = THREE.MathUtils.clamp(
        e.deltaY * deltaMultiplier,
        -MAX_WHEEL_DELTA,
        MAX_WHEEL_DELTA,
      );

      flightVelocity.current = THREE.MathUtils.clamp(
        flightVelocity.current + wheelDelta * SCROLL_SPEED,
        -MAX_SCROLL_VELOCITY,
        MAX_SCROLL_VELOCITY,
      );
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [enabled, camera]);

  useFrame((state, delta) => {
    if (!enabled) return;

    const journey = getJourneyState();
    if (journey.cameraLocked || journey.contactOpen) {
      flightVelocity.current = 0;
      return;
    }

    const frameScale = Math.min(delta * 60, MAX_FRAME_SCALE);

    const nearBound = JOURNEY.corridorStart;
    const prevZ = camera.position.z;
    flightVelocity.current = THREE.MathUtils.clamp(
      flightVelocity.current,
      -MAX_SCROLL_VELOCITY,
      MAX_SCROLL_VELOCITY,
    );
    const proposedZ = prevZ - flightVelocity.current * frameScale;
    const nextZ = THREE.MathUtils.clamp(proposedZ, JOURNEY.farBound, nearBound);

    if (journey.windowLaunched && nextZ > JOURNEY.corridorReturnResetZ) {
      setJourneyState({ windowLaunched: false, airplaneMode: "resting" });
    }

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
    const bob =
      phase === "corridor"
        ? Math.sin(t * 2.1) * 0.015
        : Math.sin(t * 1.7) * 0.025;
    const targetY = cameraYAt(nextZ) + bob + mouseY * MOUSE_POSITION_Y;
    const targetX = mouseX * MOUSE_POSITION_X;
    const positionLerp = 1 - Math.pow(0.02, delta);
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetY,
      positionLerp,
    );
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      targetX,
      positionLerp * 0.6,
    );

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
        corridorRollTarget =
          focus.side * CORRIDOR_INFO_STATIONS.focusRoll * influence;
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
        corridorPitchTarget =
          CORRIDOR_INFO_STATIONS.windowFocusPitch * windowInfluence;
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
      const fade = easeIn * (1 - descent);

      bankTarget =
        (Math.sin(chunkProgress * Math.PI * 2) * 0.08 +
          Math.sin(chunkProgress * Math.PI * 5 + 0.8) * 0.025) *
        fade;
      pitchTarget =
        (Math.sin(chunkProgress * Math.PI * 4) * 0.032 +
          Math.cos(chunkProgress * Math.PI * 3) * 0.012) *
        fade;
    }

    const windowProgress = windowProgressAt(nextZ);
    pitchTarget += Math.sin(Math.PI * windowProgress) * 0.07;
    pitchTarget += Math.sin(Math.PI * descent) * -0.15;

    yawTarget -= mouseX * MOUSE_YAW;
    pitchTarget += mouseY * MOUSE_PITCH;

    const rotationLerp = 1 - Math.pow(0.03, delta);
    camera.rotation.x = THREE.MathUtils.lerp(
      camera.rotation.x,
      pitchTarget,
      rotationLerp,
    );
    camera.rotation.z = THREE.MathUtils.lerp(
      camera.rotation.z,
      bankTarget,
      rotationLerp,
    );
    camera.rotation.y = THREE.MathUtils.lerp(
      camera.rotation.y,
      yawTarget,
      rotationLerp * (phase === "corridor" ? 0.9 : 0.5),
    );
  });

  return null;
}
