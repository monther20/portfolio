"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";

import { BEACH } from "../journeyConfig";
import Boardwalk from "./beach/Boardwalk";
import ContactCrates from "./beach/ContactCrates";
import PaperBoats from "./beach/PaperBoats";
import PierDecorations from "./beach/PierDecorations";
import CoastalLandscape from "./beach/CoastalLandscape";
import { SEA_SIZE } from "./beach/coastalLandscapeModel";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import { useNightMaterials } from "../dayNight/useNightMaterials";

const C = "/textures/contact";

/** The sea surface — a slowly drifting hand-drawn wave pattern. */
function Sea() {
  const mesh = useRef<THREE.Mesh>(null);
  useNightMaterials(mesh, "sea");
  const waveTex = useLoader(THREE.TextureLoader, `${C}/faletopdown.webp`);
  const responsive = useResponsiveExperience();

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
    tiled.offset.x += delta * 0.006 * responsive.motionScale;
    tiled.offset.y += delta * 0.004 * responsive.motionScale;
  });

  return (
    <mesh ref={mesh} name="Beach Sea" position={[0, BEACH.seaY, BEACH.seaZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[SEA_SIZE.width, SEA_SIZE.depth]} />
      <meshBasicMaterial map={tiled} color="#ffffff" transparent opacity={0.72} />
    </mesh>
  );
}

/**
 * BeachContactSection — the journey's landing: a boardwalk over the sea,
 * crates with contact actions and folded paper boats bobbing beside it.
 */
export default function BeachContactSection() {
  return (
    <group name="Beach Contact Section">
      <Sea />
      <CoastalLandscape />
      <Boardwalk />
      <PierDecorations />
      <PaperBoats />
      <ContactCrates />
    </group>
  );
}
