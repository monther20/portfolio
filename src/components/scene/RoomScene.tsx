import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";

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
import DayNightLighting from "./dayNight/DayNightLighting";
import { AvatarTexturePreloader } from "./AnimatedAvatar";

const AVATAR_APPROACH_DISTANCE = 7;
const ENTRANCE_POSITION = [0.370000000000005, 1.06, 5.62] as const;
const ENTRANCE_LOOK = [0, 0.719, -15.9] as const;
const DETAIL_POSITION = [-3.5, 3.8, 2.5] as const;
const SHORT_LANDSCAPE_DETAIL_POSITION = [-3.5, 3.2, -1.0] as const;
const DETAIL_LOOK = [-5.55, -0.65, -9.65] as const;

export default function RoomScene({
  entryEnabled,
  isOpen,
  showRoomDetail,
  onDetailReturnComplete,
  onEnter,
  onTransitionComplete,
}: {
  entryEnabled: boolean;
  isOpen: boolean;
  showRoomDetail: boolean;
  onDetailReturnComplete: () => void;
  onEnter: () => void;
  onTransitionComplete: () => void;
}) {
  const [isTransitioning, setIsTransitioning] = useState(true);
  const debugRef = useRef<RoomDebugState>(null!);
  const detailWasOpen = useRef(false);
  const detailReturning = useRef(false);
  const { camera } = useThree();
  const responsive = useResponsiveExperience();

  if (!debugRef.current) {
    debugRef.current = createRoomDebugState();
  }

  const debug = debugRef.current;
  const sceneBackgroundColor = debug.scene.dayBackgroundColor;
  const sceneFogColor = debug.scene.dayFogColor;

  useEffect(() => {
    if (!isOpen) return;

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
    return () => {
      tl.kill();
    };
  }, [camera, isOpen, onTransitionComplete, responsive.reducedMotion]);

  useEffect(() => {
    if (isOpen) return; // The existing door transition owns the camera after entry.
    if (!showRoomDetail && !detailWasOpen.current && !detailReturning.current) return;
    detailWasOpen.current = showRoomDetail;
    detailReturning.current = !showRoomDetail;

    // The normal entrance stays centered on the door. A reversible detail view
    // gives the chair/table their own legible framing, especially on phones.
    const targetPosition = new THREE.Vector3(
      ...(showRoomDetail
        ? responsive.isShortLandscape
          ? SHORT_LANDSCAPE_DETAIL_POSITION
          : DETAIL_POSITION
        : ENTRANCE_POSITION),
    );
    const targetLook = new THREE.Vector3(
      ...(showRoomDetail ? DETAIL_LOOK : ENTRANCE_LOOK),
    );
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(targetPosition, targetLook, camera.up),
    );
    const startPosition = camera.position.clone();
    const startQuaternion = camera.quaternion.clone();
    const progress = { value: 0 };
    const tween = gsap.to(progress, {
      value: 1,
      duration: responsive.reducedMotion ? 0.01 : 1.45,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.position.copy(startPosition).lerp(targetPosition, progress.value);
        camera.quaternion.copy(startQuaternion).slerp(targetQuaternion, progress.value);
      },
      onComplete: () => {
        if (!showRoomDetail) {
          detailReturning.current = false;
          onDetailReturnComplete();
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [camera, isOpen, onDetailReturnComplete, responsive.isShortLandscape, responsive.reducedMotion, showRoomDetail]);

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
            files={ROOM_ENVIRONMENT_URL}
            environmentIntensity={
              debug.environment.studioHdri.environmentIntensity
            }
          />
        )}

      <AvatarTexturePreloader />
      <DayNightLighting debug={debug} />
      <InteriorDetails debug={debug} />
      <ExteriorRoof debug={debug} />
      <AnimatedDoor
        isOpen={isOpen}
        onClick={entryEnabled && !isOpen ? onEnter : undefined}
        debug={debug}
      />

      <JourneyScene
        scrollEnabled={isOpen && !isTransitioning}
        backgroundEnabled={isOpen}
      />
    </>
  );
}
