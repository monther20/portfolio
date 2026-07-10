"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";

import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import PartingItem from "../PartingItem";
import { BEACH } from "../journeyConfig";
import Boardwalk from "./beach/Boardwalk";
import ContactCrates from "./beach/ContactCrates";

const C = "/textures/textures/contact";

/** The sea surface — a slowly drifting hand-drawn wave pattern. */
function Sea() {
  const waveTex = useLoader(THREE.TextureLoader, `${C}/faletopdown.webp`);

  const tiled = useMemo(() => {
    const texture = waveTex.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [waveTex]);

  useEffect(() => () => tiled.dispose(), [tiled]);

  useFrame((_, delta) => {
    tiled.offset.x += delta * 0.006;
    tiled.offset.y += delta * 0.004;
  });

  return (
    <mesh name="Beach Sea" position={[0, BEACH.seaY, BEACH.seaZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 70]} />
      <meshBasicMaterial map={tiled} color="#bcd3e0" transparent opacity={0.85} />
    </mesh>
  );
}

/**
 * BeachContactSection — the journey's landing: a boardwalk over the sea,
 * crates with contact actions bobbing beside it, and the scenery of the shore.
 */
export default function BeachContactSection() {
  return (
    <group name="Beach Contact Section">
      <Sea />
      <Boardwalk />
      <ContactCrates />

      {/* Distant hand-drawn mountains on the horizon */}
      <PaintSprite
        name="Beach Mountains"
        sketch="/textures/mountain.webp"
        billboard={false}
        position={[0, 0.4, BEACH.mountainZ]}
        height={9}
        revealNear={24}
        revealFar={44}
      />

      {/* Shore scenery */}
      <PartingItem name="Beach Lighthouse" home={[-7, BEACH.seaY + 2.3, -196]} push={2.9} lift={0.45}>
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.3} floatingRange={[-0.1, 0.15]}>
          <PaintSprite name="Beach Lighthouse Sprite" sketch={`${C}/latarnia.webp`} height={4.6} revealNear={14} revealFar={32} />
        </Float>
      </PartingItem>
      <PartingItem name="Beach Ship" home={[5.5, BEACH.seaY + 1.15, -195]} push={2.9} lift={0.45}>
        <Float speed={1.3} rotationIntensity={0.1} floatIntensity={0.5} floatingRange={[-0.15, 0.15]}>
          <PaintSprite name="Beach Ship Sprite" sketch={`${C}/statek.webp`} height={2.3} revealNear={13} revealFar={28} />
        </Float>
      </PartingItem>
      <PartingItem name="Beach Pier Sprite Wrapper" home={[2.6, BEACH.seaY + 0.9, -181]} push={2.3} lift={0.35}>
        <PaintSprite name="Beach Pier Sprite" sketch={`${C}/molo.webp`} height={1.8} revealNear={12} revealFar={26} />
      </PartingItem>
      <PaintSprite
        name="Beach Barrel"
        sketch={`${C}/beczka.webp`}
        painted={`${C}/beczka_painted.webp`}
        position={[1.15, BEACH.boardwalk.topY + 0.55, -183.2]}
        height={1.1}
        revealNear={10}
        revealFar={22}
      />

      {/* Arrival note — placeholder copy */}
      <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.4} floatingRange={[-0.1, 0.12]}>
        <FloatingNote position={[0, 0.9, -178]} fontSize={1.6} weight={700} rotation={-2}>
          welcome to my shore — say hi!
        </FloatingNote>
      </Float>
    </group>
  );
}
