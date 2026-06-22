import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

import { Environment } from "@react-three/drei";
import ScrollCameraManager from "./ScrollCameraManager";
import AnimatedDoor from "./AnimatedDoor";
import ExteriorRoof from "./ExteriorRoof";
import InteriorDetails from "./InteriorDetails";
import Corridor from "./Corridor";

export default function RoomScene({
  onTransitionComplete,
}: {
  onTransitionComplete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const itemsGroupRef = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();

  const toggleNight = () => setIsNight(!isNight);

  useEffect(() => {
      const targetColor = new THREE.Color(isNight ? "#555566" : "#c0c0c0");
    if (scene.background instanceof THREE.Color) {
      gsap.to(scene.background, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
      });
    }
    if (scene.fog instanceof THREE.Fog) {
      gsap.to(scene.fog.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
      });
    }
  }, [isNight, scene]);

  const handleDoorClick = () => {
    if (isTransitioning) return;
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

    // Walk the camera through the door and into the corridor
    tl.to(
      camera.position,
      {
        x: 0,
        y: -1.5,
        z: -50, // Walk through the door and deep into the corridor
        duration: 3.5,
        ease: "power2.inOut",
      },
      "+=0.5",
    );
  };

  // We only mount ScrollCameraManager if we are NOT transitioning,
  // so GSAP can take over the camera completely.
  return (
    <>
      {!isTransitioning && <ScrollCameraManager isOpen={isOpen} />}

      {/* Lighting */}
      <ambientLight intensity={isNight ? 0.3 : 0.4} />
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
      <color attach="background" args={["#c0c0c0"]} />
      <fog attach="fog" args={["#c0c0c0", 5, 40]} />

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
      <InteriorDetails isNight={isNight} toggleNight={toggleNight} />
      <ExteriorRoof />
      <AnimatedDoor isOpen={isOpen} isNight={isNight} onClick={handleDoorClick} />

      {/* Corridor — hidden behind the wall, revealed when door opens */}
      <Corridor />

      {/* The Loose Items (These get sucked into the portal) */}
      <group ref={itemsGroupRef}>
        
      </group>
    </>
  );
}
