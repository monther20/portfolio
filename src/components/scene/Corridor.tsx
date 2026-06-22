"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import SideDoor from "./SideDoor";

// ─── Corridor Dimensions ───────────────────────────────────────────────────
const CORRIDOR_HEIGHT = 3.5;
const CORRIDOR_WIDTH = 7;
const SEGMENT_LENGTH = 40; // Length of each generated block

const FLOOR_Y = -1.5 - CORRIDOR_HEIGHT / 2;
const CEILING_Y = -1.5 + CORRIDOR_HEIGHT / 2;
const WALL_CENTER_Y = -1.5;
const HALF_W = CORRIDOR_WIDTH / 2;

// ─── Single Corridor Segment ───────────────────────────────────────────────
function CorridorSegment({
  zStart,
  floorTex,
  wallTexL,
  wallTexR,
  ceilTex,
  bbTexL,
  bbTexR,
  floorEdgeTexL,
  floorEdgeTexR,
  lampTex,
}: {
  zStart: number;
  [key: string]: any;
}) {
  const zCenter = zStart - SEGMENT_LENGTH / 2;

  // Generate lamps for this segment (every 10 units)
  const lamps = useMemo(() => {
    const l = [];
    for (let i = 0; i < SEGMENT_LENGTH; i += 10) {
      const z = zStart - i - 5;
      const side = Math.abs(Math.round(z)) % 20 < 10 ? "left" : "right";
      l.push({ x: side === "left" ? -HALF_W + 0.1 : HALF_W - 0.1, z, side });
    }
    return l;
  }, [zStart]);

  return (
    <group>
      {/* ── Floor ── */}
      <mesh position={[0, FLOOR_Y, zCenter]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CORRIDOR_WIDTH, SEGMENT_LENGTH]} />
        <meshBasicMaterial map={floorTex} color="#e0e0e0" />
      </mesh>

      {/* Floor edges */}
      <mesh position={[-HALF_W + 0.2, FLOOR_Y + 0.001, zCenter]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, SEGMENT_LENGTH]} />
        <meshBasicMaterial map={floorEdgeTexL} color="#e0e0e0" transparent alphaTest={0.05} />
      </mesh>
      <mesh position={[HALF_W - 0.2, FLOOR_Y + 0.001, zCenter]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, SEGMENT_LENGTH]} />
        <meshBasicMaterial map={floorEdgeTexR} color="#e0e0e0" transparent alphaTest={0.05} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, CEILING_Y, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CORRIDOR_WIDTH, SEGMENT_LENGTH]} />
        <meshBasicMaterial map={ceilTex} color="#d8d8d8" />
      </mesh>

      {/* ── Walls ── */}
      <mesh position={[-HALF_W, WALL_CENTER_Y, zCenter]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, CORRIDOR_HEIGHT]} />
        <meshBasicMaterial map={wallTexL} color="#e0e0e0" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[HALF_W, WALL_CENTER_Y, zCenter]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, CORRIDOR_HEIGHT]} />
        <meshBasicMaterial map={wallTexR} color="#e0e0e0" side={THREE.DoubleSide} />
      </mesh>

      {/* ── Baseboards ── */}
      <mesh position={[-HALF_W + 0.01, FLOOR_Y + 0.075, zCenter]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, 0.15]} />
        <meshBasicMaterial map={bbTexL} color="#e0e0e0" />
      </mesh>
      <mesh position={[HALF_W - 0.01, FLOOR_Y + 0.075, zCenter]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, 0.15]} />
        <meshBasicMaterial map={bbTexR} color="#e0e0e0" />
      </mesh>

      {/* ── Side Doors ── */}
      {/* Positioned along the segment walls. Offsets are relative to zCenter. */}
      {/* y position = FLOOR_Y + (doorHeight / 2). doorHeight is 2.5, so 1.25. FLOOR_Y is -3.25. -3.25 + 1.25 = -2.0. Let's position at y = -2 */}
      <SideDoor type="about" side="left" position={[-HALF_W + 0.01, -2.0, zCenter + 12]} />
      <SideDoor type="projects" side="right" position={[HALF_W - 0.01, -2.0, zCenter + 4]} />
      <SideDoor type="contact" side="left" position={[-HALF_W + 0.01, -2.0, zCenter - 4]} />
      <SideDoor type="social" side="right" position={[HALF_W - 0.01, -2.0, zCenter - 12]} />

      {/* ── Lamps & Lights ── */}
      {lamps.map((lamp, i) => (
        <group key={i}>
          <Billboard
            position={[lamp.x, WALL_CENTER_Y + 0.8, lamp.z]}
            follow={false}
            lockX={false}
            lockY={true}
            lockZ={false}
          >
            <mesh>
              <planeGeometry args={[0.6, 1.4]} />
              <meshBasicMaterial map={lampTex} transparent alphaTest={0.01} depthWrite={false} />
            </mesh>
          </Billboard>
          <pointLight
            position={[0, CEILING_Y - 0.3, lamp.z]}
            intensity={12}
            distance={12}
            color="#fffaf0"
            decay={2}
          />
        </group>
      ))}
    </group>
  );
}

