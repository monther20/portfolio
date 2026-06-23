"use client";

import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import RoomScene from "../components/scene/RoomScene";
import ShadowDebugPanel, {
  ShadowConfig,
  DEFAULT_SHADOW_CONFIG,
} from "../components/scene/ShadowDebugPanel";

export default function MoodyHallwayScene() {
  const [shadowConfig, setShadowConfig] = useState<ShadowConfig>(
    DEFAULT_SHADOW_CONFIG
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <Canvas
        camera={{ position: [0, -2, 8], fov: 32 }}
        onCreated={({ camera }) => camera.lookAt(0, -1.285, -15.9)}
        gl={{ toneMapping: THREE.NoToneMapping }}
      >
        <Suspense fallback={null}>
          <RoomScene
            shadowConfig={shadowConfig}
            onTransitionComplete={() => console.log("Transition complete")}
          />
        </Suspense>
      </Canvas>

      {/* HTML overlay — lives outside the Canvas so it receives normal DOM events */}
      <ShadowDebugPanel config={shadowConfig} onChange={setShadowConfig} />
    </div>
  );
}
