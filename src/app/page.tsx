"use client";

import React, { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";

// Import our refactored modular components
import ScrollCameraManager from "../components/scene/ScrollCameraManager";
import AnimatedDoor from "../components/scene/AnimatedDoor";
import ExteriorRoof from "../components/scene/ExteriorRoof";
import InteriorDetails from "../components/scene/InteriorDetails";

export default function MoodyHallwayScene() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <Canvas
        camera={{ position: [0, -2, 8], fov: 32 }}
        onCreated={({ camera }) => camera.lookAt(0, -1.285, -15.9)}
      >
        {/* Virtual Scroll Animation Manager */}
        <ScrollCameraManager isOpen={isOpen} />

        {/* Interior & Global Lighting */}
        <ambientLight intensity={0.4} />

        {/* Exterior Lighting */}
        <pointLight
          position={[0, 30, -50]}
          intensity={1500}
          distance={150}
          color="#aaccff"
          decay={2}
        />
        <pointLight
          position={[0, -10, -100]}
          intensity={2500}
          distance={200}
          color="#ff9955"
          decay={2}
        />

        {/* Fog pushed back to reveal the skyline */}
        <fog attach="fog" args={["#000510", 30, 200]} />

        {/* 3D Scene Components */}
        <Suspense fallback={null}>
          <InteriorDetails />
          <ExteriorRoof />
          <AnimatedDoor isOpen={isOpen} setIsOpen={setIsOpen} />
        </Suspense>
      </Canvas>
    </div>
  );
}
