"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import RoomScene from "../components/scene/RoomScene";
import ShadowDebugPanel, {
  ShadowConfig,
  DEFAULT_SHADOW_CONFIG,
} from "../components/scene/ShadowDebugPanel";

/**
 * LoadingOverlay — two white panels that "tear" apart once the 3-D assets
 * have loaded (and a minimum display time has passed).
 * No text, no decorations — just the split.
 */
function LoadingOverlay() {
  const { active, progress } = useProgress();
  const startTime = React.useRef(Date.now());
  const triggered = React.useRef(false);

  const [isTearing, setIsTearing] = useState(false);
  const [isGone, setIsGone]       = useState(false);

  /** Fire the tear animation once, honouring the min display time. */
  const tear = React.useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;

    const elapsed   = Date.now() - startTime.current;
    const minMs     = 1800; // keep panels visible at least 1.8 s
    const remaining = Math.max(0, minMs - elapsed);

    window.setTimeout(() => {
      setIsTearing(true);
      // Remove from DOM after animation finishes (0.95 s + tiny buffer)
      window.setTimeout(() => setIsGone(true), 1100);
    }, remaining);
  }, []);

  // Watch Three.js loader progress
  useEffect(() => {
    if (!active && progress >= 100) tear();
  }, [active, progress, tear]);

  // Fallback: if no heavy assets ever load, tear after 2.2 s anyway
  useEffect(() => {
    const t = window.setTimeout(tear, 2200);
    return () => window.clearTimeout(t);
  }, [tear]);

  if (isGone) return null;

  return (
    <>
      <div className={`torn-panel torn-top${isTearing ? " is-tearing" : ""}`} />
      <div className={`torn-panel torn-bottom${isTearing ? " is-tearing" : ""}`} />
    </>
  );
}

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

      <LoadingOverlay />

      {/* HTML overlay — lives outside the Canvas so it receives normal DOM events */}
      <ShadowDebugPanel config={shadowConfig} onChange={setShadowConfig} />
    </div>
  );
}
