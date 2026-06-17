"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

export default function ExteriorRoof() {
  const baseTexture = useLoader(THREE.TextureLoader, "/textures/walls.png");

  const sideWallTexture = useMemo(() => {
    const t = baseTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 25);
    t.needsUpdate = true;
    return t;
  }, [baseTexture]);

  const topWallTexture = useMemo(() => {
    const t = baseTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 20);
    t.needsUpdate = true;
    return t;
  }, [baseTexture]);

  return (
    <>
      {/* The Partition Wall / Skyscraper Exterior Face */}
      <group position={[0, 0, -16.15]}>
        <mesh position={[-32.555, 20, 0]}>
          <boxGeometry args={[60, 100, 0.5]} />
          <meshStandardMaterial
            map={sideWallTexture}
            bumpMap={sideWallTexture}
            bumpScale={0.02}
            roughness={1}
            metalness={0}
            color="#ffffff"
          />
        </mesh>
        <mesh position={[32.555, 20, 0]}>
          <boxGeometry args={[60, 100, 0.5]} />
          <meshStandardMaterial
            map={sideWallTexture}
            bumpMap={sideWallTexture}
            bumpScale={0.02}
            roughness={1}
            metalness={0}
            color="#ffffff"
          />
        </mesh>
        <mesh position={[0, 42.49, 0]}>
          <boxGeometry args={[5.11, 79, 0.5]} />
          <meshStandardMaterial
            map={topWallTexture}
            bumpMap={topWallTexture}
            bumpScale={0.02}
            roughness={1}
            metalness={0}
            color="#ffffff"
          />
        </mesh>
      </group>

      {/* Skyscraper Roof Platform */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, -6.5, -56.15]}>
          <boxGeometry args={[120, 1, 80]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh position={[-59.5, -5, -56.15]}>
          <boxGeometry args={[1, 2, 80]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[59.5, -5, -56.15]}>
          <boxGeometry args={[1, 2, 80]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[0, -5, -95.65]}>
          <boxGeometry args={[120, 2, 1]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>

        {/* Roof Details */}
        <group position={[-35, -6, -40]}>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[14, 10, 16]} />
            <meshStandardMaterial color="#181818" />
          </mesh>
          <mesh position={[7.1, 3.5, 0]}>
            <boxGeometry args={[0.5, 7, 4]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
          <mesh position={[0, 11, 2]}>
            <boxGeometry args={[4, 2, 4]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        </group>

        {[-30, -50, -70].map((z, i) => (
          <group key={`sl2-${i}`} position={[25, -6, z]}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[10, 2, 14]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0, 2.25, 0]}>
              <boxGeometry args={[8, 0.5, 12]} />
              <meshStandardMaterial color="#2a3038" />
            </mesh>
          </group>
        ))}

        <group position={[40, -6, -40]}>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[10, 8, 10]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
          <mesh position={[-2.5, 8.5, 0]}>
            <cylinderGeometry args={[2, 2, 1, 16]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[2.5, 8.5, 0]}>
            <cylinderGeometry args={[2, 2, 1, 16]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>

        <group position={[35, -6, -65]}>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[10, 5, 6]} />
            <meshStandardMaterial color="#1c1c1c" />
          </mesh>
          <mesh position={[-2.5, 5.5, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 1, 16]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[2.5, 5.5, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 1, 16]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>

        {[-40, -45, -50].map((z, i) => (
          <mesh key={`small-ac-${i}`} position={[-25, -4.5, z]}>
            <boxGeometry args={[3, 3, 3]} />
            <meshStandardMaterial color="#1e1e1e" />
          </mesh>
        ))}

        <mesh position={[22, -5.5, -50]}>
          <boxGeometry args={[2, 1, 40]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
        <mesh position={[30, -5.5, -45]}>
          <boxGeometry args={[1.5, 1.5, 25]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[20, -5.5, -40]}>
          <boxGeometry args={[20, 1.5, 1.5]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Distant City Skyline */}
      <group position={[0, -100, -150]}>
        <mesh position={[-30, 0, 10]}>
          <boxGeometry args={[15, 60, 15]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
        <mesh position={[25, 10, -5]}>
          <boxGeometry args={[20, 80, 20]} />
          <meshStandardMaterial color="#070707" />
        </mesh>
        <mesh position={[-10, 5, -20]}>
          <boxGeometry args={[25, 90, 25]} />
          <meshStandardMaterial color="#030303" />
        </mesh>
        <mesh position={[45, -5, 15]}>
          <boxGeometry args={[12, 50, 12]} />
          <meshStandardMaterial color="#060606" />
        </mesh>
        <mesh position={[-50, 15, -10]}>
          <boxGeometry args={[18, 70, 18]} />
          <meshStandardMaterial color="#040404" />
        </mesh>
        <mesh position={[10, -15, 20]}>
          <boxGeometry args={[15, 40, 15]} />
          <meshStandardMaterial color="#080808" />
        </mesh>
      </group>
    </>
  );
}
