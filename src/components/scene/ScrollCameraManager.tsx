"use client";

import React, { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

export default function ScrollCameraManager({ isOpen }: { isOpen: boolean }) {
  const { camera } = useThree();
  const scrollTargetZ = useRef(8);

  // Auto-move camera through the door when it opens or closes
  useEffect(() => {
    if (isOpen) {
      scrollTargetZ.current = -20;
      gsap.to(camera.position, {
        z: -20,
        duration: 2.5,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    } else {
      scrollTargetZ.current = 8;
      gsap.to(camera.position, {
        z: 8,
        duration: 1.5,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    }
  }, [isOpen, camera]);

  // Handle scrolling ONLY once outside
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isOpen) return;

      scrollTargetZ.current -= e.deltaY * 0.05;
      scrollTargetZ.current = Math.max(-90, Math.min(-20, scrollTargetZ.current));

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

  return null;
}
