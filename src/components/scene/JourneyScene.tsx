"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import PaintSprite from "./PaintSprite";
import AboutSection from "./sections/AboutSection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import ContactSection from "./sections/ContactSection";

// ── Section anchors along -z (spread far apart so you meet them one at a time) ──
export const SECTION_Z = {
  about: -36,
  skills: -78,
  projects: -114,
  contact: -148,
};

const FLOOR_Y = -3.4;
const FLOOR_NEAR = -14;
const FLOOR_FAR = -140; // hands off to the Contact sea

const CLOUD_BASE = "/textures/textures/clouds";
const CLOUDS = [
  "1131c3eb-dfae-423f-924b-ff39d8ccd6dc",
  "254b8ec8-d6f7-4275-956f-7bab65b2ce2d",
  "2cc88dd1-483c-466d-b07e-f8308c61ccbe",
  "5606fcc0-3252-447d-a58a-7bcbac73229a",
  "7882dc72-3d01-41fb-ac0e-d07b0184ebc1",
  "9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35",
  "c83293c6-d90c-4a32-8d9d-5ac9af7e2296",
  "f6e358bc-d27c-41dd-95f4-6787a835c41e",
];

/** A long wooden path that recedes into the fog — gives the walking feel. */
function Floor() {
  const tex = useLoader(THREE.TextureLoader, "/textures/textures/corridor/floor_wood.webp");
  const floor = useMemo(() => {
    const t = tex.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 42);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [tex]);

  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);

  const len = FLOOR_NEAR - FLOOR_FAR;
  return (
    <mesh position={[0, FLOOR_Y, (FLOOR_NEAR + FLOOR_FAR) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[22, len]} />
      <meshBasicMaterial map={floor} color="#eaeaea" />
    </mesh>
  );
}

/** Soft clouds drifting at the sides, small and out of the walking path. */
function Clouds() {
  const placed = useMemo(() => {
    const out: { tex: string; pos: [number, number, number]; h: number; speed: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const tex = `${CLOUD_BASE}/${CLOUDS[i % CLOUDS.length]}.webp`;
      const side = i % 2 === 0 ? -1 : 1;
      // Keep clouds well off-centre (x) and mostly up high so they don't cover content.
      const x = side * (12 + ((i * 7) % 7));
      const y = 1 + ((i * 23) % 8);
      const z = -28 - i * 13;
      const h = 3.5 + ((i * 11) % 4);
      out.push({ tex, pos: [x, y, z], h, speed: 0.5 + (i % 3) * 0.2 });
    }
    return out;
  }, []);

  return (
    <group>
      {placed.map((c, i) => (
        <Float key={i} speed={c.speed} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.4, 0.4]}>
          <PaintSprite sketch={c.tex} position={c.pos} height={c.h} autoReveal={false} billboard />
        </Float>
      ))}
    </group>
  );
}

/**
 * JourneyScene — everything beyond the door (z < -16): a forward-scroll path
 * walking from About → Skills → Projects → Contact.
 */
export default function JourneyScene() {
  return (
    <group>
      <Floor />
      <Clouds />
      <AboutSection zAvatar={SECTION_Z.about} />
      <SkillsSection zStart={SECTION_Z.skills} />
      <ProjectsSection zStart={SECTION_Z.projects} />
      <ContactSection zStart={SECTION_Z.contact} />
    </group>
  );
}
