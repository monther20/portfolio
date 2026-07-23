"use client";

import * as THREE from "three";

import { useTiledTexture } from "./useTiledTexture";

const C = "/textures/corridor";

/** Extra clearance around the window so the camera never clips the wall. */
const HOLE_MARGIN = 0.15;

type CorridorShellDebug = {
  shellVisible: boolean;
  floorVisible: boolean;
  ceilingVisible: boolean;
  leftWallVisible: boolean;
  rightWallVisible: boolean;
  endWallVisible: boolean;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  startZ: number;
  endWallZ: number;
  halfWidth: number;
  floorY: number;
  ceilY: number;
  windowX: number;
  windowY: number;
  windowWidth: number;
  windowHeight: number;
  holeMargin: number;
  floorRepeatX: number;
  floorRepeatY: number;
  ceilingRepeatX: number;
  ceilingRepeatY: number;
  wallRepeatX: number;
  wallRepeatY: number;
  endWallRepeatX: number;
  endWallRepeatY: number;
  floorColor: string;
  ceilingColor: string;
  wallColor: string;
  opacity: number;
  wireframe: boolean;
};

const DEFAULT_DEBUG: CorridorShellDebug = {
  shellVisible: true,
  floorVisible: true,
  ceilingVisible: true,
  leftWallVisible: true,
  rightWallVisible: true,
  endWallVisible: true,
  positionX: 0,
  positionY: 0,
  positionZ: -0.16,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  startZ: -15.95,
  endWallZ: -115.025,
  halfWidth: 3.6,
  floorY: -3.2,
  ceilY: 2.8,
  windowX: -0.02,
  windowY: -0.32,
  windowWidth: 2.45,
  windowHeight: 2.19,
  holeMargin: HOLE_MARGIN,
  floorRepeatX: 2,
  floorRepeatY: 23.873493975903614,
  ceilingRepeatX: 2,
  ceilingRepeatY: 19.815,
  wallRepeatX: 19.815,
  wallRepeatY: 1.4,
  endWallRepeatX: 1.6,
  endWallRepeatY: 1.2,
  floorColor: "#ffffff",
  ceilingColor: "#ffffff",
  wallColor: "#ffffff",
  opacity: 1,
  wireframe: false,
};

/**
 * CorridorShell — floor, ceiling and walls of the entrance corridor, plus the
 * end wall built from four strips so it has a REAL hole where the window sits
 * (the camera flies through it after the launch).
 */
