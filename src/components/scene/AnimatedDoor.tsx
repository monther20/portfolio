"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";

export default function AnimatedDoor({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const doorRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (doorRef.current) {
      gsap.to(doorRef.current.rotation, {
        y: isOpen ? Math.PI / 2 : 0,
        duration: 1.2,
        ease: "power2.inOut",
      });
    }
  }, [isOpen]);

  return (
    <group position={[0, -2.5, -15.9]}>
      {/* Outer Door Frame */}
      <group position={[0, 0, 0]}>
        <mesh position={[-2, 0, 0]}>
          <boxGeometry args={[0.5, 7, 0.5]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[2, 0, 0]}>
          <boxGeometry args={[0.5, 7, 0.5]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 3.25, 0]}>
          <boxGeometry args={[3.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </group>

      {/* Animated Swinging Door */}
      <group
        ref={doorRef}
        position={[-1.75, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <group position={[1.75, 0, 0]}>
          <mesh position={[0, 0, 0.1]}>
            <boxGeometry args={[3.5, 6.5, 0.6]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
