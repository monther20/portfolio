"use client";

import React from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";

import PaintSprite from "../PaintSprite";
import {
  CORRIDOR,
  corridorLayoutZ,
  corridorStationInfluenceAt,
  corridorStationZ,
} from "../journeyConfig";
import CorridorCabinet from "./CorridorCabinet";
import CorridorPictureFrame from "./CorridorPictureFrame";
import { corridor } from "@/data/portfolio";
import {
  corridorHingedWallSettings,
  hingedWallContentZ,
} from "./hingedWallSettings";
import { useTiledTexture } from "./useTiledTexture";

const C = "/textures/corridor";
const HANDWRITTEN_FONT = "/fonts/Caveat-Variable.ttf";

type CorridorStation = (typeof corridor.stations)[number];
type WallSide = CorridorStation["side"];

function inwardWallYaw(side: WallSide) {
  return -side * (Math.PI / 2);
}

function MiniWallSurface({
  texture,
  title,
}: {
  texture: THREE.Texture;
  title: string;
}) {
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
 * A small wall segment placed flat on the corridor wall. After the preceding
 * section is passed, it leans gently from its camera-side edge and settles back
 * once the visitor passes it.
 */
function HingedMiniWall({
  side,
  z,
  index,
  name,
  children,
}: {
  side: WallSide;
  z: number;
  index: number;
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
    const influence = corridorStationInfluenceAt(index, camera.position.z);
    const targetYaw =
      baseYaw + side * (settings.restAngle + settings.openAngle * influence);
    const lerp = 1 - Math.pow(settings.followDamping, delta);

    hinge.position.set(side * settings.x, settings.y, z + settings.width / 2);
    hinge.rotation.y = THREE.MathUtils.lerp(hinge.rotation.y, targetYaw, lerp);

    if (wallRef.current) {
      wallRef.current.position.set((-side * settings.width) / 2, 0, 0);
    }
    if (contentRef.current) {
      contentRef.current.position.z = hingedWallContentZ();
    }
  });

  return (
    <group
      ref={hingeRef}
      name={name}
      position={[
        side * corridorHingedWallSettings.x,
        corridorHingedWallSettings.y,
        z + corridorHingedWallSettings.width / 2,
      ]}
      rotation={[0, baseYaw + side * corridorHingedWallSettings.restAngle, 0]}
    >
      {/* Offset from the hinge so rotation happens from the edge closest to the camera. */}
      <group
        ref={wallRef}
        name={`${name} Content Wall`}
        position={[(-side * corridorHingedWallSettings.width) / 2, 0, 0]}
      >
        <MiniWallSurface texture={wallTexture} title={name} />
        <group
          ref={contentRef}
          name={`${name} Display Content`}
          position={[0, 0, hingedWallContentZ()]}
        >
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
      font={HANDWRITTEN_FONT}
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
  index,
}: {
  station: CorridorStation;
  z: number;
  index: number;
}) {
  const side = station.side;

  return (
    <HingedMiniWall
      side={side}
      z={z}
      index={index}
      name={`Corridor Hinged Mini Wall: ${station.title}`}
    >
      <group
        name={`Corridor Station Frame: ${station.title}`}
        position={[0, 0.7, -0.01]}
      >
        <CorridorPictureFrame name={`Station 3D Frame: ${station.title}`} />
        <PaintSprite
          name={`Station Artwork: ${station.title}`}
          sketch={station.art}
          billboard={false}
          position={[0, 0, 0.132]}
          height={1.3}
          revealNear={7}
          revealFar={15}
        />
      </group>

      <WallText
        position={[0, -1, 0]}
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

/**
 * CorridorStations — the info stops along the corridor walls and the remaining
 * floor and wall props.
 */
export default function CorridorStations() {
  return (
    <group name="Corridor Stations">
      {corridor.stations.map((station, i) => (
        <InfoStation
          key={station.title}
          station={station}
          z={corridorStationZ(i)}
          index={i}
        />
      ))}

      {/* Props standing on the floor */}
      <PaintSprite
        name="Corridor Potted Tree"
        sketch={`${C}/drzewkowdoniczce.webp`}
        position={[2.6, CORRIDOR.floorY + 0.95, corridorLayoutZ(-38)]}
        height={1.9}
        revealNear={8}
        revealFar={16}
      />
      <PaintSprite
        name="Corridor Potted Flower"
        sketch={`${C}/kwiatekwdoniczce.webp`}
        position={[-2.7, CORRIDOR.floorY + 0.55, corridorLayoutZ(-57)]}
        height={1.1}
        revealNear={8}
        revealFar={16}
      />
      <CorridorCabinet />

      {/* Vent flat on the right wall */}
      <group
        name="Corridor Vent"
        position={[CORRIDOR.halfWidth - 0.06, 1.6, corridorLayoutZ(-50)]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <PaintSprite
          name="Corridor Vent Sprite"
          sketch={`${C}/kratkawentylacyjna.webp`}
          billboard={false}
          height={0.5}
        />
      </group>

      {/* The table beside the window (the airplane rests above it) */}
      <PaintSprite
        name="Corridor Window Table"
        sketch="/textures/shared/table.webp"
        position={[CORRIDOR.table.x, CORRIDOR.table.y, CORRIDOR.table.z]}
        height={2.3}
        revealNear={9}
        revealFar={18}
      />
    </group>
  );
}
