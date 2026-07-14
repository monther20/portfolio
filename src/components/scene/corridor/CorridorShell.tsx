"use client";

import * as THREE from "three";

import { CORRIDOR } from "../journeyConfig";
import { useTiledTexture } from "./useTiledTexture";

const C = "/textures/textures/corridor";

/** Extra clearance around the window so the camera never clips the wall. */
const HOLE_MARGIN = 0.15;

/**
 * CorridorShell — floor, ceiling and walls of the entrance corridor, plus the
 * end wall built from four strips so it has a REAL hole where the window sits
 * (the camera flies through it after the launch).
 */
export default function CorridorShell() {
  const length = CORRIDOR.startZ - CORRIDOR.endWallZ;
  const floorTex = useTiledTexture(`${C}/floor_wood.webp`, 2, length / 4.15);
  const ceilTex = useTiledTexture(`${C}/ceiling_texture.webp`, 2, length / 5);
  const wallTex = useTiledTexture(`${C}/wall_texture.webp`, length / 5, 1.4);
  const endWallTex = useTiledTexture(`${C}/wall_texture.webp`, 1.6, 1.2);

  const centerZ = (CORRIDOR.startZ + CORRIDOR.endWallZ) / 2;
  const width = CORRIDOR.halfWidth * 2;
  const wallHeight = CORRIDOR.ceilY - CORRIDOR.floorY;
  const wallCenterY = (CORRIDOR.ceilY + CORRIDOR.floorY) / 2;

  // The hole in the end wall, slightly larger than the window artwork.
  const hole = {
    halfW: CORRIDOR.window.width / 2 + HOLE_MARGIN,
    top: CORRIDOR.window.y + CORRIDOR.window.height / 2 + HOLE_MARGIN,
    bottom: CORRIDOR.window.y - CORRIDOR.window.height / 2 - HOLE_MARGIN,
  };
  const topStripH = CORRIDOR.ceilY - hole.top;
  const bottomStripH = hole.bottom - CORRIDOR.floorY;
  const sideStripW = CORRIDOR.halfWidth - hole.halfW;
  const holeCenterY = (hole.top + hole.bottom) / 2;

  return (
    <group name="Corridor Shell">
      {/* Floor + ceiling */}
      <mesh name="Corridor Floor" position={[0, CORRIDOR.floorY, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial map={floorTex} />
      </mesh>
      <mesh name="Corridor Ceiling" position={[0, CORRIDOR.ceilY, centerZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial map={ceilTex} />
      </mesh>

      {/* Side walls (facing inward) */}
      <mesh name="Corridor Left Wall" position={[-CORRIDOR.halfWidth, wallCenterY, centerZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[length, wallHeight]} />
        <meshBasicMaterial map={wallTex} />
      </mesh>
      <mesh name="Corridor Right Wall" position={[CORRIDOR.halfWidth, wallCenterY, centerZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[length, wallHeight]} />
        <meshBasicMaterial map={wallTex} />
      </mesh>

      {/* End wall — four strips around the window hole */}
      <group name="Corridor End Wall" position={[0, 0, CORRIDOR.endWallZ]}>
        <mesh name="Corridor End Wall Top Strip" position={[0, hole.top + topStripH / 2, 0]}>
          <planeGeometry args={[width, topStripH]} />
          <meshBasicMaterial map={endWallTex} side={THREE.DoubleSide} />
        </mesh>
        <mesh name="Corridor End Wall Bottom Strip" position={[0, CORRIDOR.floorY + bottomStripH / 2, 0]}>
          <planeGeometry args={[width, bottomStripH]} />
          <meshBasicMaterial map={endWallTex} side={THREE.DoubleSide} />
        </mesh>
        <mesh name="Corridor End Wall Left Strip" position={[-(hole.halfW + sideStripW / 2), holeCenterY, 0]}>
          <planeGeometry args={[sideStripW, hole.top - hole.bottom]} />
          <meshBasicMaterial map={endWallTex} side={THREE.DoubleSide} />
        </mesh>
        <mesh name="Corridor End Wall Right Strip" position={[hole.halfW + sideStripW / 2, holeCenterY, 0]}>
          <planeGeometry args={[sideStripW, hole.top - hole.bottom]} />
          <meshBasicMaterial map={endWallTex} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
