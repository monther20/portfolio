import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

import { Environment } from "@react-three/drei";
import AnimatedDoor from "./AnimatedDoor";
import ExteriorRoof from "./ExteriorRoof";
import InteriorDetails from "./InteriorDetails";
import JourneyScene from "./JourneyScene";
import { CORRIDOR } from "./journeyConfig";
import { DEFAULT_SHADOW_CONFIG } from "./shadowConfig";
import { createRoomDebugState } from "./roomDebug/state";
import type { RoomDebugState } from "./roomDebug/types";
import { useResponsiveExperience } from "../ResponsiveExperience";

const AVATAR_APPROACH_DISTANCE = 7;

export default function RoomScene({
  onTransitionComplete,
}: {
  onTransitionComplete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const debugRef = useRef<RoomDebugState>(null!);
  const { camera, scene } = useThree();
  const responsive = useResponsiveExperience();
  const shadowConfig = DEFAULT_SHADOW_CONFIG;

  if (!debugRef.current) {
    debugRef.current = createRoomDebugState(shadowConfig);
  }

  const debug = debugRef.current;
  const isNight = false;
  const sceneBackgroundColor = debug.scene.dayBackgroundColor;
  const sceneFogColor = debug.scene.dayFogColor;

  useEffect(() => {
    const targetBackgroundColor = new THREE.Color(sceneBackgroundColor);
    const targetFogColor = new THREE.Color(sceneFogColor);

    if (scene.background instanceof THREE.Color) {
      gsap.to(scene.background, {
        r: targetBackgroundColor.r,
        g: targetBackgroundColor.g,
        b: targetBackgroundColor.b,
        duration: 1.5,
      });
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = debug.scene.fogNear;
      scene.fog.far = debug.scene.fogFar;
      gsap.to(scene.fog.color, {
        r: targetFogColor.r,
        g: targetFogColor.g,
        b: targetFogColor.b,
        duration: 1.5,
      });
    }
  }, [
    debug.scene.fogFar,
    debug.scene.fogNear,
    scene,
    sceneBackgroundColor,
    sceneFogColor,
  ]);

  const handleDoorClick = () => {
    if (isTransitioning) return;
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
    <>
      <color attach="background" args={[sceneBackgroundColor]} />
      <fog
        attach="fog"
        args={[sceneFogColor, debug.scene.fogNear, debug.scene.fogFar]}
      />

      {debug.environment.studioHdri.visible &&
        responsive.qualityTier !== "low" && (
          <Environment
            files="/monochrome_studio_02_1k.hdr"
            environmentIntensity={
              debug.environment.studioHdri.environmentIntensity
            }
          />
        )}

      <InteriorDetails
        isNight={isNight}
        shadowConfig={shadowConfig}
        debug={debug}
      />
      <ExteriorRoof debug={debug} />
      <AnimatedDoor
        isOpen={isOpen}
        isNight={isNight}
        onClick={handleDoorClick}
        debug={debug}
      />

      {isOpen ? (
        <group>
          <Suspense fallback={null}>
            <JourneyScene scrollEnabled={!isTransitioning} />
          </Suspense>
        </group>
      ) : null}
    </>
  );
}
