"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import SketchPreloader from "../components/SketchPreloader";
import {
  ResponsiveExperienceProvider,
  useResponsiveExperience,
} from "../components/ResponsiveExperience";
import RoomScene from "../components/scene/RoomScene";
import JourneyHud from "../components/scene/JourneyHud";
import JourneySectionNav from "../components/scene/JourneySectionNav";
import ResponsiveCamera from "../components/scene/ResponsiveCamera";
import SceneReadySignal from "../components/scene/SceneReadySignal";
import {
  JourneyLoadingProvider,
  JourneyLoadingNotice,
} from "../components/scene/JourneyLoadingProvider";
import { DAY_CONFIG } from "../components/scene/dayNight/config";
import {
  DayNightProvider,
  useDayNight,
} from "../components/scene/dayNight/DayNightProvider";
import DayNightSwitch from "../components/scene/dayNight/DayNightSwitch";

function LoadingOverlay({
  sceneReady,
  onComplete,
}: {
  sceneReady: boolean;
  onComplete: () => void;
}) {
  const progress = useProgress((state) => state.progress);
  const [lineProgress, setLineProgress] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    const loaderProgress = Number.isFinite(progress) ? progress : 0;
    setLineProgress((current) =>
      Math.max(current, Math.min(loaderProgress * 0.94, 94)),
    );
  }, [progress]);

  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Readiness belongs to the entrance's mounted scene, not the global loading
  // manager (which will also see background work). No minimum wait or fake tick.
  const ready = sceneReady && fontsReady;
  return (
    <SketchPreloader
      lineProgress={ready ? 100 : lineProgress}
      isSketching={ready}
      onExitComplete={onComplete}
    />
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

function ResponsiveHallwayScene({
  onEntryTransitionChange,
}: {
  onEntryTransitionChange: (transitioning: boolean) => void;
}) {
  const [entered, setEntered] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [initialLoadingComplete, setInitialLoadingComplete] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const markSceneReady = useCallback(() => setSceneReady(true), []);
  const markInitialLoadingComplete = useCallback(
    () => setInitialLoadingComplete(true),
    [],
  );
  const enter = useCallback(() => {
    setDoorOpen(true);
    onEntryTransitionChange(true);
  }, [onEntryTransitionChange]);
  const finishEntry = useCallback(() => {
    setEntered(true);
    onEntryTransitionChange(false);
  }, [onEntryTransitionChange]);
  const responsive = useResponsiveExperience();
  const { timeOfDay, toggle } = useDayNight();

  useEffect(() => {
    setWebglSupported(browserSupportsWebGL2());
  }, []);

  return (
    <main
      className="experience-root"
      data-layout={responsive.layout}
      data-quality={responsive.qualityTier}
      data-time-of-day={timeOfDay}
    >
      {webglSupported === false ? <WebGLFallback /> : null}

      {webglSupported === true ? (
        <Canvas
          className="experience-canvas"
          role="application"
          aria-label="Interactive 3D portfolio. Click or tap the door, or press Enter to enter. Click a lantern or press N to toggle day and night. Once inside, scroll, swipe, or use the arrow keys to explore. A light switch is also available after entering."
          tabIndex={0}
          onKeyDown={(event) => {
            // Ignore keys from embedded forms and other scene controls.
            if (
              (event.target !== event.currentTarget &&
                !(event.target instanceof HTMLCanvasElement)) ||
              event.repeat ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey
            )
              return;
            if (
              initialLoadingComplete &&
              !doorOpen &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              enter();
            } else if (event.key.toLowerCase() === "n") {
              event.preventDefault();
              toggle();
            }
          }}
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
            toneMappingExposure: DAY_CONFIG.exposure,
            powerPreference: "high-performance",
            antialias: true,
          }}
        >
          <ResponsiveCamera />
          <Suspense fallback={null}>
            <RoomScene
              entryEnabled={initialLoadingComplete}
              isOpen={doorOpen}
              onEnter={enter}
              onTransitionComplete={finishEntry}
            />
            <SceneReadySignal onReady={markSceneReady} />
          </Suspense>
        </Canvas>
      ) : null}

      {webglSupported !== false && !initialLoadingComplete ? (
        <LoadingOverlay
          sceneReady={sceneReady}
          onComplete={markInitialLoadingComplete}
        />
      ) : null}
      {webglSupported === true ? (
        <>
          <JourneyLoadingNotice visible={entered} />
          <DayNightSwitch visible={entered} />
          <JourneyHud visible={entered} />
          <JourneySectionNav visible={entered} />
        </>
      ) : null}
    </main>
  );
}

export default function MoodyHallwayScene() {
  const [isEntering, setIsEntering] = useState(false);

  return (
    <ResponsiveExperienceProvider>
      <DayNightProvider enabled={!isEntering}>
        <JourneyLoadingProvider>
          <ResponsiveHallwayScene onEntryTransitionChange={setIsEntering} />
        </JourneyLoadingProvider>
      </DayNightProvider>
    </ResponsiveExperienceProvider>
  );
}
