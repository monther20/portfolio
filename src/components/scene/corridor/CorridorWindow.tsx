"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import WrappedImageMesh from "../WrappedImageMesh";
import { CORRIDOR, JOURNEY, windowProgressAt } from "../journeyConfig";
import { getJourneyState, setJourneyState } from "../journeyState";

const WINDOW_FRAME_TEXTURE = "/textures/corridor/window/window_frame.png";
const WINDOW_LEFT_SIDE_TEXTURE =
  "/textures/corridor/window/window_left_side.png";
const WINDOW_RIGHT_SIDE_TEXTURE =
  "/textures/corridor/window/window_right_side.png";
const WINDOW_FRAME_IMAGE_ASPECT = 611 / 730;
const WINDOW_FRAME_WIDTH_SCALE = 1.34;
const WINDOW_FRAME_HEIGHT_SCALE = 0.96;
const WINDOW_FRAME_DEPTH = 0.045;
const WINDOW_FRAME_FRONT_Z = 0.09;
const WINDOW_LEFT_PIVOT_X = -1.28;
const WINDOW_RIGHT_PIVOT_X = 1.27;
const WINDOW_PANE_OFFSET_X = 0.6;
const WINDOW_LEFT_IMAGE_ASPECT = 371 / 690;
const WINDOW_RIGHT_IMAGE_ASPECT = 379 / 696;
const WINDOW_PANE_DEPTH = 0.055;

const WINDOW_OPEN_ANGLE = 2.1;
/** The panes finish opening early in the window section, while the plane keeps flying. */
const WINDOW_FULLY_OPEN_AT_PROGRESS = 0.42;

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
      {/* The hand-drawn frame wraps around a thin mesh like the picture frame. */}
      <WrappedImageMesh
        name="Corridor Window Frame"
        sketch={WINDOW_FRAME_TEXTURE}
        width={(win.height + 0.5) * WINDOW_FRAME_IMAGE_ASPECT * WINDOW_FRAME_WIDTH_SCALE}
        height={(win.height + 0.5) * WINDOW_FRAME_HEIGHT_SCALE}
        depth={WINDOW_FRAME_DEPTH}
        position={[0, 0, WINDOW_FRAME_FRONT_Z - WINDOW_FRAME_DEPTH / 2]}
        horizontalBorderUv={0.11}
        verticalBorderUv={0.1}
        revealNear={8}
        revealFar={16}
      />

      {/* Image-based casement sides, hinged at the outer edges. */}
      <group
        ref={leftPivot}
        name="Corridor Window Left Pivot"
        position={[WINDOW_LEFT_PIVOT_X, 0, 0.04]}
      >
        <WrappedImageMesh
          name="Corridor Window Left Side"
          sketch={WINDOW_LEFT_SIDE_TEXTURE}
          width={win.height * WINDOW_LEFT_IMAGE_ASPECT}
          height={win.height}
          depth={WINDOW_PANE_DEPTH}
          position={[WINDOW_PANE_OFFSET_X, 0, -WINDOW_PANE_DEPTH / 2]}
          horizontalBorderUv={0.11}
          verticalBorderUv={0.06}
          revealNear={8}
          revealFar={16}
        />
      </group>
      <group
        ref={rightPivot}
        name="Corridor Window Right Pivot"
        position={[WINDOW_RIGHT_PIVOT_X, 0, 0.04]}
      >
        <WrappedImageMesh
          name="Corridor Window Right Side"
          sketch={WINDOW_RIGHT_SIDE_TEXTURE}
          width={win.height * WINDOW_RIGHT_IMAGE_ASPECT}
          height={win.height}
          depth={WINDOW_PANE_DEPTH}
          position={[-WINDOW_PANE_OFFSET_X, 0, -WINDOW_PANE_DEPTH / 2]}
          horizontalBorderUv={0.11}
          verticalBorderUv={0.06}
          revealNear={8}
          revealFar={16}
        />
      </group>
    </group>
  );
}
