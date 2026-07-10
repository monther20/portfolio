"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";
import gsap from "gsap";

/** Billboard shadow sprite projected onto the back wall during night mode. */
export function WallShadow({
  texture,
  position,
  scale = 1,
  aspect = 1,
  isNight,
  maxOpacity = 0.35,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  scale?: number;
  aspect?: number;
  isNight: boolean;
  maxOpacity?: number;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const width = scale * aspect;
  const height = scale;

  useEffect(() => {
    if (!materialRef.current) return;

    gsap.to(materialRef.current, {
      opacity: isNight ? maxOpacity : 0,
      duration: 1.5,
      ease: "power2.inOut",
    });
  }, [isNight, maxOpacity]);

  return (
    <mesh position={position} renderOrder={20}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        color="#000000"
        transparent
        opacity={0}
        alphaTest={0.01}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Billboard sprite — stands on the floor and always faces the camera. */
export function FloorDecal({
  texture,
  position,
  scale = 1,
  aspect = 1,
  isNight,
  renderOrder = 0,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  scale?: number;
  aspect?: number;
  isNight: boolean;
  renderOrder?: number;
}) {
  const width = scale * aspect;
  const height = scale;
  const [x, y, z] = position;
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const geoRef = useRef<THREE.PlaneGeometry>(null);

  useEffect(() => {
    if (geoRef.current) {
      const normals = geoRef.current.attributes.normal;
      for (let i = 0; i < normals.count; i++) {
        // Point normals straight UP so they catch the overhead spotlights perfectly
        normals.setXYZ(i, 0, 1, 0);
      }
      normals.needsUpdate = true;
    }
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      const targetColor = new THREE.Color(isNight ? "#888899" : "#ffffff");
      gsap.to(materialRef.current.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight]);

  return (
    <Billboard
      position={[x, y + height / 2, z]}
      follow={true}
      lockX={false}
      lockY={true}
      lockZ={false}
    >
      {/* renderOrder ensures furniture always paints on top of wall shadows */}
      <mesh renderOrder={renderOrder}>
        <planeGeometry ref={geoRef} args={[width, height]} />
        <meshStandardMaterial
          ref={materialRef}
          map={texture}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </Billboard>
  );
}
