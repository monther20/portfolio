"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import RoomScene from "../components/scene/RoomScene";
import JourneyHud from "../components/scene/JourneyHud";
import ShadowDebugPanel, {
  ShadowConfig,
  DEFAULT_SHADOW_CONFIG,
} from "../components/scene/ShadowDebugPanel";

/**
 * LoadingOverlay — A sketch-style preloader: an off-white/white surface
 * split by a hand-drawn scribbled line, with hand-written details.
 */
function createSketchPoints() {
  const points: number[][] = [[50, 0]];
  const segments = 20;

  for (let i = 1; i < segments; i++) {
    const y = (i / segments) * 100;
    // A squiggly hand-drawn pencil line
    const scribble = Math.sin(i * 12) * 2;
    const jitter = (Math.random() - 0.5) * 3;
    points.push([50 + scribble + jitter, y]);
  }

  points.push([50, 100]);
  return points;
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  const startTime = React.useRef(Date.now());
  const triggered = React.useRef(false);

  const [lineProgress, setLineProgress] = useState(0);
  const [isSketching, setIsSketching] = useState(false);
  const [isGone, setIsGone] = useState(false);
  const [sketchPoints, setSketchPoints] = useState<number[][]>([[50, 0], [50, 100]]);

  useEffect(() => {
    setSketchPoints(createSketchPoints());
  }, []);

  const svgPathData = useMemo(
    () => sketchPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" "),
    [sketchPoints]
  );

  const leftClipPoly = useMemo(() => {
    const middle = sketchPoints.map((p) => `${p[0]}% ${p[1]}%`).join(", ");
    return `polygon(0% 0%, ${middle}, 0% 100%)`;
  }, [sketchPoints]);

  const rightClipPoly = useMemo(() => {
    const middle = [...sketchPoints]
      .reverse()
      .map((p) => `${p[0]}% ${p[1]}%`)
      .join(", ");
    return `polygon(100% 0%, 100% 100%, ${middle})`;
  }, [sketchPoints]);

  /** Fire the sketch animation once, honouring the min display time. */
  const sketch = React.useCallback(() => {
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

  const percentageText = `${Math.round(lineProgress)}%`;

  return (
    <div
      className={`sketch-preloader${isSketching ? " is-sketching" : ""}`}
      style={{ "--line-progress": lineProgress } as React.CSSProperties}
    >
      <div className="sketch-preloader__half sketch-preloader__half--left" style={{ clipPath: leftClipPoly }}>
        <div className="sketch-preloader__content">
          <span>{percentageText}</span>
          <span className="sketch-preloader__ring" aria-hidden="true" />
        </div>
        <svg className="sketch-preloader__overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d={svgPathData} />
        </svg>
      </div>

      <div className="sketch-preloader__half sketch-preloader__half--right" style={{ clipPath: rightClipPoly }}>
        <div className="sketch-preloader__content">
          <span>{percentageText}</span>
          <span className="sketch-preloader__ring" aria-hidden="true" />
        </div>
        <svg className="sketch-preloader__overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d={svgPathData} />
        </svg>
      </div>
    </div>
  );
}

export default function MoodyHallwayScene() {
  const [shadowConfig, setShadowConfig] = useState<ShadowConfig>(
    DEFAULT_SHADOW_CONFIG
  );
  const [entered, setEntered] = useState(false);

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
            onTransitionComplete={() => setEntered(true)}
          />
        </Suspense>
      </Canvas>

      <LoadingOverlay />
      <JourneyHud visible={entered} />

      {/* HTML overlay — lives outside the Canvas so it receives normal DOM events */}
      <ShadowDebugPanel config={shadowConfig} onChange={setShadowConfig} />
    </div>
  );
}
