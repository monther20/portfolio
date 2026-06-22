"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import gsap from "gsap";

export default function ScrollCameraManager({ isOpen }: { isOpen: boolean }) {
  const { camera } = useThree();
  const scrollTargetZ = useRef<number | null>(null);

  // Handle scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Initialize the target Z to the camera's current Z the first time they scroll
      if (scrollTargetZ.current === null) {
        scrollTargetZ.current = camera.position.z;
      }

      // Base scroll speed
      let delta = e.deltaY * 0.05;

      // Inside the corridor (isOpen === true)
      if (isOpen) {
        scrollTargetZ.current -= delta;
        // Don't let them scroll backward through the door (which is at z = -15.9)
        scrollTargetZ.current = Math.min(-16, scrollTargetZ.current);
      } 
      // Outside the room (isOpen === false)
      else {
        scrollTargetZ.current -= delta;
        // Bound the outside scrolling between z=8 (start) and z=30 (far back)
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

  // Constantly gently pull the camera yaw back to 0. 
  // Individual doors will fight this to pull the camera towards them when near.
  useFrame(() => {
    if (isOpen) {
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, 0.02);
    }
  });

  return null;
}
