"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import Lantern from "./Lantern";
import { FloorDecal } from "./room/decals";
import { buildFloorDecals } from "./room/floorDecalLayout";
import RoomFurniture from "./room/RoomFurniture";
import {
  rotationTuple,
  scaleTuple,
  vector3Tuple,
  type RoomDebugState,
} from "./roomDebug/types";

export default function InteriorDetails({ debug }: { debug: RoomDebugState }) {
  const { materials, meshes } = debug;
  const baseFloorTexture = useLoader(
    THREE.TextureLoader,
    "/textures/room/floor.webp",
  );
  const floorTexture = useMemo(() => {
    const t = baseFloorTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 4);
    t.anisotropy = 16;
    t.needsUpdate = true;
    return t;
  }, [baseFloorTexture]);
  const rock1Tex = useLoader(THREE.TextureLoader, "/textures/room/rock-1.webp");
  const rockHerpTex = useLoader(
    THREE.TextureLoader,
    "/textures/room/rock_and_herp.webp",
  );
  const herpTex = useLoader(THREE.TextureLoader, "/textures/room/herp.webp");
  const stonePathTex = useLoader(
    THREE.TextureLoader,
    "/textures/room/stone-path.webp",
  );
  const decals = buildFloorDecals(
    { rock1: rock1Tex, rockHerp: rockHerpTex, herp: herpTex },
    debug.interiorDetails.floorDecals,
  );

  return (
    <>
      <mesh
        position={vector3Tuple(meshes.floor.position)}
        rotation={rotationTuple(meshes.floor.rotation)}
        scale={scaleTuple(meshes.floor.scale)}
        renderOrder={meshes.floor.renderOrder}
        visible={meshes.floor.visible}
      >
        <boxGeometry args={[100, 1, 30]} />
        <meshStandardMaterial
          map={floorTexture}
          bumpMap={floorTexture}
          bumpScale={materials.floor.bumpScale}
          roughness={materials.floor.roughness}
          metalness={materials.floor.metalness}
          color={materials.floor.color}
          wireframe={materials.floor.wireframe}
        />
      </mesh>
      <mesh
        position={vector3Tuple(meshes.stonePath.position)}
        rotation={rotationTuple(meshes.stonePath.rotation)}
        scale={scaleTuple(meshes.stonePath.scale)}
        renderOrder={meshes.stonePath.renderOrder}
        visible={meshes.stonePath.visible}
      >
        <planeGeometry args={[8, 26]} />
        <meshStandardMaterial
          map={stonePathTex}
          transparent
          alphaTest={0.01}
          roughness={materials.stonePath.roughness}
          metalness={materials.stonePath.metalness}
          color={materials.stonePath.color}
          wireframe={materials.stonePath.wireframe}
        />
      </mesh>

      {([meshes.leftLantern, meshes.rightLantern] as const).map(
        (lantern, index) => (
          <Lantern
            key={index}
            index={index === 0 ? 0 : 1}
            position={vector3Tuple(lantern.position)}
            rotation={rotationTuple(lantern.rotation)}
            scale={scaleTuple(lantern.scale)}
            visible={lantern.visible}
            renderOrder={lantern.renderOrder}
            wallZ={meshes.exteriorWall.position.z}
          />
        ),
      )}
      {decals.map((d) => (
        <FloorDecal
          key={d.id}
          texture={d.tex}
          position={d.pos}
          scale={d.s}
          aspect={d.a}
          renderOrder={d.ro ?? 0}
        />
      ))}
      <RoomFurniture />
    </>
  );
}
