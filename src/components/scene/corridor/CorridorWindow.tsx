"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import gsap from "gsap";

import PaintSprite from "../PaintSprite";
import { CORRIDOR, JOURNEY } from "../journeyConfig";
import { setJourneyState, useJourneyState } from "../journeyState";

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
      {/* Hand-drawn frame around the opening */}
      <PaintSprite
        name="Corridor Window Frame"
        sketch="/textures/textures/entrance/window_sketch.webp"
        billboard={false}
        height={win.height + 0.5}
        revealNear={10}
        revealFar={24}
      />

      {/* Casement panes, hinged at the outer edges */}
      <group ref={leftPivot} name="Corridor Window Left Pivot" position={[-win.width / 2, 0, 0.06]}>
        <mesh name="Corridor Window Left Pane" position={[paneW / 2, 0, 0]}>
          <planeGeometry args={[paneW, win.height]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          <Edges color="#8e8a82" />
        </mesh>
      </group>
      <group ref={rightPivot} name="Corridor Window Right Pivot" position={[win.width / 2, 0, 0.06]}>
        <mesh name="Corridor Window Right Pane" position={[-paneW / 2, 0, 0]}>
          <planeGeometry args={[paneW, win.height]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          <Edges color="#8e8a82" />
        </mesh>
      </group>
    </group>
  );
}
