"use client";

import { useMemo } from "react";
import { Float } from "@react-three/drei";

import PaintSprite from "./PaintSprite";
import PartingItem, { seededRange } from "./PartingItem";
import CorridorScene from "./CorridorScene";
import ScrollCameraManager from "./ScrollCameraManager";
import PaperAirplaneActor from "./PaperAirplaneActor";
import JourneySection from "./sections/JourneySection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import BeachContactSection from "./sections/BeachContactSection";
import { JOURNEY } from "./journeyConfig";
import { CLOUD_TEXTURE_URLS } from "./assetPaths";

// Sky clouds live between the corridor window and the beach descent.
const CLOUD_START_Z = JOURNEY.windowExitZ - 2;
const CLOUD_CHUNKS = 8;
const CLOUD_ITEMS_PER_CHUNK = 3;
const CLOUD_CHUNK_DEPTH = 10.5;

type PlacedCloud = {
  key: string;
  number: number;
  tex: string;
  x: number;
  y: number;
  z: number;
  height: number;
  speed: number;
  float: number;
};

type CloudPositionOverride = Partial<Pick<PlacedCloud, "x" | "y" | "z">>;

/** Stable positions copied from the Journey debug panel. */
const CLOUD_POSITION_OVERRIDES: Partial<Record<number, CloudPositionOverride>> = {
  5: { x: -1.74 },
  14: { y: -1.44, z: -172.02 },
  20: { y: -0.66 },
  23: { x: 3.81 },
};

function FlightClouds() {
  // Chunked deterministic scatter: each chunk gets one left, one center, one right cloud.
  const placed = useMemo(() => {
    const out: PlacedCloud[] = [];

    for (let chunk = 0; chunk < CLOUD_CHUNKS; chunk++) {
      for (let slot = 0; slot < CLOUD_ITEMS_PER_CHUNK; slot++) {
        const i = chunk * CLOUD_ITEMS_PER_CHUNK + slot;
        const lane = slot - 1;
        const side = lane === 0 ? (seededRange(`cloud-${i}-side`, 0, 1) < 0.5 ? -1 : 1) : lane;
        const x = lane === 0
          ? seededRange(`cloud-${i}-center-x`, -1.8, 1.8)
          : side * seededRange(`cloud-${i}-outer-x`, 2.4, 5.8);

        const number = i + 1;
        const override = CLOUD_POSITION_OVERRIDES[number];
        const y = seededRange(`cloud-${i}-y`, -1.0, 2.0);
        const z = CLOUD_START_Z
          - chunk * CLOUD_CHUNK_DEPTH
          - seededRange(`cloud-${i}-z`, 1.2, CLOUD_CHUNK_DEPTH - 1.1);

        out.push({
          key: `cloud-${i}`,
          number,
          tex: CLOUD_TEXTURE_URLS[i % CLOUD_TEXTURE_URLS.length],
          x: override?.x ?? x,
          y: override?.y ?? y,
          z: override?.z ?? z,
          height: seededRange(`cloud-${i}-height`, 1.1, 2.25),
          speed: seededRange(`cloud-${i}-speed`, 0.55, 1.25),
          float: seededRange(`cloud-${i}-float`, 0.24, 0.56),
        });
      }
    }

    return out;
  }, []);

  return (
    <group name="Flight Clouds">
      {placed.map((cloud) => {
        const cloudNumber = String(cloud.number).padStart(2, "0");
        const cloudName = `Flight Cloud ${cloudNumber}`;

        return (
          <PartingItem
            key={cloud.key}
            name={cloudName}
            home={[cloud.x, cloud.y, cloud.z]}
            push={2.4}
            lift={0.55}
            forward={0.55}
            influenceDistance={8.5}
          >
            <Float
              speed={cloud.speed}
              rotationIntensity={0.035}
              floatIntensity={cloud.float}
              floatingRange={[-0.2, 0.2]}
            >
              <PaintSprite
                name={`${cloudName} Sprite`}
                sketch={cloud.tex}
                height={cloud.height}
                autoReveal={false}
                billboard
              />
            </Float>
          </PartingItem>
        );
      })}
    </group>
  );
}

/**
 * JourneyScene — everything beyond the door: the corridor walk, the window
 * launch, the sky flight (journey → skills → projects) and the beach landing
 * where the paper airplane unfolds into the contact form.
 */
export default function JourneyScene({ scrollEnabled }: { scrollEnabled: boolean }) {
  return (
    <group name="Journey Scene">
      <ScrollCameraManager enabled={scrollEnabled} />
      <CorridorScene />
      <PaperAirplaneActor />
      <FlightClouds />

      <JourneySection zStart={JOURNEY.journeyAnchorZ} />
      <SkillsSection zStart={JOURNEY.skillsAnchorZ} />
      <ProjectsSection zStart={JOURNEY.projectsAnchorZ} />

      <BeachContactSection />
    </group>
  );
}
