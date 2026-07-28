"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { Text, useGLTF } from "@react-three/drei";

import {
  corridor,
  journeyMilestones,
  projects,
  projectUI,
  skills,
} from "@/data/portfolio";
import {
  AVATAR_FRAME_URLS,
  CLOUD_TEXTURE_URLS,
  CONTACT_BUTTON_TEXTURES,
  CONTACT_TEXTURES,
  CORRIDOR_TEXTURES,
  PAPER_AIRPLANE_MODEL_URL,
} from "./assetPaths";

const CORRIDOR_TEXTURE_BASE = "/textures/corridor";
const HANDWRITTEN_FONT = "/fonts/Caveat-Variable.ttf";

export type BehindDoorAssetStage = {
  id: string;
  textures: string[];
  models?: string[];
  fonts?: boolean;
};

function unique(urls: readonly string[]): string[] {
  return [...new Set(urls)];
}

/**
 * Assets are ordered by camera distance from the entrance. A stage does not
 * begin until every asset in the preceding stage has entered the R3F cache.
 */
export const BEHIND_DOOR_ASSET_STAGES: BehindDoorAssetStage[] = [
  {
    id: "corridor-entrance",
    fonts: true,
    textures: unique([
      CORRIDOR_TEXTURES.floor,
      CORRIDOR_TEXTURES.wall,
      CORRIDOR_TEXTURES.ceiling,
      ...corridor.doodles,
      ...AVATAR_FRAME_URLS,
    ]),
  },
  {
    id: "corridor-near",
    textures: unique([
      `${CORRIDOR_TEXTURE_BASE}/drzewkowdoniczce.webp`,
      corridor.stations[0].art,
      `${CORRIDOR_TEXTURE_BASE}/ramkanazdjecieduza.webp`,
      `${CORRIDOR_TEXTURE_BASE}/ramkanazdjecieduza_painted.webp`,
    ]),
  },
  {
    id: "corridor-far",
    textures: unique([
      `${CORRIDOR_TEXTURE_BASE}/kwiatekwdoniczce.webp`,
      `${CORRIDOR_TEXTURE_BASE}/kratkawentylacyjna.webp`,
      corridor.stations[1].art,
      `${CORRIDOR_TEXTURE_BASE}/szafkaprzod.webp`,
      `${CORRIDOR_TEXTURE_BASE}/szafkaprzod_sides.png`,
    ]),
  },
  {
    id: "window-and-airplane",
    textures: [
      `${CORRIDOR_TEXTURE_BASE}/window/window_frame.png`,
      `${CORRIDOR_TEXTURE_BASE}/window/window_left_side.png`,
      `${CORRIDOR_TEXTURE_BASE}/window/window_right_side.png`,
    ],
    models: [PAPER_AIRPLANE_MODEL_URL],
  },
  {
    id: "flight-clouds",
    textures: unique(CLOUD_TEXTURE_URLS),
  },
  {
    id: "journey-milestones",
    textures: unique(
      journeyMilestones.flatMap((milestone) =>
        milestone.island ? [milestone.island] : [],
      ),
    ),
  },
  {
    id: "skills",
    textures: unique(
      skills.flatMap((skill) => [
        skill.balloon.sketch,
        ...(skill.balloon.painted ? [skill.balloon.painted] : []),
      ]),
    ),
  },
  {
    id: "projects",
    textures: unique([
      ...projects.flatMap((project) => [
        project.panel.sketch,
        ...(project.panel.painted ? [project.panel.painted] : []),
      ]),
      projectUI.openLive,
    ]),
  },
  {
    id: "beach-contact",
    textures: unique([
      ...Object.values(CONTACT_TEXTURES),
      ...Object.values(CONTACT_BUTTON_TEXTURES),
    ]),
  },
];

function TextureAssetBatch({ urls }: { urls: string[] }) {
  useLoader(THREE.TextureLoader, urls);
  return null;
}

function ModelAssetBatch({ urls }: { urls: string[] }) {
  useGLTF(urls);
  return null;
}

/** Warm both Troika font variants used by text behind the entrance door. */
function CorridorFontBatch() {
  return (
    <>
      <Text visible={false} font={HANDWRITTEN_FONT} sdfGlyphSize={128}>
        preload
      </Text>
      <Text visible={false} sdfGlyphSize={128}>
        preload
      </Text>
    </>
  );
}

function StageComplete({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Leave a short breathing window between distance-ordered batches.
    const timeout = window.setTimeout(onComplete, 180);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return null;
}

/**
 * Loads journey assets after the room loader has gone. Nothing is added to the
 * visible scene; useLoader/useGLTF only warm their shared parsed-asset caches.
 */
export default function BehindDoorAssetPreloader({
  enabled,
}: {
  enabled: boolean;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const completeStage = useCallback(() => {
    setStageIndex((current) => current + 1);
  }, []);

  const stage = BEHIND_DOOR_ASSET_STAGES[stageIndex];
  if (!enabled || !stage) return null;

  return (
    <Suspense key={stage.id} fallback={null}>
      {stage.textures.length > 0 ? (
        <TextureAssetBatch urls={stage.textures} />
      ) : null}
      {stage.models && stage.models.length > 0 ? (
        <ModelAssetBatch urls={stage.models} />
      ) : null}
      {stage.fonts ? <CorridorFontBatch /> : null}
      <StageComplete onComplete={completeStage} />
    </Suspense>
  );
}
