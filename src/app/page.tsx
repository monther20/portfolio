"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import SketchPreloader from "../components/SketchPreloader";
import {
  ResponsiveExperienceProvider,
  useResponsiveExperience,
} from "../components/ResponsiveExperience";
import RoomScene from "../components/scene/RoomScene";
import JourneyHud from "../components/scene/JourneyHud";
import ResponsiveCamera from "../components/scene/ResponsiveCamera";

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

  const sketch = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;

    const elapsed = Date.now() - startTime.current;
    const minMs = 1800;
    const remaining = Math.max(0, minMs - elapsed);

    window.setTimeout(() => {
      setLineProgress(100);
      window.setTimeout(() => {
        setIsSketching(true);
        window.setTimeout(() => setIsGone(true), 1900);
      }, 250);
    }, remaining);
  }, []);

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

  useEffect(() => {
    if (active || !sceneReady || !fontsReady || !documentReady) return;

    const timeout = window.setTimeout(sketch, 150);
    return () => window.clearTimeout(timeout);
  }, [active, documentReady, fontsReady, sceneReady, sketch]);

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

function browserSupportsWebGL2(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGL2RenderingContext && canvas.getContext("webgl2"),
    );
  } catch {
    return false;
  }
}

function WebGLFallback() {
  return (
    <div className="webgl-fallback" role="status">
      <h1>Monther Abdelrazek</h1>
      <p>This browser could not start the interactive 3D portfolio.</p>
      <a href="mailto:monther.abdelrazek@gmail.com">Contact Monther</a>
    </div>
  );
}

function ResponsiveHallwayScene() {
  const [entered, setEntered] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const markSceneReady = useCallback(() => setSceneReady(true), []);
  const responsive = useResponsiveExperience();

  useEffect(() => {
    setWebglSupported(browserSupportsWebGL2());
  }, []);

  return (
    <main
      className="experience-root"
      data-layout={responsive.layout}
      data-quality={responsive.qualityTier}
    >
      {webglSupported === false ? <WebGLFallback /> : null}

      {webglSupported === true ? (
        <Canvas
          className="experience-canvas"
          aria-label="Interactive 3D portfolio. Open the door, then scroll, swipe, or use the arrow keys to explore."
          tabIndex={0}
          dpr={responsive.maxDpr}
          performance={{ min: 0.5, debounce: 200 }}
          camera={{
            position: [0.370000000000005, 1.06, 5.62],
            fov: responsive.cameraFov,
            near: 0.1,
            far: 770,
          }}
          onCreated={({ camera }) => camera.lookAt(0, 0.719, -15.9)}
          gl={{
            toneMapping: THREE.NoToneMapping,
            powerPreference: "high-performance",
            antialias: true,
          }}
        >
          <ResponsiveCamera />
          <Suspense fallback={null}>
            <RoomScene onTransitionComplete={() => setEntered(true)} />
            <SceneReadySignal onReady={markSceneReady} />
          </Suspense>
        </Canvas>
      ) : null}

      {webglSupported !== false ? (
        <LoadingOverlay sceneReady={sceneReady} />
      ) : null}
      {webglSupported === true ? <JourneyHud visible={entered} /> : null}
    </main>
  );
}

export default function MoodyHallwayScene() {
  return (
    <ResponsiveExperienceProvider>
      <ResponsiveHallwayScene />
    </ResponsiveExperienceProvider>
  );
}
