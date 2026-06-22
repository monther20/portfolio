"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useLoader } from "@react-three/fiber";

export default function AnimatedDoor({
  isOpen,
  isNight,
  onClick,
}: {
  isOpen: boolean;
  isNight: boolean;
  onClick?: () => void;
}) {
  const doorRef = useRef<THREE.Group>(null);
  const doorMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const doorClosedTexture = useLoader(THREE.TextureLoader, "/textures/door.png");
  const doorOpenTexture = useLoader(THREE.TextureLoader, "/textures/door_handle_open.png");
  const frameTexture = useLoader(THREE.TextureLoader, "/textures/door_frame.png");

  useEffect(() => {
    if (doorMaterialRef.current) {
      doorMaterialRef.current.map = isOpen ? doorOpenTexture : doorClosedTexture;
      doorMaterialRef.current.needsUpdate = true;
    }
  }, [isOpen, doorClosedTexture, doorOpenTexture]);

  useEffect(() => {
    if (doorRef.current) {
      gsap.to(doorRef.current.rotation, {
        y: isOpen ? Math.PI / 2 : 0,
        duration: 1.2,
        ease: "power2.inOut",
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const targetColor = new THREE.Color(isNight ? "#888899" : "#ffffff");
    if (doorMaterialRef.current) {
      gsap.to(doorMaterialRef.current.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
    if (frameMaterialRef.current) {
      gsap.to(frameMaterialRef.current.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight]);

  return (
    <group position={[0, -1.285, -15.9]}>
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0.2]}>
          <planeGeometry args={[7, 10.05]} />
          <meshBasicMaterial
            ref={frameMaterialRef}
            map={frameTexture}
            transparent={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <group
        ref={doorRef}
        position={[-2.555, -0.22, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <group position={[2.555, 0, 0]}>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[4.9, 8.8, 0.2]} />
            <meshBasicMaterial
              ref={doorMaterialRef}
              map={doorClosedTexture}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

