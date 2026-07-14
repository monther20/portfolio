"use client";

import React from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";

import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import { CORRIDOR, corridorStationZ } from "../journeyConfig";
import { corridor } from "@/data/portfolio";
import { corridorHingedWallSettings, hingedWallContentZ } from "./hingedWallSettings";
import { useTiledTexture } from "./useTiledTexture";

const C = "/textures/textures/corridor";

type CorridorStation = (typeof corridor.stations)[number];
type WallSide = CorridorStation["side"];

function inwardWallYaw(side: WallSide) {
  return -side * (Math.PI / 2);
}

function MiniWallSurface({ texture, title }: { texture: THREE.Texture; title: string }) {
  const meshRef = React.useRef<THREE.Mesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.scale.set(
      corridorHingedWallSettings.width,
      corridorHingedWallSettings.height,
      corridorHingedWallSettings.depth,
    );
    texture.repeat.set(
      corridorHingedWallSettings.textureRepeatX,
      corridorHingedWallSettings.textureRepeatY,
    );
  });

  return (
    <group name={`Station Hinged Mini Wall Surface: ${title}`}>
      <mesh
        ref={meshRef}
        name={`Station Hinged Mini Wall: ${title}`}
        scale={[
          corridorHingedWallSettings.width,
          corridorHingedWallSettings.height,
          corridorHingedWallSettings.depth,
        ]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

/**
 * A small wall segment placed flat on the corridor wall. When the visitor gets
 * close it rotates from the front/camera-side edge, like a hinged display wall,
 * so the image and notes face the camera instead of hiding on the side wall.
 */
function HingedMiniWall({
  side,
  z,
  name,
  children,
}: {
  side: WallSide;
  z: number;
  name: string;
  children: React.ReactNode;
}) {
  const hingeRef = React.useRef<THREE.Group>(null);
  const wallRef = React.useRef<THREE.Group>(null);
  const contentRef = React.useRef<THREE.Group>(null);
  const { camera } = useThree();
  const wallTexture = useTiledTexture(
    `${C}/wall_texture.webp`,
    corridorHingedWallSettings.textureRepeatX,
    corridorHingedWallSettings.textureRepeatY,
  );
  const baseYaw = inwardWallYaw(side);

  useFrame((_, delta) => {
    const hinge = hingeRef.current;
    if (!hinge) return;

    const settings = corridorHingedWallSettings;
    const dx = camera.position.x - side * settings.x;
    const dz = camera.position.z - z;
    const distance = Math.hypot(dx, dz);
    const proximity = 1 - THREE.MathUtils.smoothstep(distance, settings.fullyOpenDistance, settings.startOpenDistance);
    const targetYaw = baseYaw + side * (settings.restAngle + settings.openAngle * proximity);
    const lerp = 1 - Math.pow(settings.followDamping, delta);

    hinge.position.set(side * settings.x, settings.y, z + settings.width / 2);
    hinge.rotation.y = THREE.MathUtils.lerp(hinge.rotation.y, targetYaw, lerp);

    if (wallRef.current) {
      wallRef.current.position.set(-side * settings.width / 2, 0, 0);
    }
    if (contentRef.current) {
      contentRef.current.position.z = hingedWallContentZ();
    }
  });

  return (
    <group
      ref={hingeRef}
      name={name}
      position={[side * corridorHingedWallSettings.x, corridorHingedWallSettings.y, z + corridorHingedWallSettings.width / 2]}
      rotation={[0, baseYaw + side * corridorHingedWallSettings.restAngle, 0]}
    >
      {/* Offset from the hinge so rotation happens from the edge closest to the camera. */}
      <group ref={wallRef} name={`${name} Content Wall`} position={[-side * corridorHingedWallSettings.width / 2, 0, 0]}>
        <MiniWallSurface texture={wallTexture} title={name} />
        <group ref={contentRef} name={`${name} Display Content`} position={[0, 0, hingedWallContentZ()]}>
          {children}
        </group>
      </group>
    </group>
  );
}

function WallText({
  children,
  position,
  fontSize,
  maxWidth,
  color = "#2f2a22",
  weight = 600,
  rotation = 0,
}: {
  children: string;
  position: [number, number, number];
  fontSize: number;
  maxWidth: number;
  color?: string;
  weight?: number;
  rotation?: number;
}) {
  return (
    <Text
      position={position}
      rotation={[0, 0, rotation]}
      fontSize={fontSize}
      fontWeight={weight}
      color={color}
      maxWidth={maxWidth}
      lineHeight={1.12}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      sdfGlyphSize={128}
      outlineWidth={0.006}
      outlineColor="#fff8e6"
      outlineOpacity={0.8}
    >
      {children}
    </Text>
  );
}

/** Wall-mounted framed drawing with its handwritten notes placed around it. */
function InfoStation({
  station,
  z,
}: {
  station: CorridorStation;
  z: number;
}) {
  const side = station.side;

  return (
    <HingedMiniWall side={side} z={z} name={`Corridor Hinged Mini Wall: ${station.title}`}>
      <WallText
        position={[0, 2.25, 0]}
        fontSize={0.38}
        weight={700}
        maxWidth={3.25}
        rotation={side * -0.026}
      >
        {station.title}
      </WallText>

      <group name={`Corridor Station Frame: ${station.title}`} position={[0, 0.7, -0.01]}>
        <PaintSprite
          name={`Station Frame Border: ${station.title}`}
          sketch={`${C}/ramkanazdjecieduza.webp`}
          painted={`${C}/ramkanazdjecieduza_painted.webp`}
          billboard={false}
          height={1.86}
          revealNear={7}
          revealFar={15}
        />
        <PaintSprite
          name={`Station Artwork: ${station.title}`}
          sketch={station.art}
          billboard={false}
          position={[0, 0, 0.035]}
          height={1.36}
          revealNear={7}
          revealFar={15}
        />
      </group>

      <WallText
        position={[0, -1.8, 0]}
        fontSize={0.21}
        color="#453f35"
        maxWidth={3.35}
        rotation={side * 0.014}
      >
        {station.lines.join("\n")}
      </WallText>
    </HingedMiniWall>
  );
}

function WindowWallNote() {
  return (
    <group name="Corridor Window Wall Note" position={[-2.42, 0.46, CORRIDOR.endWallZ + 0.09]}>
      <mesh name="Corridor Window Note Paper Border" position={[0, 0, -0.025]}>
        <planeGeometry args={[1.65, 1.12]} />
        <meshBasicMaterial color="#8a6a3f" side={THREE.DoubleSide} />
      </mesh>
      <mesh name="Corridor Window Note Paper" position={[0, 0, -0.01]}>
        <planeGeometry args={[1.53, 1]} />
        <meshBasicMaterial color="#fff6df" side={THREE.DoubleSide} />
      </mesh>
      <FloatingNote
        name="Corridor Window Note"
        position={[0, 0.04, 0.05]}
        fontSize={1.02}
        weight={700}
        maxWidth={190}
        distanceFactor={6.2}
        rotation={-2}
      >
        {corridor.windowNote}
      </FloatingNote>
      <PaintSprite
        name="Corridor Window Arrow"
        sketch={`${C}/strzalka.webp`}
        billboard={false}
        position={[1.12, -0.52, 0.045]}
        height={0.46}
        revealNear={8}
        revealFar={16}
      />
    </group>
  );
}

/**
 * CorridorStations — the info stops along the corridor walls, the potted
 * props, ceiling lamps and the little vignette pointing at the window.
 */
export default function CorridorStations() {
  return (
    <group name="Corridor Stations">
      {corridor.stations.map((station, i) => (
        <InfoStation key={station.title} station={station} z={corridorStationZ(i)} />
      ))}

      {/* Props standing on the floor */}
      <PaintSprite
        name="Corridor Potted Tree"
        sketch={`${C}/drzewkowdoniczce.webp`}
        position={[2.6, CORRIDOR.floorY + 0.95, -38]}
        height={1.9}
        revealNear={8}
        revealFar={16}
      />
      <PaintSprite
        name="Corridor Potted Flower"
        sketch={`${C}/kwiatekwdoniczce.webp`}
        position={[-2.7, CORRIDOR.floorY + 0.55, -57]}
        height={1.1}
        revealNear={8}
        revealFar={16}
      />
      <PaintSprite
        name="Corridor Cabinet"
        sketch={`${C}/szafkaprzod.webp`}
        position={[2.7, CORRIDOR.floorY + 0.8, CORRIDOR.endWallZ + 11]}
        height={1.6}
        revealNear={8}
        revealFar={16}
      />

      {/* Vent flat on the right wall */}
      <group name="Corridor Vent" position={[CORRIDOR.halfWidth - 0.06, 1.6, -50]} rotation={[0, -Math.PI / 2, 0]}>
        <PaintSprite name="Corridor Vent Sprite" sketch={`${C}/kratkawentylacyjna.webp`} billboard={false} height={0.5} />
      </group>

      {/* Ceiling lamps with a warm pool of light under each */}
      {[-24, -38, -52, -66, CORRIDOR.endWallZ + 4].map((z) => (
        <group key={z} name={`Corridor Ceiling Lamp ${z}`} position={[0, 0, z]}>
          <PaintSprite
            name={`Corridor Ceiling Lamp Shade ${z}`}
            sketch={`${C}/bokilampy.webp`}
            position={[0, CORRIDOR.ceilY - 0.5, 0]}
            height={0.9}
          />
          <pointLight name={`Corridor Ceiling Lamp Light ${z}`} position={[0, 1.2, 0]} intensity={5} distance={9} decay={2} color="#ffe3b8" />
        </group>
      ))}

      {/* The table beside the window (the airplane rests above it) */}
      <PaintSprite
        name="Corridor Window Table"
        sketch="/textures/table.webp"
        position={[CORRIDOR.table.x, CORRIDOR.floorY + 1.15, CORRIDOR.table.z]}
        height={2.3}
        revealNear={9}
        revealFar={18}
      />

      {/* End vignette — pinned to the end wall beside the window. */}
      <WindowWallNote />
    </group>
  );
}
