"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";
import gsap from "gsap";

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
