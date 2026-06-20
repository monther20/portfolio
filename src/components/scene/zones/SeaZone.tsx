"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export default function SeaZone({ position }: { position: [number, number, number] }) {
  const seaRef = useRef<THREE.Mesh>(null);

  // Animate the sea vertices to simulate low-poly waves
  useFrame(({ clock }) => {
    if (seaRef.current) {
      const time = clock.getElapsedTime();
      const geometry = seaRef.current.geometry as THREE.PlaneGeometry;
      const positionAttribute = geometry.attributes.position;
      
      for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i); // Note: Plane is rotated, so Y is local Z equivalent
        
        // Calculate a sine wave based on X and Y to make it ripple
        const z = Math.sin(x * 0.2 + time) * 1.5 + Math.cos(y * 0.2 + time) * 1.5;
        positionAttribute.setZ(i, z);
      }
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals(); // Recompute for accurate flat shading lighting
    }
  });

  return (
    <group position={position}>
      {/* Sunlight over the sea */}
      <directionalLight position={[50, 100, 50]} intensity={2} color="#fdf4ff" />
      <pointLight position={[0, 20, -50]} intensity={300} distance={200} color="#38bdf8" />

      {/* Low-poly animated ocean plane */}
      <mesh ref={seaRef} position={[0, -20, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Lots of segments so it looks like faceted waves */}
        <planeGeometry args={[300, 200, 60, 40]} />
        <meshStandardMaterial 
          color="#0284c7" 
          roughness={0.1} 
          metalness={0.6} 
          flatShading 
          transparent 
          opacity={0.9} 
        />
      </mesh>
    </group>
  );
}
