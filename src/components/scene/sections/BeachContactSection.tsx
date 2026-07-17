"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";

import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import PartingItem from "../PartingItem";
import { BEACH } from "../journeyConfig";
import Boardwalk from "./beach/Boardwalk";
import ContactCrates from "./beach/ContactCrates";
import { contact } from "@/data/portfolio";

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
      <PartingItem name="Beach Lighthouse" home={[-7, BEACH.seaY + 2.3, BEACH.boardwalk.endZ - 4]} push={2.9} lift={0.45}>
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.3} floatingRange={[-0.1, 0.15]}>
          <PaintSprite name="Beach Lighthouse Sprite" sketch={`${C}/latarnia.webp`} height={4.6} revealNear={14} revealFar={32} autoReveal={false} />
        </Float>
      </PartingItem>
      <PartingItem name="Beach Ship" home={[5.8, BEACH.seaY + 0.55, BEACH.boardwalk.endZ + 1]} push={1.2} lift={0.15}>
        <Float speed={0.9} rotationIntensity={0.04} floatIntensity={0.25} floatingRange={[-0.05, 0.08]}>
          <PaintSprite name="Beach Ship Sprite" sketch={`${C}/statek.webp`} height={1.1} revealNear={13} revealFar={28} autoReveal={false} />
        </Float>
      </PartingItem>
      {/* A clear invitation on arrival, followed by a small prompt near the actions. */}
      <Float speed={1.05} rotationIntensity={0.035} floatIntensity={0.28} floatingRange={[-0.08, 0.1]}>
        <FloatingNote
          name="Contact Invitation"
          position={[BEACH.boardwalk.x, 0.4, BEACH.boardwalk.startZ - 6.2]}
          fontSize={2.05}
          maxWidth={520}
          weight={700}
          color="#111111"
          rotation={-1.5}
        >
          want to build something together?
        </FloatingNote>
      </Float>
      <Float speed={0.9} rotationIntensity={0.025} floatIntensity={0.2} floatingRange={[-0.05, 0.06]}>
        <FloatingNote
          name="Contact Details"
          position={[BEACH.boardwalk.x, -0.48, BEACH.boardwalk.startZ - 6.35]}
          fontSize={1.05}
          maxWidth={560}
          weight={600}
          color="#333333"
          rotation={0.8}
        >
          {`${contact.location} · open to frontend opportunities\n${contact.email} · ${contact.phone}`}
        </FloatingNote>
      </Float>
      <Float speed={1.15} rotationIntensity={0.03} floatIntensity={0.25} floatingRange={[-0.05, 0.08]}>
        <FloatingNote
          name="Contact Action Prompt"
          position={[BEACH.boardwalk.x, -0.98, BEACH.boardwalk.endZ - 1.35]}
          fontSize={1.15}
          weight={700}
          color="#111111"
          rotation={-1}
        >
          choose a sign
        </FloatingNote>
      </Float>
    </group>
  );
}
