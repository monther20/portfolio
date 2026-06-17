"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useLoader } from "@react-three/fiber";

export default function AnimatedDoor({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const doorRef = useRef<THREE.Group>(null);
  const doorTexture = useLoader(THREE.TextureLoader, "/textures/door.png");
  const frameTexture = useLoader(
    THREE.TextureLoader,
    "/textures/door_frame.png",
  );

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
    <group position={[0, -1.285, -15.9]}>
      {/* Outer Door Frame (Single Plane with Transparent Center) */}
      {/* <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0.2]}>
          <planeGeometry args={[5.79, 9.43]} />
          <meshStandardMaterial
            map={frameTexture}
            bumpMap={frameTexture}
            bumpScale={0.02}
            roughness={1}
            metalness={0}
            color="#fff"
            emissive="#53646b"
            emissiveMap={frameTexture}
            emissiveIntensity={0.05}
            transparent={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group> */}

      {/* Animated Swinging Door */}
      <group
        ref={doorRef}
        position={[-2.555, -0.22, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <group position={[2.555, 0, 0]}>
          <mesh position={[0, 0, 0.1]}>
            <boxGeometry args={[5.11, 8.99, 0.2]} />
            <meshStandardMaterial
              map={doorTexture}
              bumpMap={doorTexture}
              bumpScale={0.02}
              roughness={1}
              metalness={0}
              color="#ffffff"
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
