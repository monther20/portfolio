"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";

import { seededRange } from "../../PartingItem";
import { BEACH } from "../../journeyConfig";

/**
 * Boardwalk — hand-made wooden planks over the sea, where the paper airplane
 * touches down. Slightly irregular placement keeps the sketchbook feel.
 */
export default function Boardwalk() {
  const plankGeometry = useMemo(() => new THREE.BoxGeometry(BEACH.boardwalk.width, 0.12, 0.68), []);
  const plankMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#f8f8f3" }), []);
  const postGeometry = useMemo(() => new THREE.BoxGeometry(0.14, 1.3, 0.14), []);
  const postMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#eeeeea" }), []);

  const planks = useMemo(() => {
    const out: { z: number; y: number; tilt: number }[] = [];
    for (let z = BEACH.boardwalk.startZ; z >= BEACH.boardwalk.endZ; z -= 0.62) {
      out.push({
        z,
        y: BEACH.boardwalk.topY - 0.05 + seededRange(`plank-${z}-y`, -0.012, 0.012),
        tilt: seededRange(`plank-${z}-tilt`, -0.02, 0.02),
      });
    }
    return out;
  }, []);

  const posts = useMemo(() => {
    const out: { z: number; x: number }[] = [];
    const railX = BEACH.boardwalk.width / 2 - 0.12;
    for (let z = BEACH.boardwalk.startZ - 0.6; z >= BEACH.boardwalk.endZ; z -= 3.6) {
      out.push({ z, x: BEACH.boardwalk.x - railX });
      out.push({ z, x: BEACH.boardwalk.x + railX });
    }
    return out;
  }, []);

  return (
    <group name="Beach Boardwalk">
      {planks.map((plank, index) => (
        <mesh
          key={`plank-${plank.z}`}
          name={`Boardwalk Plank ${index + 1}`}
          geometry={plankGeometry}
          material={plankMaterial}
          position={[BEACH.boardwalk.x, plank.y, plank.z]}
          rotation={[0, plank.tilt, 0]}
        >
          <Edges color="#111111" />
        </mesh>
      ))}
      {posts.map((post, index) => (
        <mesh
          key={`post-${post.x}-${post.z}`}
          name={`Boardwalk Post ${index + 1}`}
          geometry={postGeometry}
          material={postMaterial}
          position={[post.x, BEACH.boardwalk.topY - 0.75, post.z]}
        >
          <Edges color="#111111" />
        </mesh>
      ))}
    </group>
  );
}
