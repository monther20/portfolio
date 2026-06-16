"use client";

import React from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

export default function InteriorDetails() {
  const wallTexture = useLoader(THREE.TextureLoader, "/textures/walls.png");
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(5, 4); // Increased repetition for a denser texture

  return (
    <>
      {/* The Interior Hallway */}
      <mesh position={[0, 0, -4.075]}>
        <boxGeometry args={[16, 12, 24.15]} />
        <meshStandardMaterial attach="material-0" map={wallTexture} bumpMap={wallTexture} bumpScale={0.02} roughness={1} metalness={0} color="#ffffff" side={THREE.BackSide} /> {/* Right */}
        <meshStandardMaterial attach="material-1" map={wallTexture} bumpMap={wallTexture} bumpScale={0.02} roughness={1} metalness={0} color="#ffffff" side={THREE.BackSide} /> {/* Left */}
        <meshStandardMaterial
          attach="material-2"
          color="#0a0a0a"
          side={THREE.BackSide}
        />{" "}
        {/* Ceiling */}
        <meshStandardMaterial
          attach="material-3"
          color="#111111"
          side={THREE.BackSide}
        />{" "}
        {/* Floor */}
        <meshStandardMaterial attach="material-4" map={wallTexture} bumpMap={wallTexture} bumpScale={0.02} roughness={1} metalness={0} color="#ffffff" side={THREE.BackSide} /> {/* Back */}
        <meshStandardMaterial attach="material-5" visible={false} /> {/* Front (Door Hole) */}
      </mesh>

      {/* Floor Grates */}
      <mesh position={[-2.5, -5.98, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <mesh position={[2.5, -5.98, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial color="#050505" />
      </mesh>

      {/* Interior Lighting & Fixture */}
      <group position={[0, 2.5, -15]}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[1.2, 0.8, 16]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <pointLight
          position={[0, -0.5, 0]}
          intensity={250}
          distance={25}
          decay={2}
          color="#ffffff"
        />
      </group>
    </>
  );
}
