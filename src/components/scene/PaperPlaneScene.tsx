"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { AirplaneModel } from "./PaperAirplane";

export default function PaperPlaneScene() {
  const { camera } = useThree();
  const planeRef = useRef<THREE.Group>(null);

  // Initialize camera for the new scene
  React.useEffect(() => {
    // Reset camera position and allow scrolling to control it
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 0, 0);
    // Reset scroll position so we start at the top
    window.scrollTo(0, 0);
    document.body.style.overflow = "auto";
    document.body.style.height = "500vh"; // Enable scrollable height for flying
    
    // Hide scrollbars dynamically while keeping scroll functionality
    document.body.style.scrollbarWidth = "none"; // Firefox
    document.body.style.msOverflowStyle = "none"; // IE/Edge
    
    // For Webkit (Chrome/Safari/Edge), we inject a style tag
    const style = document.createElement("style");
    style.id = "hide-scrollbar-style";
    style.innerHTML = `
      html::-webkit-scrollbar, body::-webkit-scrollbar { 
        display: none !important; 
        width: 0 !important; 
        background: transparent !important; 
      }
      html, body {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup when unmounting
      document.body.style.overflow = "hidden";
      document.body.style.height = "auto";
      document.body.style.scrollbarWidth = "auto";
      document.body.style.msOverflowStyle = "auto";
      const styleEl = document.getElementById("hide-scrollbar-style");
      if (styleEl) styleEl.remove();
    };
  }, [camera]);

  useFrame(() => {
    // Calculate scroll progress (0 to 1)
    const scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

    // Fly the plane forward
    const flightDistance = -200; // How far the plane flies
    const currentZ = progress * flightDistance;

    if (planeRef.current) {
      planeRef.current.position.z = currentZ;
      // Add a slight banking/bobbing effect to the plane based on time and scroll
      planeRef.current.rotation.z = Math.sin(progress * Math.PI * 10) * 0.1;
      planeRef.current.position.y = Math.sin(progress * Math.PI * 8) * 0.5;
    }

    // Camera trails behind the plane
    camera.position.z = currentZ + 10;
    camera.position.y = 2 + Math.sin(progress * Math.PI * 4) * 0.2;
    camera.lookAt(0, 0, currentZ - 10);
  });

  return (
    <>
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#fff" />
      <fog attach="fog" args={["#e0f2fe", 10, 50]} />
      
      {/* A simple sky/cloud color background */}
      <color attach="background" args={["#e0f2fe"]} />

      <group ref={planeRef}>
        {/* The true origami Paper Airplane! */}
        {/* We rotate it 180 degrees around Y because our scene flies down the -Z axis */}
        <AirplaneModel 
          isFolded={true} 
          rotation={[0, Math.PI, 0]} 
          scale={0.3} 
        />
      </group>

    </>
  );
}
