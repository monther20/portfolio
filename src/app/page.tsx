"use client";

import React, { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";

// Import our refactored modular scene orchestrators
import RoomScene from "../components/scene/RoomScene";
import PaperPlaneScene from "../components/scene/PaperPlaneScene";

export default function MoodyHallwayScene() {
  const [sceneState, setSceneState] = useState<'ROOM' | 'PAPER_PLANE'>('ROOM');

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <Canvas
        camera={{ position: [0, -2, 8], fov: 32 }}
        onCreated={({ camera }) => camera.lookAt(0, -1.285, -15.9)}
      >
        <Suspense fallback={null}>
          {sceneState === 'ROOM' ? (
            <RoomScene onTransitionComplete={() => setSceneState('PAPER_PLANE')} />
          ) : (
            <PaperPlaneScene />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
