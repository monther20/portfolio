"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";

/** Billboard sprite — stands on the floor and always faces the camera. */
export function FloorDecal({
  texture,
  position,
  scale = 1,
  aspect = 1,
  renderOrder = 0,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  scale?: number;
  aspect?: number;
  renderOrder?: number;
}) {
  const width = scale * aspect;
  const height = scale;
  const [x, y, z] = position;
  const geoRef = useRef<THREE.PlaneGeometry>(null);

  useEffect(() => {
    if (geoRef.current) {
      const normals = geoRef.current.attributes.normal;
      for (let i = 0; i < normals.count; i++) {
        // Keep the authored upward normals: plants catch the lanterns above them.
        normals.setXYZ(i, 0, 1, 0);
      }
      normals.needsUpdate = true;
    }
  }, []);

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
