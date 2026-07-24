"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Preload, useProgress } from "@react-three/drei";
import * as THREE from "three";

import SketchPreloader from "../components/SketchPreloader";
import RoomScene from "../components/scene/RoomScene";
import JourneyHud from "../components/scene/JourneyHud";

/** Reports readiness only after the resolved scene has produced two WebGL frames. */
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const renderedFrames = useRef(0);
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;

    renderedFrames.current += 1;
    if (renderedFrames.current >= 2) {
      reported.current = true;
      onReady();
    }
  });

  return null;
}

/** Scene-aware preloader that remains until assets, fonts, shaders, and the first scene frames are ready. */
function LoadingOverlay({ sceneReady }: { sceneReady: boolean }) {
  const active = useProgress((state) => state.active);
  const progress = useProgress((state) => state.progress);
  const startTime = useRef(Date.now());
  const triggered = useRef(false);

  const [lineProgress, setLineProgress] = useState(0);
  const [isSketching, setIsSketching] = useState(false);
  const [isGone, setIsGone] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [documentReady, setDocumentReady] = useState(false);

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

  // Smoothly follow Three.js loader progress, but reserve the final step for true readiness.
  useEffect(() => {
    if (!active) return;

    const loaderProgress = Number.isFinite(progress) ? progress : 0;
    setLineProgress((current) => {
      const next = Math.max(current, Math.min(loaderProgress * 0.9, 94));
      return Object.is(current, next) ? current : next;
    });
  }, [active, progress]);

  useEffect(() => {
    let cancelled = false;

    void document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });

    const markDocumentReady = () => setDocumentReady(true);
    if (document.readyState === "complete") {
      markDocumentReady();
    } else {
      window.addEventListener("load", markDocumentReady, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", markDocumentReady);
    };
  }, []);

  // Require a short stable idle period so a late loader cannot uncover an empty canvas.
  useEffect(() => {
    if (active || !sceneReady || !fontsReady || !documentReady) return;

    const timeout = window.setTimeout(sketch, 150);
    return () => window.clearTimeout(timeout);
  }, [active, documentReady, fontsReady, sceneReady, sketch]);

  // Keep the progress line moving while asynchronous loaders are working, but never finish early.
  useEffect(() => {
    if (isSketching || isGone) return;

    const interval = window.setInterval(() => {
      setLineProgress((current) => Math.min(94, current + 1.8));
    }, 70);

    return () => window.clearInterval(interval);
  }, [isGone, isSketching]);

  if (isGone) return null;

  return (
    <SketchPreloader lineProgress={lineProgress} isSketching={isSketching} />
  );
}

export default function MoodyHallwayScene() {
  const [entered, setEntered] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const markSceneReady = useCallback(() => setSceneReady(true), []);

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <Canvas
        camera={{
          position: [0.370000000000005, 1.06, 5.62],
          fov: 30,
          near: 0.1,
          far: 770,
        }}
        onCreated={({ camera }) => camera.lookAt(0, 0.719, -15.9)}
        gl={{ toneMapping: THREE.NoToneMapping }}
      >
        <Suspense fallback={null}>
          <RoomScene onTransitionComplete={() => setEntered(true)} />
          <Preload all />
          <SceneReadySignal onReady={markSceneReady} />
        </Suspense>
      </Canvas>

      <LoadingOverlay sceneReady={sceneReady} />
      <JourneyHud visible={entered} />
    </div>
  );
}
