"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import gsap from "gsap";
import SpotlightCone, { FloorGlow } from "./SpotlightCone";
import Lantern from "./Lantern";
import { ShadowConfig } from "./ShadowDebugPanel";
import { FloorDecal, WallShadow } from "./room/decals";
import {
  buildFloorDecals,
  CHAIR_ASPECT,
  TABLE_ASPECT,
} from "./room/floorDecalLayout";
import {
  rotationTuple,
  scaleTuple,
  vector3Tuple,
  type RoomDebugState,
} from "./RoomDebugGui";

export default function InteriorDetails({
  isNight,
  toggleNight,
  shadowConfig,
  debug,
}: {
  isNight: boolean;
  toggleNight: () => void;
  shadowConfig: ShadowConfig;
  debug: RoomDebugState;
}) {
  const [lanternHovered, setLanternHovered] = useState(false);
  const floorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pathMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const { lights, materials, meshes } = debug;
  const floorColor = isNight ? materials.floor.nightColor ?? materials.floor.color : materials.floor.color;
  const pathColor = isNight ? materials.stonePath.nightColor ?? materials.stonePath.color : materials.stonePath.color;

  useEffect(() => {
    const floorTargetColor = new THREE.Color(floorColor);
    const pathTargetColor = new THREE.Color(pathColor);

    if (floorMatRef.current) {
      gsap.to(floorMatRef.current.color, {
        r: floorTargetColor.r,
        g: floorTargetColor.g,
        b: floorTargetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    if (pathMatRef.current) {
      gsap.to(pathMatRef.current.color, {
        r: pathTargetColor.r,
        g: pathTargetColor.g,
        b: pathTargetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [floorColor, pathColor]);

  const baseFloorTexture = useLoader(
    THREE.TextureLoader,
    "/textures/floor.webp",
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

  const lightTex = useLoader(THREE.TextureLoader, "/textures/light.webp");
  const lightOnTex = useLoader(THREE.TextureLoader, "/textures/light_on.webp");
  const rock1Tex = useLoader(THREE.TextureLoader, "/textures/rock-1.webp");
  const rockHerpTex = useLoader(THREE.TextureLoader, "/textures/rock_and_herp.webp");
  const herpTex = useLoader(THREE.TextureLoader, "/textures/herp.webp");
  const stonePathTex = useLoader(THREE.TextureLoader, "/textures/stone-path.webp");
  const tableTex = useLoader(THREE.TextureLoader, "/textures/table.webp");
  const chairTex = useLoader(THREE.TextureLoader, "/textures/chair.webp");
  const tableShadowTex = useLoader(THREE.TextureLoader, "/textures/table-shadow.webp");
  const chairShadowTex = useLoader(THREE.TextureLoader, "/textures/chair-shadow.webp");

  const decals = buildFloorDecals(
    {
      rock1: rock1Tex,
      rockHerp: rockHerpTex,
      herp: herpTex,
      table: tableTex,
      chair: chairTex,
    },
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
          ref={floorMatRef}
          map={floorTexture}
          bumpMap={floorTexture}
          bumpScale={materials.floor.bumpScale}
          roughness={materials.floor.roughness}
          metalness={materials.floor.metalness}
          color={floorColor}
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
          ref={pathMatRef}
          map={stonePathTex}
          transparent
          alphaTest={0.01}
          roughness={materials.stonePath.roughness}
          metalness={materials.stonePath.metalness}
          color={pathColor}
          wireframe={materials.stonePath.wireframe}
        />
      </mesh>

      {/* ── LANTERNS (Clickable) ── */}
      <group>
        {/* ─── LEFT LANTERN ─── */}
        <Lantern
          position={vector3Tuple(meshes.leftLantern.position)}
          rotation={rotationTuple(meshes.leftLantern.rotation)}
          scale={scaleTuple(meshes.leftLantern.scale)}
          visible={meshes.leftLantern.visible}
          renderOrder={meshes.leftLantern.renderOrder}
          texBase={lightTex}
          texOn={lightOnTex}
          isNight={isNight}
          isHovered={lanternHovered}
          onClick={toggleNight}
          onPointerOver={() => setLanternHovered(true)}
          onPointerOut={() => setLanternHovered(false)}
        />

        {/* Left lantern – SpotLight fans out to the LEFT */}
        <SpotlightCone
          position={vector3Tuple(lights.leftLanternSpot.position)}
          targetPosition={vector3Tuple(lights.leftLanternSpot.target)}
          isNight={isNight}
          visible={lights.leftLanternSpot.visible}
          intensity={lights.leftLanternSpot.intensity}
          angle={lights.leftLanternSpot.angle}
          penumbra={lights.leftLanternSpot.penumbra}
          distance={lights.leftLanternSpot.distance}
          decay={lights.leftLanternSpot.decay}
          color={lights.leftLanternSpot.color}
        />
        {/* Floor glow under left lantern beam */}
        <FloorGlow
          position={vector3Tuple(meshes.leftFloorGlow.position)}
          rotation={rotationTuple(meshes.leftFloorGlow.rotation)}
          scale={scaleTuple(meshes.leftFloorGlow.scale)}
          visible={meshes.leftFloorGlow.visible}
          renderOrder={meshes.leftFloorGlow.renderOrder}
          isNight={isNight}
          radius={meshes.leftFloorGlow.radius}
          color={meshes.leftFloorGlow.color}
          maxOpacity={meshes.leftFloorGlow.maxOpacity}
        />

        {/* ─── RIGHT LANTERN ─── */}
        <Lantern
          position={vector3Tuple(meshes.rightLantern.position)}
          rotation={rotationTuple(meshes.rightLantern.rotation)}
          scale={scaleTuple(meshes.rightLantern.scale)}
          visible={meshes.rightLantern.visible}
          renderOrder={meshes.rightLantern.renderOrder}
          texBase={lightTex}
          texOn={lightOnTex}
          isNight={isNight}
          isHovered={lanternHovered}
          onClick={toggleNight}
          onPointerOver={() => setLanternHovered(true)}
          onPointerOut={() => setLanternHovered(false)}
        />

        {/* Right lantern – SpotLight fans out to the RIGHT */}
        <SpotlightCone
          position={vector3Tuple(lights.rightLanternSpot.position)}
          targetPosition={vector3Tuple(lights.rightLanternSpot.target)}
          isNight={isNight}
          visible={lights.rightLanternSpot.visible}
          intensity={lights.rightLanternSpot.intensity}
          angle={lights.rightLanternSpot.angle}
          penumbra={lights.rightLanternSpot.penumbra}
          distance={lights.rightLanternSpot.distance}
          decay={lights.rightLanternSpot.decay}
          color={lights.rightLanternSpot.color}
        />
        {/* Floor glow under right lantern beam */}
        <FloorGlow
          position={vector3Tuple(meshes.rightFloorGlow.position)}
          rotation={rotationTuple(meshes.rightFloorGlow.rotation)}
          scale={scaleTuple(meshes.rightFloorGlow.scale)}
          visible={meshes.rightFloorGlow.visible}
          renderOrder={meshes.rightFloorGlow.renderOrder}
          isNight={isNight}
          radius={meshes.rightFloorGlow.radius}
          color={meshes.rightFloorGlow.color}
          maxOpacity={meshes.rightFloorGlow.maxOpacity}
        />
      </group>

      {decals.map((d) => (
        <FloorDecal key={d.id} texture={d.tex} position={d.pos} scale={d.s} aspect={d.a} isNight={isNight} renderOrder={d.ro ?? 0} />
      ))}

      {/* Table/chair shadows projected onto the back wall during night mode. */}
      <WallShadow
        texture={tableShadowTex}
        position={[shadowConfig.table.x, shadowConfig.table.y, shadowConfig.table.z]}
        scale={shadowConfig.table.scale}
        aspect={TABLE_ASPECT}
        isNight={isNight}
        maxOpacity={shadowConfig.table.maxOpacity}
      />
      <WallShadow
        texture={chairShadowTex}
        position={[shadowConfig.chair.x, shadowConfig.chair.y, shadowConfig.chair.z]}
        scale={shadowConfig.chair.scale}
        aspect={CHAIR_ASPECT}
        isNight={isNight}
        maxOpacity={shadowConfig.chair.maxOpacity}
      />

      {/* Interior Ambient Light - Dim when night */}
      {lights.interiorAmbient.visible && (
        <ambientLight
          intensity={isNight ? lights.interiorAmbient.nightIntensity : lights.interiorAmbient.dayIntensity}
          color={lights.interiorAmbient.color}
        />
      )}
    </>
  );
}
