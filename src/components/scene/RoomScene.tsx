import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

import { Environment } from "@react-three/drei";
import ScrollCameraManager from "./ScrollCameraManager";
import AnimatedDoor from "./AnimatedDoor";
import ExteriorRoof from "./ExteriorRoof";
import InteriorDetails from "./InteriorDetails";
import { AirplaneModel } from "./PaperAirplane";

export default function RoomScene({
  onTransitionComplete,
}: {
  onTransitionComplete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const itemsGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const handleDoorClick = () => {
    if (isTransitioning) return;
    setIsOpen(true);
    setIsTransitioning(true);

    // Disable scrolling
    document.body.style.overflow = "hidden";

    const tl = gsap.timeline({
      onComplete: () => {
        onTransitionComplete();
      },
    });

    // Simply walk the camera straight out the door
    tl.to(
      camera.position,
      {
        x: 0,
        y: -1.5, // Keep the same height so it feels like walking
        z: -20, // Walk through the door (which is at -15.9)
        duration: 2.0,
        ease: "power2.inOut",
      },
      "+=0.5", // Start moving 0.5s after the door starts swinging open
    );
  };

  // We only mount ScrollCameraManager if we are NOT transitioning,
  // so GSAP can take over the camera completely.
  return (
    <>
      {!isTransitioning && <ScrollCameraManager isOpen={isOpen} />}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight
        position={[0, 30, -50]}
        intensity={1500}
        distance={150}
        color="#aaccff"
        decay={2}
      />
      <pointLight
        position={[0, -10, -100]}
        intensity={2500}
        distance={200}
        color="#ff9955"
        decay={2}
      />
      <fog attach="fog" args={["#000510", 30, 200]} />

      {/* 
        ENVIRONMENT MAP (HDRI)
        This provides physical reflections for metallic objects (like the TVs).
        Currently using a preset ("city"). 
        To use your own custom map:
        1. Place your .hdr file in the public folder (e.g., public/my-env.hdr).
        2. Replace the line below with: <Environment files="/my-env.hdr" />
      */}
      <Environment
        files="/monochrome_studio_02_2k.hdr"
        environmentIntensity={0.2}
      />

      {/* Structural Room Components (These stay stationary) */}
      <InteriorDetails />
      <ExteriorRoof />
      <AnimatedDoor isOpen={isOpen} onClick={handleDoorClick} />

      {/* The Loose Items (These get sucked into the portal) */}
      <group ref={itemsGroupRef}>
        
        {/* The Interactive Paper Airplane! */}
        {/* Sits on the floor as a paper airplane and gets sucked into the portal */}
        <AirplaneModel
          isFolded={true}
          position={[1, -5.9, -13]}
          rotation={[0, -Math.PI / 6, 0]}
          scale={0.4}
        />
      </group>
    </>
  );
}
