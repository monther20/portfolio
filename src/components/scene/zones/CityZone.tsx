"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export default function CityZone({ position }: { position: [number, number, number] }) {
  // Generate a grid of random skyscrapers
  const buildings = useMemo(() => {
    const items = [];
    for (let i = 0; i < 80; i++) {
      const height = Math.random() * 40 + 10;
      // Scatter them widely, leaving a gap in the center for the flight path
      const xPos = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 50 + 15);
      
      items.push({
        position: [
          xPos, 
          height / 2 - 30, // Sink them so the plane flies between them
          -Math.random() * 120
        ],
        height,
        width: Math.random() * 8 + 4,
        depth: Math.random() * 8 + 4,
        // Some buildings are neon, some are dark glass
        color: Math.random() > 0.85 ? "#f472b6" : (Math.random() > 0.85 ? "#3b82f6" : "#0f172a"),
        isNeon: Math.random() > 0.85
      });
    }
    return items;
  }, []);

  return (
    <group position={position}>
      {/* City lighting: pink and blue neon aesthetic */}
      <pointLight position={[0, 10, -40]} intensity={400} distance={150} color="#f472b6" />
      <pointLight position={[20, -10, -90]} intensity={500} distance={200} color="#3b82f6" />
      <pointLight position={[-20, 5, -10]} intensity={300} distance={150} color="#818cf8" />

      {buildings.map((b, i) => (
        <mesh key={i} position={b.position as [number, number, number]}>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial 
            color={b.color} 
            emissive={b.isNeon ? b.color : "#000000"} 
            emissiveIntensity={b.isNeon ? 2 : 0}
            roughness={0.2}
            metalness={0.8}
            flatShading 
          />
        </mesh>
      ))}

      {/* Grid ground to sell the cyber/city vibe */}
      <mesh position={[0, -30, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200, 20, 20]} />
        <meshStandardMaterial color="#020617" wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
