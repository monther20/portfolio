"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export default function BeachZone({ position }: { position: [number, number, number] }) {
  // Generate low-poly palm trees
  const trees = useMemo(() => {
    const items = [];
    for (let i = 0; i < 15; i++) {
      items.push({
        position: [
          (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 30 + 10),
          -15,
          -Math.random() * 60
        ],
        scale: Math.random() * 0.5 + 0.8,
        rotation: (Math.random() - 0.5) * 0.5
      });
    }
    return items;
  }, []);

  return (
    <group position={position}>
      {/* Warm sunset lighting */}
      <pointLight position={[0, 30, -80]} intensity={800} distance={300} color="#fb923c" />
      <ambientLight intensity={0.5} color="#fef3c7" />

      {/* Sand dunes */}
      <mesh position={[0, -18, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Using a sphere scaled flat to look like a giant smooth dune */}
        <sphereGeometry args={[80, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" roughness={1} flatShading />
      </mesh>

      {/* Palm Trees */}
      {trees.map((tree, i) => (
        <group 
          key={i} 
          position={tree.position as [number, number, number]} 
          scale={tree.scale}
          rotation={[0, 0, tree.rotation]}
        >
          {/* Trunk */}
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.5, 1, 10, 5]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
          </mesh>
          {/* Leaves (Simple pyramids intersecting) */}
          <mesh position={[0, 10, 0]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[4, 2, 4]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 10, 0]} rotation={[-0.4, 0, 0]}>
            <coneGeometry args={[4, 2, 4]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 10, 0]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[4, 2, 4]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 10, 0]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[4, 2, 4]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
          </mesh>
        </group>
      ))}

      {/* The final destination / landing pad */}
      <mesh position={[0, -17, -80]}>
        <cylinderGeometry args={[8, 8, 2, 16]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.5} metalness={0.2} flatShading />
      </mesh>
    </group>
  );
}
