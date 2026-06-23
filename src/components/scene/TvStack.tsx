"use client";

import React, { useMemo, useEffect } from "react";
import { useGLTF, Clone } from "@react-three/drei";
import * as THREE from "three";

export default function TvStack({
  position,
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const { scene } = useGLTF("/3d models/tv.glb");

  // Automatically calculate the exact dimensions of the TV model
  const { tvHeight, tvWidth, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const height = box.max.y - box.min.y;
    // The width is usually the largest horizontal dimension
    const sizeX = box.max.x - box.min.x;
    const sizeZ = box.max.z - box.min.z;
    const width = Math.max(sizeX, sizeZ);
    // The amount we need to shift the TV up so its bottom sits exactly at Y=0
    const offset = -box.min.y;
    return { tvHeight: height, tvWidth: width, yOffset: offset };
  }, [scene]);
  // Fix the materials: Clone the screen material to prevent Next.js cache glitches,
  // and force it to be completely unreflective so it's always black with green text.
  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          
          const newMats = mats.map((mat: any) => {
            // Identify the screen material by its texture maps or name
            const isScreen = mat.map || mat.emissiveMap || (mat.name && mat.name.toLowerCase().includes("screen"));
            
            // If it's the screen and we haven't fixed it yet
            if (isScreen && !mat.userData.isFixed) {
              const safeMat = mat.clone(); // Clone to prevent polluting the global useGLTF cache!
              
              safeMat.color.setHex(0x000000); // Force the background to pitch black
              safeMat.envMapIntensity = 0;    // Completely disable HDRI reflections
              safeMat.metalness = 0;          // Prevent metallic glare from point lights
              safeMat.roughness = 1;          // Make it perfectly matte
              
              safeMat.userData.isFixed = true; // Mark as fixed
              return safeMat;
            }
            return mat; // Leave the casing materials completely untouched!
          });

          child.material = Array.isArray(child.material) ? newMats : newMats[0];
        }
      });
    }
  }, [scene]);
  // Two columns: Column 0 has 3 TVs, Column 1 has 2 TVs
  const tvLayout = useMemo(() => [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: 2 },
    { col: 1, row: 0 },
    { col: 1, row: 1 },
  ], []);

  // Memoize the random offsets and rotations so they DO NOT recalculate 
  // every time the component re-renders (like when the door is clicked)!
  const tvInstances = useMemo(() => {
    return tvLayout.map((tv) => {
      // We want the backs against the left wall, so they face the room (+X direction).
      const baseRotationY = Math.PI / 2;
      // Add a slight messy rotation to look like an unstable pile
      const rotationY = baseRotationY + (Math.random() - 0.5) * 0.2;
      
      // Jitter the TVs slightly so they aren't perfectly aligned
      const offsetX = (Math.random() - 0.5) * 0.1;
      // Space out the columns along the Z axis (hallway depth)
      const offsetZ = tv.col * (tvWidth + 0.1) + (Math.random() - 0.5) * 0.1;

      return { ...tv, rotationY, offsetX, offsetZ };
    });
  }, [tvLayout, tvWidth]);

  return (
    <group position={position} scale={scale}>
      {tvInstances.map((tv, i) => (
        <group 
          key={i} 
          position={[tv.offsetX, tv.row * tvHeight + yOffset, tv.offsetZ]} 
          rotation={[0, tv.rotationY, 0]}
        >
          <Clone object={scene} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/3d models/tv.glb");
