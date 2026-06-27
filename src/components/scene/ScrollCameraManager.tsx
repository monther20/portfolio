"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { playFootstep } from "./walkAudio";

// Journey walk feel
const BASE_Y = -1.5; // eye height inside the journey
const BOB_AMP = 0.07; // how much the head bobs up/down per step
const STEP_LENGTH = 1.5; // world units travelled per footstep
const MOVE_EPS = 0.004; // below this per-frame z change we consider "stopped"
const JOURNEY_NEAR = -19; // can't reverse back into the door/wall
const JOURNEY_FAR = -158; // stop just past the Contact section

export default function ScrollCameraManager({ isOpen }: { isOpen: boolean }) {
  const { camera } = useThree();
  const scrollTargetZ = useRef<number | null>(null);

  // Walk-cycle state
  const prevZ = useRef(camera.position.z);
  const walkPhase = useRef(0);
  const bob = useRef(0);
  const lastStep = useRef(0);

  // Handle scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (scrollTargetZ.current === null) {
        scrollTargetZ.current = camera.position.z;
      }

      const delta = e.deltaY * 0.05;

      if (isOpen) {
        // Inside the journey: scroll forward (-z), bounded.
        scrollTargetZ.current -= delta;
        scrollTargetZ.current = Math.max(JOURNEY_FAR, Math.min(JOURNEY_NEAR, scrollTargetZ.current));
      } else {
        // Outside the room: bounded scroll between z=8 (start) and z=30 (far back).
        scrollTargetZ.current -= delta;
        scrollTargetZ.current = Math.max(8, Math.min(30, scrollTargetZ.current));
      }

      gsap.to(camera.position, {
        z: scrollTargetZ.current,
        duration: 0.8,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isOpen, camera]);

  useFrame(() => {
    if (!isOpen) return;

    // Gently settle the yaw back to straight-ahead.
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, 0.02);

    // Detect forward/back motion this frame.
    const z = camera.position.z;
    const dz = z - prevZ.current;
    prevZ.current = z;
    const moving = Math.abs(dz) > MOVE_EPS;

    // Advance the walk cycle by distance travelled; trigger a footstep each step.
    if (moving) {
      walkPhase.current += Math.abs(dz) * (Math.PI / STEP_LENGTH);
      const stepIdx = Math.floor(walkPhase.current / Math.PI);
      if (stepIdx !== lastStep.current) {
        lastStep.current = stepIdx;
        playFootstep();
      }
    }

    // Head bob (eases back to level when stopped).
    const targetBob = moving ? Math.sin(walkPhase.current) * BOB_AMP : 0;
    bob.current = THREE.MathUtils.lerp(bob.current, targetBob, 0.18);
    camera.position.y = BASE_Y + bob.current;

    // Subtle walk roll for life.
    const targetRoll = moving ? Math.sin(walkPhase.current * 0.5) * 0.006 : 0;
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetRoll, 0.1);
  });

  return null;
}
