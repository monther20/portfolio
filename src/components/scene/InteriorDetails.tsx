"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import gsap from "gsap";
import SpotlightCone, { FloorGlow } from "./SpotlightCone";

// Billboard sprite — stands on the floor and always faces the camera
function FloorDecal({
  texture,
  position,
  scale = 1,
  aspect = 1,
  isNight,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  scale?: number;
  aspect?: number;
  isNight: boolean;
}) {
  const width = scale * aspect;
  const height = scale;
  const [x, y, z] = position;
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    if (materialRef.current) {
      const targetColor = new THREE.Color(isNight ? "#888899" : "#ffffff");
      gsap.to(materialRef.current.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [isNight]);

  return (
    <Billboard
      position={[x, y + height / 2, z]}
      follow={true}
      lockX={false}
      lockY={true}
      lockZ={false}
    >
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          alphaTest={0.01}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}

export default function InteriorDetails({
  isNight,
  toggleNight,
}: {
  isNight: boolean;
  toggleNight: () => void;
}) {
  const floorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pathMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const wallLMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const wallRMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    const targetColor = new THREE.Color(isNight ? "#888899" : "#ffffff");
    const mats = [floorMatRef.current, pathMatRef.current, wallLMatRef.current, wallRMatRef.current].filter(Boolean);
    mats.forEach((mat) => {
      if (mat) {
        gsap.to(mat.color, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 1.5,
          ease: "power2.inOut",
        });
      }
    });
  }, [isNight]);

  const baseFloorTexture = useLoader(
    THREE.TextureLoader,
    "/textures/floor.png",
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

  const lightTex = useLoader(THREE.TextureLoader, "/textures/light.png");
  const rock1Tex = useLoader(THREE.TextureLoader, "/textures/rock-1.png");
  const rockHerpTex = useLoader(THREE.TextureLoader, "/textures/rock_and_herp.png");
  const herpTex = useLoader(THREE.TextureLoader, "/textures/herp.png");
  const stonePathTex = useLoader(THREE.TextureLoader, "/textures/stone-path.webp");

  // aspect ratios: rock-1 401x157, rock_and_herp 412x160, herp 490x262
  const ROCK1_ASPECT = 401 / 157; // ~2.55
  const ROCKH_ASPECT = 412 / 160; // ~2.575
  const HERP_ASPECT = 490 / 262; // ~1.87

  const decals = useMemo(
    () => [
      { tex: rock1Tex, pos: [-5.0, -6.0, -12] as [number, number, number], s: 1.6, a: ROCK1_ASPECT },
      { tex: herpTex, pos: [-5.5, -6.0, -7] as [number, number, number], s: 1.8, a: HERP_ASPECT },
      { tex: rockHerpTex, pos: [5.0, -6.0, -9] as [number, number, number], s: 1.5, a: ROCKH_ASPECT },
      { tex: herpTex, pos: [5.5, -6.0, -4] as [number, number, number], s: 1.6, a: HERP_ASPECT },
      { tex: rock1Tex, pos: [-4.0, -6.0, -14] as [number, number, number], s: 0.6, a: ROCK1_ASPECT },
      { tex: rock1Tex, pos: [-6.5, -6.0, -9] as [number, number, number], s: 0.5, a: ROCK1_ASPECT },
      { tex: rock1Tex, pos: [-4.5, -6.0, -5] as [number, number, number], s: 0.5, a: ROCK1_ASPECT },
      { tex: rock1Tex, pos: [-7.0, -6.0, -2] as [number, number, number], s: 0.6, a: ROCK1_ASPECT },
      { tex: rockHerpTex, pos: [-5.5, -6.0, -15] as [number, number, number], s: 0.6, a: ROCKH_ASPECT },
      { tex: rockHerpTex, pos: [-4.0, -6.0, -3] as [number, number, number], s: 0.5, a: ROCKH_ASPECT },
      { tex: rockHerpTex, pos: [-7.5, -6.0, -7] as [number, number, number], s: 0.6, a: ROCKH_ASPECT },
      { tex: herpTex, pos: [-4.5, -6.0, -11] as [number, number, number], s: 0.8, a: HERP_ASPECT },
      { tex: herpTex, pos: [-6.0, -6.0, -2] as [number, number, number], s: 0.5, a: HERP_ASPECT },
      { tex: herpTex, pos: [-8.0, -6.0, -12] as [number, number, number], s: 0.6, a: HERP_ASPECT },
      { tex: rock1Tex, pos: [4.0, -6.0, -13] as [number, number, number], s: 0.5, a: ROCK1_ASPECT },
      { tex: rock1Tex, pos: [6.5, -6.0, -6] as [number, number, number], s: 0.7, a: ROCK1_ASPECT },
      { tex: rock1Tex, pos: [4.5, -6.0, -2] as [number, number, number], s: 0.4, a: ROCK1_ASPECT },
      { tex: rock1Tex, pos: [8.0, -6.0, -10] as [number, number, number], s: 0.5, a: ROCK1_ASPECT },
      { tex: rockHerpTex, pos: [5.5, -6.0, -12] as [number, number, number], s: 0.7, a: ROCKH_ASPECT },
      { tex: rockHerpTex, pos: [4.0, -6.0, -6] as [number, number, number], s: 0.5, a: ROCKH_ASPECT },
      { tex: rockHerpTex, pos: [7.0, -6.0, -3] as [number, number, number], s: 0.6, a: ROCKH_ASPECT },
      { tex: herpTex, pos: [4.5, -6.0, -8] as [number, number, number], s: 0.6, a: HERP_ASPECT },
      { tex: herpTex, pos: [7.0, -6.0, -5] as [number, number, number], s: 0.7, a: HERP_ASPECT },
      { tex: herpTex, pos: [9.0, -6.0, -13] as [number, number, number], s: 0.5, a: HERP_ASPECT },
    ],
    [rock1Tex, rockHerpTex, herpTex, ROCK1_ASPECT, ROCKH_ASPECT, HERP_ASPECT],
  );

  return (
    <>
      <mesh position={[0, -6.5, -1.15]}>
        <boxGeometry args={[100, 1, 30]} />
        <meshStandardMaterial
          ref={floorMatRef}
          map={floorTexture}
          bumpMap={floorTexture}
          bumpScale={0.02}
          roughness={1}
          metalness={0}
          color="#ffffff"
        />
      </mesh>

      <mesh position={[0, 6.5, -1.15]}>
        <boxGeometry args={[100, 1, 30]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      <mesh position={[0, -5.99, -4.07]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 26]} />
        <meshStandardMaterial
          ref={pathMatRef}
          map={stonePathTex}
          transparent
          alphaTest={0.01}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* ── LANTERNS (Clickable) ── */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          toggleNight();
        }}
        onPointerEnter={() => (document.body.style.cursor = "pointer")}
        onPointerLeave={() => (document.body.style.cursor = "auto")}
      >
        {/* ─── LEFT LANTERN ─── */}
        <mesh position={[-4.5, 0, -16.1]}>
          <planeGeometry args={[2.19, 3.39]} />
          <meshBasicMaterial ref={wallLMatRef} map={lightTex} transparent alphaTest={0.01} depthWrite={false} />
        </mesh>
        {/* Left lantern – outer beam: fans left/outward from lantern tip */}
        <SpotlightCone
          position={[-4.5, -0.6, -16.05]}
          rotation={[0, 0, -0.55]}
          isNight={isNight}
        />
        {/* Left lantern – inner beam: crosses right toward door center */}
        <SpotlightCone
          position={[-4.5, -0.6, -16.05]}
          rotation={[0, 0, 0.65]}
          isNight={isNight}
        />
        {/* Floor glow under left lantern outer beam (left side ground) */}
        <FloorGlow position={[-7.0, -5.98, -14.5]} isNight={isNight} radius={2.2} />
        {/* Floor glow under left lantern inner beam (stone path, center) */}
        <FloorGlow position={[-1.5, -5.98, -14.5]} isNight={isNight} radius={2.0} />

        {/* ─── RIGHT LANTERN ─── */}
        <mesh position={[4.5, 0, -16.1]}>
          <planeGeometry args={[2.19, 3.39]} />
          <meshBasicMaterial ref={wallRMatRef} map={lightTex} transparent alphaTest={0.01} depthWrite={false} />
        </mesh>
        {/* Right lantern – outer beam: fans right/outward */}
        <SpotlightCone
          position={[4.5, -0.6, -16.05]}
          rotation={[0, 0, 0.55]}
          isNight={isNight}
        />
        {/* Right lantern – inner beam: crosses left toward door center */}
        <SpotlightCone
          position={[4.5, -0.6, -16.05]}
          rotation={[0, 0, -0.65]}
          isNight={isNight}
        />
        {/* Floor glow under right lantern outer beam (right side ground) */}
        <FloorGlow position={[7.0, -5.98, -14.5]} isNight={isNight} radius={2.2} />
        {/* Floor glow under right lantern inner beam (stone path, center) */}
        <FloorGlow position={[1.5, -5.98, -14.5]} isNight={isNight} radius={2.0} />
      </group>

      {decals.map((d, i) => (
        <FloorDecal key={i} texture={d.tex} position={d.pos} scale={d.s} aspect={d.a} isNight={isNight} />
      ))}

      {/* Interior Ambient Light - Dim when night */}
      <ambientLight intensity={isNight ? 0.8 : 1.5} color="#ffffff" />
    </>
  );
}
