"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";

import PaintSprite from "../PaintSprite";
import PartingItem from "../PartingItem";
import { BEACH } from "../journeyConfig";
import Boardwalk from "./beach/Boardwalk";
import ContactCrates from "./beach/ContactCrates";

const C = "/textures/contact";

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
      <meshBasicMaterial map={tiled} color="#ffffff" transparent opacity={0.72} />
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

      {/* Shore scenery */}
      <PartingItem
        name="Beach Lighthouse"
        home={[-7, -2.07, -260]}
        push={2.9}
        lift={0.45}
      >
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.3} floatingRange={[-0.1, 0.15]}>
          <PaintSprite name="Beach Lighthouse Sprite" sketch={`${C}/latarnia.webp`} height={4.6} revealNear={14} revealFar={32} autoReveal={false} />
        </Float>
      </PartingItem>
      <PartingItem
        name="Beach Ship"
        home={[4.16, -3.22, -260]}
        push={1.2}
        lift={0.15}
      >
        <Float speed={0.9} rotationIntensity={0.04} floatIntensity={0.25} floatingRange={[-0.05, 0.08]}>
          <PaintSprite name="Beach Ship Sprite" sketch={`${C}/statek.webp`} height={1.1} revealNear={13} revealFar={28} autoReveal={false} />
        </Float>
      </PartingItem>
    </group>
  );
}