// ─── Infinite Corridor Manager ─────────────────────────────────────────────
export default function Corridor() {
  const [segmentBase, setSegmentBase] = useState(-16); // Start just past the door

  const baseFloorTex = useLoader(THREE.TextureLoader, "/textures/textures/corridor/floor_wood.webp");
  const baseWallTex  = useLoader(THREE.TextureLoader, "/textures/textures/corridor/wall_texture.webp");
  const baseCeilTex  = useLoader(THREE.TextureLoader, "/textures/textures/corridor/ceiling_texture.webp");
  const lampTex      = useLoader(THREE.TextureLoader, "/textures/textures/corridor/bokilampy.webp");
  const baseboardTex = useLoader(THREE.TextureLoader, "/textures/textures/corridor/texturadoprogow.webp");
  const floorEdgeTex = useLoader(THREE.TextureLoader, "/textures/textures/corridor/zakonczeniepodlogi.webp");

  // Tile textures based on SEGMENT_LENGTH so they align seamlessly between blocks
  const floorTex = useMemo(() => {
    const t = baseFloorTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, SEGMENT_LENGTH / 3);
    t.needsUpdate = true;
    return t;
  }, [baseFloorTex]);

  const wallTexL = useMemo(() => {
    const t = baseWallTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SEGMENT_LENGTH / 3, CORRIDOR_HEIGHT / 2);
    t.needsUpdate = true;
    return t;
  }, [baseWallTex]);

  const wallTexR = useMemo(() => {
    const t = baseWallTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SEGMENT_LENGTH / 3, CORRIDOR_HEIGHT / 2);
    t.needsUpdate = true;
    return t;
  }, [baseWallTex]);

  const ceilTex = useMemo(() => {
    const t = baseCeilTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, SEGMENT_LENGTH / 3);
    t.needsUpdate = true;
    return t;
  }, [baseCeilTex]);

  const bbTexL = useMemo(() => {
    const t = baseboardTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SEGMENT_LENGTH / 2.5, 1);
    t.needsUpdate = true;
    return t;
  }, [baseboardTex]);

  const bbTexR = useMemo(() => {
    const t = baseboardTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SEGMENT_LENGTH / 2.5, 1);
    t.needsUpdate = true;
    return t;
  }, [baseboardTex]);

  const floorEdgeTexL = useMemo(() => {
    const t = floorEdgeTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SEGMENT_LENGTH / 3, 1);
    t.needsUpdate = true;
    return t;
  }, [floorEdgeTex]);

  const floorEdgeTexR = useMemo(() => {
    const t = floorEdgeTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SEGMENT_LENGTH / 3, 1);
    t.needsUpdate = true;
    return t;
  }, [floorEdgeTex]);

  // Dynamically update segmentBase to track camera
  useFrame(({ camera }) => {
    const newBase = Math.floor(camera.position.z / SEGMENT_LENGTH) * SEGMENT_LENGTH;
    if (newBase !== segmentBase) {
      setSegmentBase(newBase);
    }
  });

  // Generate 5 segments around the camera (-2, -1, 0, 1, 2)
  const segments = useMemo(() => {
    const result = [];
    for (let i = -2; i <= 2; i++) {
      // Offset by -16 so the grid aligns with the door opening at z=-16
      result.push(segmentBase + i * SEGMENT_LENGTH);
    }
    return result;
  }, [segmentBase]);

  return (
    <group>
      {segments.map((zStart) => (
        // Only render segments behind the door (z < -15)
        zStart < -15 && (
          <CorridorSegment
            key={zStart}
            zStart={zStart}
            floorTex={floorTex}
            wallTexL={wallTexL}
            wallTexR={wallTexR}
            ceilTex={ceilTex}
            bbTexL={bbTexL}
            bbTexR={bbTexR}
            floorEdgeTexL={floorEdgeTexL}
            floorEdgeTexR={floorEdgeTexR}
            lampTex={lampTex}
          />
        )
      ))}
    </group>
  );
}
