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
const WIND_DETAIL_POINT_COUNT = 36;
const WIND_DETAIL_SEGMENT_POINTS = 11;

function createWindStroke(points: [number, number][]): Float32Array {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    "centripetal",
  );
  const sampled = curve.getPoints(WIND_DETAIL_POINT_COUNT - 1);
  return new Float32Array(sampled.flatMap((point) => [point.x, point.y, 0]));
}

/** Small pencil-like gusts that travel across the opening while the panes move. */
const WINDOW_WIND_STROKES = [
  createWindStroke([
    [-0.98, -0.48],
    [-0.56, -0.34],
    [-0.12, -0.43],
    [0.32, -0.2],
    [0.94, -0.3],
  ]),
  createWindStroke([
    [-1.02, 0.02],
    [-0.62, 0.2],
    [-0.18, 0.08],
    [0.3, 0.32],
    [0.98, 0.18],
  ]),
  createWindStroke([
    [-0.94, 0.55],
    [-0.5, 0.68],
    [-0.06, 0.52],
    [0.4, 0.69],
    [0.9, 0.57],
  ]),
] as const;

const corridorWindowMotionSettings = {
  openAngle: 2.1,
  /** Begin opening this many world units before the airplane launch point. */
  openLeadDistance: 8,
  /** The panes finish opening early while the plane keeps flying. */
  fullyOpenAtProgress: 0.42,
} as const;

/**
 * CorridorWindow — the window in the corridor's end wall. The panes are driven
 * by scroll position: stopping the scroll freezes them where they are, and the
 * airplane uses the same window progress to fly out through the opening.
 */
export default function CorridorWindow() {
  const leftPivot = useRef<THREE.Group>(null);
  const rightPivot = useRef<THREE.Group>(null);
  const windDetails = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    const settings = corridorWindowMotionSettings;
    const progress = windowProgressAt(
      camera.position.z - settings.openLeadDistance,
    );
    const openProgress = THREE.MathUtils.smoothstep(
      progress,
      0,
      settings.fullyOpenAtProgress,
    );

    if (leftPivot.current) {
      leftPivot.current.rotation.y = -settings.openAngle * openProgress;
    }
    if (rightPivot.current) {
      rightPivot.current.rotation.y = settings.openAngle * openProgress;
    }

    const windGroup = windDetails.current;
    if (windGroup) {
      // Fade in with the panes, linger after they finish opening, then ease
      // away while the airplane begins travelling through the window.
      const windOpacity =
        THREE.MathUtils.smoothstep(openProgress, 0.05, 0.3) *
        (1 - THREE.MathUtils.smoothstep(progress, 0.72, 1));
      windGroup.visible = windOpacity > 0.002;

      windGroup.children.forEach((child, index) => {
        if (!(child instanceof THREE.Line)) return;
        const travel =
          (state.clock.elapsedTime * (0.34 + index * 0.035) + index * 0.31) %
          1;
        const maxStart =
          WIND_DETAIL_POINT_COUNT - WIND_DETAIL_SEGMENT_POINTS;
        child.geometry.setDrawRange(
          Math.floor(travel * maxStart),
          WIND_DETAIL_SEGMENT_POINTS,
        );
        child.position.y =
          Math.sin(state.clock.elapsedTime * 2 + index * 1.7) * 0.014;

        const material = child.material as THREE.LineBasicMaterial;
        material.opacity =
          windOpacity *
          (0.42 + Math.sin(state.clock.elapsedTime * 3.1 + index) * 0.06);
      });
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
        width={
          (win.height + 0.5) *
          WINDOW_FRAME_IMAGE_ASPECT *
          WINDOW_FRAME_WIDTH_SCALE
        }
        height={(win.height + 0.5) * WINDOW_FRAME_HEIGHT_SCALE}
        depth={WINDOW_FRAME_DEPTH}
        position={[0, 0, WINDOW_FRAME_FRONT_Z - WINDOW_FRAME_DEPTH / 2]}
        horizontalBorderUv={0.11}
        verticalBorderUv={0.1}
        revealNear={8}
        revealFar={16}
      />

      {/* Animated curved gust marks appear only during the opening motion. */}
      <group
        ref={windDetails}
        name="Corridor Window Opening Wind Details"
        position={[0, 0, WINDOW_FRAME_FRONT_Z + 0.07]}
        visible={false}
      >
        {WINDOW_WIND_STROKES.map((points, index) => (
          <line key={`window-wind-${index}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[points, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#aaa69c"
              transparent
              opacity={0}
              depthWrite={false}
              fog
              toneMapped={false}
            />
          </line>
        ))}
      </group>

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
