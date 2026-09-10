"use client";

import { useEffect, useMemo } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { useResponsiveExperience } from "../../ResponsiveExperience";
import { ROOM_FURNITURE_MODEL_URL } from "../assetPaths";

const CHAIR_SWAY_CLIP = "Chair_Rocking_Loop";
const CHAIR_ANIMATION_SPEED = 1.43;

const FURNITURE = {
  position: [-5.18, -3.02, -9.75] as [number, number, number],
  rotation: [0, 0.515407346410207, 0] as [number, number, number],
  scale: 3.43,
} as const;

/** The room's physical table and animated chair, authored as one GLB scene. */
export default function RoomFurniture() {
  const responsive = useResponsiveExperience();
  const gltf = useGLTF(ROOM_FURNITURE_MODEL_URL);
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, modelScene);

  useEffect(() => {
    const action = actions[CHAIR_SWAY_CLIP];
    if (!action || responsive.reducedMotion) return;

    action.reset();
    action.timeScale = CHAIR_ANIMATION_SPEED;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();

    return () => {
      action.stop();
    };
  }, [actions, responsive.reducedMotion]);

  return (
    <group
      name="Room Table and Swaying Chair"
      position={FURNITURE.position}
      rotation={FURNITURE.rotation}
      scale={FURNITURE.scale}
    >
      <primitive object={modelScene} />
    </group>
  );
}
