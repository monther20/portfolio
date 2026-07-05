"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import gsap from "gsap";

// Corridor / journey bounds
const BASE_Y = -1.5;
const JOURNEY_NEAR = -19; // can't reverse back into the door/wall
const JOURNEY_FAR = -158; // stop just past the Contact section

// Flight feel, inspired by ITom's About-room momentum controller.
const FLIGHT_SPEED = 0.0028;
const FRICTION = 0.92;
const MIN_VELOCITY = 0.00015;
const CHUNK_LENGTH = 40;

export default function ScrollCameraManager({ isOpen }: { isOpen: boolean }) {
  const { camera } = useThree();

  // Outside the door we keep the old direct target scroll.
  const roomTargetZ = useRef<number | null>(null);

  // Inside the journey we use momentum so the paper-airplane flight feels less mechanical.
  const flightVelocity = useRef(0);
  const flightDistance = useRef(0);
  const flightActive = useRef(false);
  const baseRotation = useRef({ x: 0, y: 0, z: 0 });
  const currentBank = useRef(0);
  const currentPitch = useRef(0);

  useEffect(() => {
    if (isOpen) {
      flightVelocity.current = 0;
      flightDistance.current = Math.max(0, Math.abs(camera.position.z - JOURNEY_NEAR));
      flightActive.current = false;
      baseRotation.current = { x: 0, y: 0, z: 0 };
      currentBank.current = 0;
      currentPitch.current = 0;
    }
  }, [isOpen, camera]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isOpen) {
        // Scroll down -> fly forward (-z). Scroll up -> float back.
        flightVelocity.current += e.deltaY * FLIGHT_SPEED;
        return;
      }

      if (roomTargetZ.current === null) {
        roomTargetZ.current = camera.position.z;
      }

      const delta = e.deltaY * 0.05;
      roomTargetZ.current -= delta;
      roomTargetZ.current = Math.max(8, Math.min(30, roomTargetZ.current));

      gsap.to(camera.position, {
        z: roomTargetZ.current,
        duration: 0.8,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isOpen, camera]);

  useFrame((state, delta) => {
    if (!isOpen) return;

    const frameScale = delta * 60;

    // Momentum: velocity moves the camera, then decays.
    const proposedZ = camera.position.z - flightVelocity.current * frameScale;
    const nextZ = THREE.MathUtils.clamp(proposedZ, JOURNEY_FAR, JOURNEY_NEAR);

    // Stop pushing into the bounds.
    if (nextZ === JOURNEY_FAR || nextZ === JOURNEY_NEAR) {
      flightVelocity.current *= 0.35;
    }

    camera.position.z = nextZ;
    camera.position.y = BASE_Y + Math.sin(state.clock.elapsedTime * 1.7) * 0.025;

    flightDistance.current = Math.max(0, JOURNEY_NEAR - camera.position.z);

    flightVelocity.current *= Math.pow(FRICTION, frameScale);
    if (Math.abs(flightVelocity.current) < MIN_VELOCITY) {
      flightVelocity.current = 0;
    }

    if (!flightActive.current && flightDistance.current > 0.5) {
      flightActive.current = true;
      baseRotation.current = { x: 0, y: 0, z: 0 };
    }

    if (flightActive.current) {
      const chunkProgress = (flightDistance.current % CHUNK_LENGTH) / CHUNK_LENGTH;
      const easeIn = Math.min(1, flightDistance.current / 8);

      // Do not bank from scroll direction. Use a looping flight path instead, like ITom's
      // About scene, so forward/backward scrolling still produces varied left/right motion.
      const bankAngle =
        (Math.sin(chunkProgress * Math.PI * 2) * 0.08 +
          Math.sin(chunkProgress * Math.PI * 5 + 0.8) * 0.025) *
        easeIn;
      const pitchAngle =
        (Math.sin(chunkProgress * Math.PI * 4) * 0.032 +
          Math.cos(chunkProgress * Math.PI * 3) * 0.012) *
        easeIn;
      const lerpSpeed = 1 - Math.pow(0.035, delta);

      currentBank.current = THREE.MathUtils.lerp(currentBank.current, bankAngle, lerpSpeed);
      currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, pitchAngle, lerpSpeed);
    } else {
      currentBank.current = THREE.MathUtils.lerp(currentBank.current, 0, 0.08);
      currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, 0, 0.08);
    }

    // Camera gets the subtle airplane-flight maneuver. The airplane itself follows the camera
    // and exaggerates the local bank in JourneyScene.tsx.
    camera.rotation.x = baseRotation.current.x + currentPitch.current;
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, 0.04);
    camera.rotation.z = baseRotation.current.z + currentBank.current;
  });

  return null;
}