export default function CorridorShell() {
  const debug = DEFAULT_DEBUG;
  const length = Math.max(0.01, debug.startZ - debug.endWallZ);
  const floorTex = useTiledTexture(
    `${C}/floor_wood.webp`,
    debug.floorRepeatX,
    debug.floorRepeatY,
  );
  const ceilTex = useTiledTexture(
    `${C}/ceiling_texture.webp`,
    debug.ceilingRepeatX,
    debug.ceilingRepeatY,
  );
  const wallTex = useTiledTexture(
    `${C}/wall_texture.webp`,
    debug.wallRepeatX,
    debug.wallRepeatY,
  );
  const endWallTex = useTiledTexture(
    `${C}/wall_texture.webp`,
    debug.endWallRepeatX,
    debug.endWallRepeatY,
  );

  const centerZ = (debug.startZ + debug.endWallZ) / 2;
  const width = debug.halfWidth * 2;
  const wallHeight = Math.max(0.01, debug.ceilY - debug.floorY);
  const wallCenterY = (debug.ceilY + debug.floorY) / 2;

  // Clamp the debug hole to the end wall so no strip receives invalid geometry.
  const holeHalfWidth = debug.windowWidth / 2 + debug.holeMargin;
  const holeLeft = Math.max(-debug.halfWidth, debug.windowX - holeHalfWidth);
  const holeRight = Math.min(debug.halfWidth, debug.windowX + holeHalfWidth);
  const holeTop = Math.min(
    debug.ceilY,
    debug.windowY + debug.windowHeight / 2 + debug.holeMargin,
  );
  const holeBottom = Math.max(
    debug.floorY,
    debug.windowY - debug.windowHeight / 2 - debug.holeMargin,
  );
  const holeHeight = Math.max(0.01, holeTop - holeBottom);
  const holeCenterY = (holeTop + holeBottom) / 2;
  const topStripH = Math.max(0.01, debug.ceilY - holeTop);
  const bottomStripH = Math.max(0.01, holeBottom - debug.floorY);
  const leftStripW = Math.max(0.01, holeLeft + debug.halfWidth);
  const rightStripW = Math.max(0.01, debug.halfWidth - holeRight);
  const leftStripX = (-debug.halfWidth + holeLeft) / 2;
  const rightStripX = (holeRight + debug.halfWidth) / 2;
  const transparent = debug.opacity < 1;

  return (
    <group
      name="Corridor Shell"
      position={[debug.positionX, debug.positionY, debug.positionZ]}
      rotation={[debug.rotationX, debug.rotationY, debug.rotationZ]}
      scale={[debug.scaleX, debug.scaleY, debug.scaleZ]}
      visible={debug.shellVisible}
    >
      {/* Floor + ceiling */}
      <mesh
        name="Corridor Floor"
        position={[0, debug.floorY, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={debug.floorVisible}
      >
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial
          map={floorTex}
          color={debug.floorColor}
          opacity={debug.opacity}
          transparent={transparent}
          wireframe={debug.wireframe}
        />
      </mesh>
      <mesh
        name="Corridor Ceiling"
        position={[0, debug.ceilY, centerZ]}
        rotation={[Math.PI / 2, 0, 0]}
        visible={debug.ceilingVisible}
      >
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial
          map={ceilTex}
          color={debug.ceilingColor}
          opacity={debug.opacity}
          transparent={transparent}
          wireframe={debug.wireframe}
        />
      </mesh>

      {/* Side walls (facing inward) */}
      <mesh
        name="Corridor Left Wall"
        position={[-debug.halfWidth, wallCenterY, centerZ]}
        rotation={[0, Math.PI / 2, 0]}
        visible={debug.leftWallVisible}
      >
        <planeGeometry args={[length, wallHeight]} />
        <meshBasicMaterial
          map={wallTex}
          color={debug.wallColor}
          opacity={debug.opacity}
          transparent={transparent}
          wireframe={debug.wireframe}
        />
      </mesh>
      <mesh
        name="Corridor Right Wall"
        position={[debug.halfWidth, wallCenterY, centerZ]}
        rotation={[0, -Math.PI / 2, 0]}
        visible={debug.rightWallVisible}
      >
        <planeGeometry args={[length, wallHeight]} />
        <meshBasicMaterial
          map={wallTex}
          color={debug.wallColor}
          opacity={debug.opacity}
          transparent={transparent}
          wireframe={debug.wireframe}
        />
      </mesh>

      {/* End wall — four strips around the window hole */}
      <group
        name="Corridor End Wall"
        position={[0, 0, debug.endWallZ]}
        visible={debug.endWallVisible}
      >
        <mesh
          name="Corridor End Wall Top Strip"
          position={[0, holeTop + topStripH / 2, 0]}
        >
          <planeGeometry args={[width, topStripH]} />
          <meshBasicMaterial
            map={endWallTex}
            color={debug.wallColor}
            opacity={debug.opacity}
            transparent={transparent}
            wireframe={debug.wireframe}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          name="Corridor End Wall Bottom Strip"
          position={[0, debug.floorY + bottomStripH / 2, 0]}
        >
          <planeGeometry args={[width, bottomStripH]} />
          <meshBasicMaterial
            map={endWallTex}
            color={debug.wallColor}
            opacity={debug.opacity}
            transparent={transparent}
            wireframe={debug.wireframe}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          name="Corridor End Wall Left Strip"
          position={[leftStripX, holeCenterY, 0]}
        >
          <planeGeometry args={[leftStripW, holeHeight]} />
          <meshBasicMaterial
            map={endWallTex}
            color={debug.wallColor}
            opacity={debug.opacity}
            transparent={transparent}
            wireframe={debug.wireframe}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          name="Corridor End Wall Right Strip"
          position={[rightStripX, holeCenterY, 0]}
        >
          <planeGeometry args={[rightStripW, holeHeight]} />
          <meshBasicMaterial
            map={endWallTex}
            color={debug.wallColor}
            opacity={debug.opacity}
            transparent={transparent}
            wireframe={debug.wireframe}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
