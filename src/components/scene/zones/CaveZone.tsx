"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export default function CaveZone({ position }: { position: [number, number, number] }) {
  // Generate a rocky archway/cave mouth that opens into the world
  const rocks = useMemo(() => {
    const items = [];
    
    // Build a rocky arch around the start position (the cave mouth)
    for (let i = 0; i < 45; i++) {
      // Angle for the arch (from left ground over the top to right ground)
      const angle = (i / 45) * Math.PI; 
      const radius = 18 + Math.random() * 6; // Wide enough for the plane
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius - 8; // Offset down so it touches the "ground"
      const z = -Math.random() * 25; // Shallow depth, just an opening
      
      items.push({
        position: [x, y, z],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale: Math.random() * 8 + 5,
      });
    }
    
    // Add some random boulders on the ground near the exit
    for (let i = 0; i < 20; i++) {
      items.push({
        position: [
          (Math.random() - 0.5) * 50,
          -15 + (Math.random() - 0.5) * 5,
          -Math.random() * 30
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale: Math.random() * 5 + 3,
      });
    }
    return items;
  }, []);

  return (
    <group position={position}>
      {/* Dim lighting just inside the cave mouth */}
      <pointLight position={[0, 0, -10]} intensity={150} distance={60} color="#445577" />
      
      {/* The cave mouth / rocky arch */}
      {rocks.map((rock, i) => (
        <mesh 
          key={i} 
          position={rock.position as [number, number, number]} 
          rotation={rock.rotation as [number, number, number]}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}
