import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";

import ScrollCameraManager from "./ScrollCameraManager";
import AnimatedDoor from "./AnimatedDoor";
import ExteriorRoof from "./ExteriorRoof";
import InteriorDetails from "./InteriorDetails";
import PortalShader from "./PortalShader";
import { AirplaneModel } from "./PaperAirplane";

export default function RoomScene({ onTransitionComplete }: { onTransitionComplete: () => void }) {
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

    // 1. Let the door swing open (handled by AnimatedDoor internal useEffect, takes ~1.2s)
    // 2. Suck only the items in the room into the portal
    if (itemsGroupRef.current) {
      tl.to(
        itemsGroupRef.current.position,
        {
          x: 0,
          y: -1.5,
          z: -16.15,
          duration: 2.0,
          ease: "power3.in",
        },
        "+=1.0" // Start 1s after the door click
      );

      tl.to(
        itemsGroupRef.current.scale,
        {
          x: 0.0,
          y: 0.0,
          z: 0.0,
          duration: 2.0,
          ease: "power3.in",
        },
        "<" // Start at the same time as the position animation
      );
    }

    // 3. Suck the camera into the portal right at the end
    tl.to(
      camera.position,
      {
        x: 0,
        y: -1.505,
        z: -16.5, // Move slightly past the portal
        duration: 1.5,
        ease: "power2.in",
      },
      "-=1.0" // Start 1s before the room finishes shrinking
    );
  };

  // We only mount ScrollCameraManager if we are NOT transitioning, 
  // so GSAP can take over the camera completely.
  return (
    <>
      {!isTransitioning && <ScrollCameraManager isOpen={isOpen} />}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 30, -50]} intensity={1500} distance={150} color="#aaccff" decay={2} />
      <pointLight position={[0, -10, -100]} intensity={2500} distance={200} color="#ff9955" decay={2} />
      <fog attach="fog" args={["#000510", 30, 200]} />

      {/* The Magical Portal (Stays Stationary at Z=-16.15) */}
      <PortalShader position={[0, -1.505, -16.05]} isOpen={isTransitioning} />

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
