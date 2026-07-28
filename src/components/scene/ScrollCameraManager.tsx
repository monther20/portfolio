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
import {
  reportJourneyInteraction,
  useResponsiveExperience,
} from "../ResponsiveExperience";

const SCROLL_SPEED = 0.0028;
const FRICTION = 0.92;
const MIN_VELOCITY = 0.00015;
const MAX_WHEEL_DELTA = 100;
const MAX_SCROLL_VELOCITY = 0.38;
const MAX_FRAME_SCALE = 2;
const TOUCH_DELTA_MULTIPLIER = 1.25;
const PHONE_TOUCH_DELTA_MULTIPLIER = 1.4;
const KEYBOARD_DELTA = 78;
const CHUNK_LENGTH = 40;
const MOUSE_POSITION_X = 0.12;
const MOUSE_POSITION_Y = 0.06;
const MOUSE_YAW = 0.018;
const MOUSE_PITCH = 0.012;

export default function ScrollCameraManager({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const responsive = useResponsiveExperience();

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

    let activePointer: number | null = null;
    let lastPointerY = 0;

    const applyInputDelta = (rawDelta: number) => {
      const journey = getJourneyState();
      if (
        journey.cameraLocked ||
        journey.contactOpen ||
        journey.interactionLocked
      ) {
        return;
      }

      const inputDelta = THREE.MathUtils.clamp(
        rawDelta,
        -MAX_WHEEL_DELTA,
        MAX_WHEEL_DELTA,
      );
      if (Math.abs(inputDelta) < 0.5) return;

      flightVelocity.current = THREE.MathUtils.clamp(
        flightVelocity.current + inputDelta * SCROLL_SPEED,
        -MAX_SCROLL_VELOCITY,
        MAX_SCROLL_VELOCITY,
      );
      reportJourneyInteraction();
    };

    const handleWheel = (event: WheelEvent) => {
      const deltaMultiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      applyInputDelta(event.deltaY * deltaMultiplier);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType !== "touch" && event.pointerType !== "pen")) {
        return;
      }
      activePointer = event.pointerId;
      lastPointerY = event.clientY;
      flightVelocity.current = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;

      const deltaY = lastPointerY - event.clientY;
      lastPointerY = event.clientY;
      if (Math.abs(deltaY) < 0.5) return;

      event.preventDefault();
      const touchMultiplier = responsive.isPhone
        ? PHONE_TOUCH_DELTA_MULTIPLIER
        : TOUCH_DELTA_MULTIPLIER;
      applyInputDelta(deltaY * touchMultiplier);
    };

    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId === activePointer) activePointer = null;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.matches("input, textarea, select, button, a")
      ) {
        return;
      }

      let direction = 0;
      if (event.key === "ArrowDown" || event.key === "PageDown") direction = 1;
      if (event.key === "ArrowUp" || event.key === "PageUp") direction = -1;
      if (event.key === " ") direction = event.shiftKey ? -1 : 1;
      if (!direction) return;

      event.preventDefault();
      applyInputDelta(direction * KEYBOARD_DELTA);
    };

    const canvas = gl.domElement;
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", releasePointer, { passive: true });
    window.addEventListener("pointercancel", releasePointer, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
    };
  }, [enabled, gl, responsive.isPhone]);

  useFrame((state, delta) => {
    if (!enabled) return;

    const journey = getJourneyState();
    if (
      journey.cameraLocked ||
      journey.contactOpen ||
      journey.interactionLocked
    ) {
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
    const mouseX = state.pointer.x * responsive.parallaxScale;
    const mouseY = state.pointer.y * responsive.parallaxScale;

    // ── Height + subtle mouse parallax around the journey's base camera path ──
    const bob =
      (phase === "corridor"
        ? Math.sin(t * 2.1) * 0.015
        : Math.sin(t * 1.7) * 0.025) * responsive.motionScale;
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
        yawTarget =
          -focus.side *
          CORRIDOR_INFO_STATIONS.focusYaw *
          responsive.corridorFocusScale *
          influence;
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
        yawTarget =
          CORRIDOR_INFO_STATIONS.windowFocusYaw *
          responsive.corridorFocusScale *
          windowInfluence;
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
        fade *
        responsive.motionScale;
      pitchTarget =
        (Math.sin(chunkProgress * Math.PI * 4) * 0.032 +
          Math.cos(chunkProgress * Math.PI * 3) * 0.012) *
        fade *
        responsive.motionScale;
    }

    const windowProgress = windowProgressAt(nextZ);
    pitchTarget +=
      Math.sin(Math.PI * windowProgress) * 0.07 * responsive.motionScale;
    pitchTarget +=
      Math.sin(Math.PI * descent) * -0.15 * responsive.motionScale;

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
