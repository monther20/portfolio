"use client";

import React, { useRef, useState } from "react";
import * as THREE from "three";
import { useLoader, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { Text } from "@react-three/drei";

type DoorType = "about" | "projects" | "contact" | "social";

export default function SideDoor({
  type,
  side,
  position,
}: {
  type: DoorType;
  side: "left" | "right";
  position: [number, number, number];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const doorGroupRef = useRef<THREE.Group>(null);
  const mainGroupRef = useRef<THREE.Group>(null);

  // ─── Dimensions ────────────────────────────────────────────────────────────
  const doorHeight = 2.5;
  const doorWidth = 1.4;
  const frameHeight = 2.6;
  const frameWidth = 1.5;

  // ─── Load Textures ─────────────────────────────────────────────────────────
  const texMap: Record<DoorType, { sketch: string; painted: string }> = {
    about: { sketch: "drzwiabout", painted: "drzwiabout_painted" },
    projects: { sketch: "drzwiprojekty", painted: "drzwiprojekty_painted" },
    contact: { sketch: "drzwikontakt", painted: "drzwikontakt_painted" },
    social: { sketch: "drzwisocial", painted: "drzwisocial_painted" },
  };

  const frameTexture = useLoader(THREE.TextureLoader, "/textures/textures/corridor/doors/frame_sketch.webp");
  const sketchTexture = useLoader(THREE.TextureLoader, `/textures/textures/corridor/doors/${texMap[type].sketch}.webp`);
  const paintedTexture = useLoader(THREE.TextureLoader, `/textures/textures/corridor/doors/${texMap[type].painted}.webp`);

  // ─── Interaction ───────────────────────────────────────────────────────────
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!doorGroupRef.current) return;

    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    const openAngle = side === "left" ? Math.PI / 2 : -Math.PI / 2;
    gsap.to(doorGroupRef.current.rotation, {
      y: newIsOpen ? openAngle : 0,
      duration: 1.0,
      ease: "power2.inOut",
    });
  };

  // ─── Dynamic Lean & Camera Look ────────────────────────────────────────────
  const baseRotationY = side === "left" ? Math.PI / 2 : -Math.PI / 2;
  const currentTilt = useRef(0);
  const { camera } = useThree();

  useFrame(() => {
    if (!mainGroupRef.current) return;

    // The distance between camera Z and door Z
    // (Camera starts at positive Z and scrolls into negative Z)
    const dz = camera.position.z - position[2];
    
    // 1. WALL LEAN LOGIC
    // Base tilt is small. Max tilt happens when close.
    let targetTilt = 0.02; // Base tilt
    
    // If the camera is approaching the door (dz is positive and within 15 units)
    if (dz > 0 && dz < 15) {
      const t = (15 - dz) / 13; // 0 at dz=15, 1 at dz=2
      const easedT = t < 0 ? 0 : t > 1 ? 1 : t * (2 - t);
      targetTilt = 0.02 + (0.18 * easedT); // Up to 0.20 rad (~11 degrees)
    } else if (dz <= 0) {
      // Camera is past the door
      targetTilt = 0.20;
    }

    currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt, 0.06);
    const tiltDirection = side === "left" ? -1 : 1;
    mainGroupRef.current.rotation.y = baseRotationY + (currentTilt.current * tiltDirection);

    // 2. CAMERA LOOK LOGIC
    // We only want the camera to look at the door if it's the *closest* door.
    // If dz is between 0 and 10, gently steer the camera yaw.
    if (dz > 0 && dz < 8) {
      // Calculate how much to steer the camera (yaw). Left door -> steer left (positive rotation.y), Right door -> steer right (negative rotation.y)
      const lookStrength = 0.15; // Max radians to turn camera
      const lookDirection = side === "left" ? lookStrength : -lookStrength;
      
      // Ramp up the look effect as we get closer, peaking at dz=3, then fading out at dz=0
      let weight = 0;
      if (dz > 3) {
        weight = 1 - ((dz - 3) / 5); // 0 at dz=8, 1 at dz=3
      } else {
        weight = dz / 3; // 1 at dz=3, 0 at dz=0
      }
      
      const targetCameraYaw = lookDirection * weight;
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetCameraYaw, 0.05);
    }
  });

  // ─── Geometry Positioning ──────────────────────────────────────────────────
  const pivotX = side === "left" ? -doorWidth / 2 : doorWidth / 2;
  const meshX = side === "left" ? doorWidth / 2 : -doorWidth / 2;
  const labelText = type.toUpperCase();
  const doorScale = isHovered && !isOpen ? 1.03 : 1;

  return (
    <group ref={mainGroupRef} position={position} rotation={[0, baseRotationY, 0]}>
      
      {/* ── Label (Floats above the door) ── */}
      <group position={[0, doorHeight / 2 + 0.4, 0.05]}>
        {/* We use a standard font for now instead of relying on the custom one which might not be loaded properly in Next */}
        <Text fontSize={0.18} color="#111" anchorX="center" anchorY="middle">
          {labelText}
        </Text>
      </group>

      {/* ── Frame ── */}
      <mesh position={[0, 0, 0.01]} scale={[side === "right" ? -1 : 1, 1, 1]}>
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshBasicMaterial
          map={frameTexture}
          transparent
          alphaTest={0.1}
          color="#e0e0e0"
        />
      </mesh>

      {/* ── Swinging Door Group ── */}
      {/* Positioned slightly in front of the frame to avoid z-fighting */}
      <group ref={doorGroupRef} position={[pivotX, 0, 0.03]}>
        
        <group
          position={[meshX, 0, 0]}
          scale={[side === "right" ? -1 : 1, 1, 1]}
          onClick={handleClick}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setIsHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setIsHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          {/* Animated Scale Wrapper for hover effect */}
          <group scale={[doorScale, doorScale, 1]}>
            
            {/* Painted Layer (Background) */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[doorWidth, doorHeight]} />
              <meshBasicMaterial
                map={paintedTexture}
                transparent
                alphaTest={0.5}
                color="#e0e0e0"
              />
            </mesh>

            {/* Sketch Layer (Foreground) */}
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[doorWidth, doorHeight]} />
              <meshBasicMaterial
                map={sketchTexture}
                transparent
                alphaTest={0.1}
                color="#e0e0e0"
                // On hover, we could hide the sketch layer to reveal the painted one
                opacity={isHovered ? 0 : 1} 
              />
            </mesh>

          </group>
        </group>
      </group>

    </group>
  );
}
