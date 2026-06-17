"use client";

import React from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import WaterPuddle from "./WaterPuddle";

export default function InteriorDetails() {
  const wallTexture = useLoader(THREE.TextureLoader, "/textures/walls.png");
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(3, 3); // Increased repetition for a denser texture
  wallTexture.anisotropy = 16;

  const floorTexture = useLoader(THREE.TextureLoader, "/textures/floor.png");
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(1, 1); // Tile the floor texture
  floorTexture.anisotropy = 16;

  const drainTexture = useLoader(THREE.TextureLoader, "/textures/Water_drain.png");
  drainTexture.anisotropy = 16;

  return (
    <>
      {/* The Interior Hallway */}
      <mesh position={[0, 0, -4.075]}>
        <boxGeometry args={[16, 12, 24.15]} />
        <meshStandardMaterial
          attach="material-0"
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.02}
          roughness={1}
          metalness={0}
          color="#ffffff"
          side={THREE.BackSide}
        />{" "}
        {/* Right */}
        <meshStandardMaterial
          attach="material-1"
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.02}
          roughness={1}
          metalness={0}
          color="#ffffff"
          side={THREE.BackSide}
        />{" "}
        {/* Left */}
        <meshStandardMaterial
          attach="material-2"
          color="#0a0a0a"
          side={THREE.BackSide}
        />{" "}
        {/* Ceiling */}
        <meshStandardMaterial
          attach="material-3"
          map={floorTexture}
          bumpMap={floorTexture}
          bumpScale={0.02}
          roughness={1}
          metalness={0}
          color="#ffffff"
          side={THREE.BackSide}
        />{" "}
        {/* Floor */}
        <meshStandardMaterial
          attach="material-4"
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.02}
          roughness={1}
          metalness={0}
          color="#ffffff"
          side={THREE.BackSide}
        />{" "}
        {/* Back */}
        <meshStandardMaterial attach="material-5" visible={false} />{" "}
        {/* Front (Door Hole) */}
      </mesh>

      {/* Floor Grate (Right Corner) */}
      <mesh position={[6.5, -5.98, -14.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial 
          map={drainTexture} 
          bumpMap={drainTexture} 
          bumpScale={0.02} 
          roughness={1} 
          metalness={0} 
          color="#ffffff" 
          transparent={true} 
        />
      </mesh>

      {/* Animated Water Puddle beside the drain */}
      <WaterPuddle />

      {/* Interior Ambient Light */}
      <ambientLight intensity={1.5} color="#ffffff" />
    </>
  );
}
