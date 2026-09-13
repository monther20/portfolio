import { Suspense, useCallback, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

import { Environment } from "@react-three/drei";
import AnimatedDoor from "./room/AnimatedDoor";
import ExteriorRoof from "./ExteriorRoof";
import InteriorDetails from "./InteriorDetails";
import JourneyScene from "./JourneyScene";
import { CORRIDOR } from "./journeyConfig";
import { ROOM_ENVIRONMENT_URL } from "./assetPaths";
import { createRoomDebugState } from "./roomDebug/state";
import type { RoomDebugState } from "./roomDebug/types";
import { useResponsiveExperience } from "../ResponsiveExperience";
import { DayNightProvider } from "./dayNight/DayNightProvider";
import DayNightLighting from "./dayNight/DayNightLighting";

const AVATAR_APPROACH_DISTANCE = 7;

export default function RoomScene({
  corridorLoadProgress,
  corridorAssetsReady,
  onTransitionComplete,
}: {
  corridorLoadProgress: number;
  corridorAssetsReady: boolean;
  onTransitionComplete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [doorReady, setDoorReady] = useState(false);
  const debugRef = useRef<RoomDebugState>(null!);
  const { camera } = useThree();
  const responsive = useResponsiveExperience();

  if (!debugRef.current) {
    debugRef.current = createRoomDebugState();
  }

  const debug = debugRef.current;
  const sceneBackgroundColor = debug.scene.dayBackgroundColor;
  const sceneFogColor = debug.scene.dayFogColor;

  const markDoorReady = useCallback(() => setDoorReady(true), []);

  const handleDoorClick = () => {
    if (!corridorAssetsReady || !doorReady || isOpen || isTransitioning) return;
    setIsOpen(true);
    setIsTransitioning(true);

    document.body.style.overflow = "hidden";

    const transitionDuration = responsive.reducedMotion ? 0.01 : 2.5;
    const transitionDelay = responsive.reducedMotion ? 0 : 0.5;
    const tl = gsap.timeline({
      onComplete: () => {
        setIsTransitioning(false);
        onTransitionComplete();
      },
    });

    tl.to(
      camera.position,
      {
        x: 0,
        y: -1.5,
        z: CORRIDOR.avatar.z + AVATAR_APPROACH_DISTANCE,
        duration: transitionDuration,
        ease: "power2.inOut",
      },
      `+=${transitionDelay}`,
    );
    tl.to(
      camera.rotation,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: transitionDuration,
        ease: "power2.inOut",
      },
      "<",
    );
  };

  return (
    <DayNightProvider enabled={!isTransitioning}>
      <color attach="background" args={[sceneBackgroundColor]} />
      <fog
        attach="fog"
        args={[sceneFogColor, debug.scene.fogNear, debug.scene.fogFar]}
      />

      {debug.environment.studioHdri.visible &&
        responsive.qualityTier !== "low" && (
          <Environment
            files={ROOM_ENVIRONMENT_URL}
            environmentIntensity={
              debug.environment.studioHdri.environmentIntensity
            }
          />
        )}

      <DayNightLighting debug={debug} />
      <InteriorDetails debug={debug} />
      <ExteriorRoof debug={debug} />
      <AnimatedDoor
        isOpen={isOpen}
        loadProgress={corridorLoadProgress}
        assetsReady={corridorAssetsReady}
        onReady={markDoorReady}
        onClick={
          doorReady && !isOpen && !isTransitioning
            ? handleDoorClick
            : undefined
        }
        debug={debug}
      />

      {isOpen ? (
        <group>
          <Suspense fallback={null}>
            <JourneyScene scrollEnabled={!isTransitioning} />
          </Suspense>
        </group>
      ) : null}
    </DayNightProvider>
  );
}
