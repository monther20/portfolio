"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";

import RoomScene from "../components/scene/RoomScene";

export default function MoodyHallwayScene() {
  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <Canvas
        camera={{ position: [0, -2, 8], fov: 32 }}
        onCreated={({ camera }) => camera.lookAt(0, -1.285, -15.9)}
      >
        <Suspense fallback={null}>
          <RoomScene onTransitionComplete={() => console.log("Transition complete")} />
        </Suspense>
      </Canvas>
    </div>
  );
}
