"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { CORRIDOR, JOURNEY } from "../journeyConfig";
import { setJourneyState, useJourneyState } from "../journeyState";

const WINDOW_FRAME_TEXTURE = "/textures/textures/entrance/window_frame.png";
const WINDOW_LEFT_SIDE_TEXTURE = "/textures/textures/entrance/window_left_side.png";
const WINDOW_RIGHT_SIDE_TEXTURE = "/textures/textures/entrance/window_right_side.png";

type WindowImagePlaneProps = {
  name: string;
  textureUrl: string;
  height: number;
  position?: [number, number, number];
  renderOrder?: number;
};

function WindowImagePlane({
  name,
  textureUrl,
  height,
  position = [0, 0, 0],
  renderOrder = 0,
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
    <mesh name={name} position={position} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * CorridorWindow — the window in the corridor's end wall. When the camera
 * crosses the launch trigger the casement panes swing open and the paper
 * airplane is told to take off. Back-scrolling into the corridor closes it
 * so the launch can be replayed.
 */
export default function CorridorWindow() {
  const leftPivot = useRef<THREE.Group>(null);
  const rightPivot = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { windowLaunched } = useJourneyState();

  useFrame(() => {
    if (windowLaunched) return;
    if (camera.position.z > JOURNEY.launchTriggerZ) return;

    setJourneyState({ windowLaunched: true, airplaneMode: "launching" });
  });

  useEffect(() => {
    if (!leftPivot.current || !rightPivot.current) return;

    const leftTween = gsap.to(leftPivot.current.rotation, {
      y: windowLaunched ? -2.1 : 0,
      duration: windowLaunched ? 1.5 : 1,
      ease: "power2.inOut",
    });
    const rightTween = gsap.to(rightPivot.current.rotation, {
      y: windowLaunched ? 2.1 : 0,
      duration: windowLaunched ? 1.5 : 1,
      ease: "power2.inOut",
      delay: windowLaunched ? 0.08 : 0,
    });

    return () => {
      leftTween.kill();
      rightTween.kill();
    };
  }, [windowLaunched]);

  const win = CORRIDOR.window;
  const paneW = win.width / 2;

  return (
    <group name="Corridor Window" position={[win.x, win.y, win.z]}>
      {/* New hand-drawn frame artwork around the opening. */}
      <WindowImagePlane
        name="Corridor Window Frame"
        textureUrl={WINDOW_FRAME_TEXTURE}
        height={win.height + 0.5}
        position={[0, 0, 0.09]}
        renderOrder={12}
      />

      {/* Image-based casement sides, hinged at the outer edges. */}
      <group ref={leftPivot} name="Corridor Window Left Pivot" position={[-win.width / 2, 0, 0.04]}>
        <WindowImagePlane
          name="Corridor Window Left Side"
          textureUrl={WINDOW_LEFT_SIDE_TEXTURE}
          height={win.height}
          position={[paneW / 2, 0, 0]}
          renderOrder={10}
        />
      </group>
      <group ref={rightPivot} name="Corridor Window Right Pivot" position={[win.width / 2, 0, 0.04]}>
        <WindowImagePlane
          name="Corridor Window Right Side"
          textureUrl={WINDOW_RIGHT_SIDE_TEXTURE}
          height={win.height}
          position={[-paneW / 2, 0, 0]}
          renderOrder={10}
        />
      </group>
    </group>
  );
}
