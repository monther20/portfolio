"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { CORRIDOR, JOURNEY, windowProgressAt } from "../journeyConfig";
import { getJourneyState, setJourneyState } from "../journeyState";

const WINDOW_FRAME_TEXTURE = "/textures/textures/entrance/window_frame.png";
const WINDOW_LEFT_SIDE_TEXTURE =
  "/textures/textures/entrance/window_left_side.png";
const WINDOW_RIGHT_SIDE_TEXTURE =
  "/textures/textures/entrance/window_right_side.png";
const WINDOW_FRAME_SCALE = [1.34, 0.96, 1] as const;
const WINDOW_LEFT_PIVOT_X = -1.28;
const WINDOW_RIGHT_PIVOT_X = 1.27;
const WINDOW_PANE_OFFSET_X = 0.6;

const WINDOW_OPEN_ANGLE = 2.1;
/** The panes finish opening early in the window section, while the plane keeps flying. */
const WINDOW_FULLY_OPEN_AT_PROGRESS = 0.42;

type WindowImagePlaneProps = {
  name: string;
  textureUrl: string;
  height: number;
  position?: [number, number, number];
  scale?: [number, number, number] | readonly [number, number, number];
};

function WindowImagePlane({
  name,
  textureUrl,
  height,
  position = [0, 0, 0],
  scale = [1, 1, 1],
}: WindowImagePlaneProps) {
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  const width = useMemo(() => {
    const image = texture.image as HTMLImageElement | undefined;
    const aspect = image && image.height ? image.width / image.height : 1;
    return height * aspect;
  }, [height, texture]);

  return (
    <mesh name={name} position={position} scale={scale}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        side={THREE.DoubleSide}
        depthWrite
        depthTest
      />
    </mesh>
  );
}

/**
 * CorridorWindow — the window in the corridor's end wall. The panes are driven
 * by scroll position: stopping the scroll freezes them where they are, and the
 * airplane uses the same window progress to fly out through the opening.
 */
export default function CorridorWindow() {
  const leftPivot = useRef<THREE.Group>(null);
  const rightPivot = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    const progress = windowProgressAt(camera.position.z);
    const openProgress = THREE.MathUtils.smoothstep(
      progress,
      0,
      WINDOW_FULLY_OPEN_AT_PROGRESS,
    );

    if (leftPivot.current) {
      leftPivot.current.rotation.y = -WINDOW_OPEN_ANGLE * openProgress;
    }
    if (rightPivot.current) {
      rightPivot.current.rotation.y = WINDOW_OPEN_ANGLE * openProgress;
    }

    if (camera.position.z > JOURNEY.launchTriggerZ) return;

    const journey = getJourneyState();
    if (!journey.windowLaunched || journey.airplaneMode === "resting") {
      setJourneyState({ windowLaunched: true, airplaneMode: "launching" });
    }
  });

  const win = CORRIDOR.window;

  return (
    <group name="Corridor Window" position={[win.x, win.y, win.z]}>
      {/* New hand-drawn frame artwork around the opening. */}
      <WindowImagePlane
        name="Corridor Window Frame"
        textureUrl={WINDOW_FRAME_TEXTURE}
        height={win.height + 0.5}
        position={[0, 0, 0.09]}
        scale={WINDOW_FRAME_SCALE}
      />

      {/* Image-based casement sides, hinged at the outer edges. */}
      <group
        ref={leftPivot}
        name="Corridor Window Left Pivot"
        position={[WINDOW_LEFT_PIVOT_X, 0, 0.04]}
      >
        <WindowImagePlane
          name="Corridor Window Left Side"
          textureUrl={WINDOW_LEFT_SIDE_TEXTURE}
          height={win.height}
          position={[WINDOW_PANE_OFFSET_X, 0, 0]}
        />
      </group>
      <group
        ref={rightPivot}
        name="Corridor Window Right Pivot"
        position={[WINDOW_RIGHT_PIVOT_X, 0, 0.04]}
      >
        <WindowImagePlane
          name="Corridor Window Right Side"
          textureUrl={WINDOW_RIGHT_SIDE_TEXTURE}
          height={win.height}
          position={[-WINDOW_PANE_OFFSET_X, 0, 0]}
        />
      </group>
    </group>
  );
}
