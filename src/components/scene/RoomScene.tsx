import { Suspense, useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

import { Environment } from "@react-three/drei";
import AnimatedDoor from "./AnimatedDoor";
import ExteriorRoof from "./ExteriorRoof";
import InteriorDetails from "./InteriorDetails";
import JourneyScene from "./JourneyScene";
import { JOURNEY } from "./journeyConfig";
import { primeWalkAudio } from "./walkAudio";
import { DEFAULT_SHADOW_CONFIG } from "./ShadowDebugPanel";
import { createRoomDebugState } from "./roomDebug/state";
import type { RoomDebugState } from "./roomDebug/types";

export default function RoomScene({
  onTransitionComplete,
}: {
  onTransitionComplete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const itemsGroupRef = useRef<THREE.Group>(null);
  const debugRef = useRef<RoomDebugState>(null!);
  const { camera, scene } = useThree();
  const shadowConfig = DEFAULT_SHADOW_CONFIG;

  if (!debugRef.current) {
    debugRef.current = createRoomDebugState(shadowConfig);
  }

  const debug = debugRef.current;
  const sceneBackgroundColor = isNight ? debug.scene.nightBackgroundColor : debug.scene.dayBackgroundColor;
  const sceneFogColor = isNight ? debug.scene.nightFogColor : debug.scene.dayFogColor;

  const toggleNight = () => {
    setIsNight((current) => {
      const next = !current;
      debugRef.current.interaction.nightMode = next;
      return next;
    });
  };

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
  }, [debug.scene.fogFar, debug.scene.fogNear, scene, sceneBackgroundColor, sceneFogColor]);

  const handleDoorClick = () => {
    if (isTransitioning) return;
    primeWalkAudio(); // unlock audio within this click gesture so footsteps work
    setIsOpen(true);
    setIsTransitioning(true);

    // Disable scrolling
    document.body.style.overflow = "hidden";

    const tl = gsap.timeline({
      onComplete: () => {
        setIsTransitioning(false); // Remount the scroll manager
        onTransitionComplete();
      },
    });

    // Walk the camera through the door — stop just past it, facing the avatar.
    tl.to(
      camera.position,
      {
        x: 0,
        y: -1.5,
        z: JOURNEY.corridorStart,
        duration: 3.5,
        ease: "power2.inOut",
      },
      "+=0.5",
    );
    // Level the view to look straight down the journey (-z).
    tl.to(
      camera.rotation,
      { x: 0, y: 0, z: 0, duration: 3.5, ease: "power2.inOut" },
      "<",
    );
  };

  // RoomScene itself does not respond to scroll; JourneyScene enables scrolling
  // only after the door transition finishes.
  return (
    <>
      {/* Lighting */}
      <color attach="background" args={[sceneBackgroundColor]} />
      <fog attach="fog" args={[sceneFogColor, debug.scene.fogNear, debug.scene.fogFar]} />

      {/* 
        ENVIRONMENT MAP (HDRI)
        This provides physical reflections for metallic objects (like the TVs).
        Currently using a preset ("city"). 
        To use your own custom map:
        1. Place your .hdr file in the public folder (e.g., public/my-env.hdr).
        2. Replace the line below with: <Environment files="/my-env.hdr" />
      */}
      {debug.environment.studioHdri.visible && (
        <Environment
          files="/monochrome_studio_02_1k.hdr"
          environmentIntensity={debug.environment.studioHdri.environmentIntensity}
        />
      )}

      {/* Structural Room Components (These stay stationary) */}
      <InteriorDetails
        isNight={isNight}
        toggleNight={toggleNight}
        shadowConfig={shadowConfig}
        debug={debug}
      />
      <ExteriorRoof debug={debug} />
      <AnimatedDoor isOpen={isOpen} isNight={isNight} onClick={handleDoorClick} debug={debug} />

      {/* Keep the journey mounted so corridor debug controls are always available. */}
      <Suspense fallback={null}>
        <group visible={isOpen}>
          <JourneyScene scrollEnabled={isOpen && !isTransitioning} />
        </group>
      </Suspense>

      {/* The Loose Items (These get sucked into the portal) */}
      <group ref={itemsGroupRef}>

      </group>
    </>
  );
}
