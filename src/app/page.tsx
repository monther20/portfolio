"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import SketchPreloader from "../components/SketchPreloader";
import RoomScene from "../components/scene/RoomScene";
import JourneyHud from "../components/scene/JourneyHud";
import AssetPreloader from "../components/scene/AssetPreloader";

/** Scene-aware preloader that keeps the shared sketch visual in sync with Drei loading progress. */
function LoadingOverlay() {
  const { active, progress } = useProgress();
  const startTime = useRef(Date.now());
  const triggered = useRef(false);

  const [lineProgress, setLineProgress] = useState(0);
  const [isSketching, setIsSketching] = useState(false);
  const [isGone, setIsGone] = useState(false);

  /** Fire the sketch animation once, honouring the min display time. */
  const sketch = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;

    const elapsed = Date.now() - startTime.current;
    const minMs = 1800; // keep overlay visible at least 1.8 s
    const remaining = Math.max(0, minMs - elapsed);

    window.setTimeout(() => {
      setLineProgress(100);
      window.setTimeout(() => {
        setIsSketching(true);
        window.setTimeout(() => setIsGone(true), 1900);
      }, 250);
    }, remaining);
  }, []);

  // Smoothly follow Three.js loader progress, but keep a little room for finish.
  useEffect(() => {
    if (active) {
      setLineProgress((current) => Math.max(current, Math.min(progress * 0.9, 96)));
      return;
    }

    if (progress >= 100) sketch();
  }, [active, progress, sketch]);

  // Fallback: if no heavy assets ever load, fill the line and sketch after 2.2 s.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setLineProgress((current) => Math.min(94, current + 1.8));
    }, 70);
    const timeout = window.setTimeout(sketch, 2200);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [sketch]);

  if (isGone) return null;

  return <SketchPreloader lineProgress={lineProgress} isSketching={isSketching} />;
}

export default function MoodyHallwayScene() {
  const [entered, setEntered] = useState(false);

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <Canvas
        camera={{ position: [0.370000000000005, 1.06, 5.62], fov: 32, near: 0.1, far: 770 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.719, -15.9)}
        gl={{ toneMapping: THREE.NoToneMapping }}
      >
        <Suspense fallback={null}>
          <RoomScene onTransitionComplete={() => setEntered(true)} />
        </Suspense>
      </Canvas>

      <LoadingOverlay />
      <JourneyHud visible={entered} />
      {/* Warms the texture cache in the background (corridor → sky → beach). */}
      <AssetPreloader />

    </div>
  );
}
