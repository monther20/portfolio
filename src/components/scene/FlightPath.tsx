"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { AirplaneModel } from "./PaperAirplane";

import CaveZone from "./zones/CaveZone";
import CityZone from "./zones/CityZone";
import SeaZone from "./zones/SeaZone";
import BeachZone from "./zones/BeachZone";

export default function FlightPath() {
  const { camera, scene } = useThree();
  const scroll = useScroll();
  const planeRef = useRef<THREE.Group>(null);

  // Define the curvy flight path through the 4 biomes
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 10),       // Start (inside the room/portal transition)
      new THREE.Vector3(0, 0, -30),      // Cave entrance
      new THREE.Vector3(20, -10, -70),   // Exiting cave, turning towards city
      new THREE.Vector3(50, -20, -100),  // City center
      new THREE.Vector3(0, -30, -150),   // Leaving city, heading to sea
      new THREE.Vector3(-50, -40, -200), // Over the sea
      new THREE.Vector3(-20, -50, -250), // Approaching beach
      new THREE.Vector3(0, -57, -280),   // Over the sand dunes
      new THREE.Vector3(0, -57, -300)    // Landing at the beach
    ]);
  }, []);

  // Biome colors for seamless environment blending
  const caveColor = useMemo(() => new THREE.Color("#020617"), []); // Very dark slate
  const cityColor = useMemo(() => new THREE.Color("#1e1b4b"), []); // Deep purple neon night
  const seaColor = useMemo(() => new THREE.Color("#38bdf8"), []);  // Bright sunny blue
  const beachColor = useMemo(() => new THREE.Color("#fdba74"), []); // Warm sunset orange

  useFrame(() => {
    if (!planeRef.current) return;
    
    // scroll.offset is normalized between 0 (top) and 1 (bottom)
    const progress = scroll.offset;
    
    // Dynamic Sky and Fog interpolation
    const currentBgColor = new THREE.Color();
    if (progress < 0.1) { // Exit the cave much faster
      currentBgColor.lerpColors(caveColor, cityColor, progress / 0.1);
    } else if (progress < 0.5) {
      currentBgColor.lerpColors(cityColor, seaColor, (progress - 0.1) / 0.4);
    } else if (progress < 0.8) {
      currentBgColor.lerpColors(seaColor, beachColor, (progress - 0.5) / 0.3);
    } else {
      currentBgColor.copy(beachColor);
    }
    scene.background = currentBgColor;
    
    // Add dynamic fog that matches the background color to smoothly fade out geometries
    scene.fog = new THREE.Fog(currentBgColor.getHex(), 20, 100);

    // We get a point slightly ahead of the current progress for the plane to look at
    const lookAtProgress = Math.min(progress + 0.02, 1.0);
    
    // Get the exact 3D coordinates on the curve for the plane
    const planePosition = curve.getPointAt(progress);
    const lookAtPosition = curve.getPointAt(lookAtProgress);
    
    // Move the plane
    planeRef.current.position.copy(planePosition);
    
    // Make the plane point forward along the curve
    planeRef.current.lookAt(lookAtPosition);
    
    // Add banking based on the horizontal difference (turning left/right)
    const dx = lookAtPosition.x - planePosition.x;
    // planeRef natively faces Z, so rotating Z rolls it left/right!
    planeRef.current.rotation.z = -dx * 0.2; 
    
    // Camera follows behind the plane
    // We grab a point slightly behind the plane on the curve
    const cameraProgress = Math.max(progress - 0.05, 0);
    const baseCameraPos = curve.getPointAt(cameraProgress);
    
    // We raise the camera up a bit and pull it back
    camera.position.set(
      baseCameraPos.x, 
      baseCameraPos.y + 2, 
      baseCameraPos.z + 5
    );
    
    // Camera looks directly at the plane
    camera.lookAt(planePosition.x, planePosition.y, planePosition.z);
  });

  return (
    <>
      <group ref={planeRef}>
        {/* We rotate the model Math.PI around Y because it natively faces +Z, but our curve progresses down -Z */}
        <AirplaneModel 
          isFolded={true} 
          rotation={[0, Math.PI, 0]} 
          scale={0.3} 
        />
      </group>

      {/* Place the 4 unique biomes along the flight path */}
      <CaveZone position={[0, 0, 0]} />
      <CityZone position={[50, -20, -100]} />
      <SeaZone position={[-50, -40, -200]} />
      <BeachZone position={[0, -57, -300]} />
    </>
  );
}
