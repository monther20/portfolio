"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

import { contact, corridor, journeyMilestones, projects, projectUI, skills } from "@/data/portfolio";
import {
  AVATAR_FRAME_URLS,
  CLOUD_TEXTURE_URLS,
  CONTACT_BUTTON_TEXTURES,
  CONTACT_TEXTURES,
  CORRIDOR_TEXTURES,
} from "./assetPaths";

const CORRIDOR_TEX = CORRIDOR_TEXTURES.base;

/** Everything visible while walking the corridor. */
const CORRIDOR_ASSETS: (string | undefined)[] = [
  ...AVATAR_FRAME_URLS,
  CORRIDOR_TEXTURES.floor,
  CORRIDOR_TEXTURES.wall,
  CORRIDOR_TEXTURES.ceiling,
  `${CORRIDOR_TEX}/drzewkowdoniczce.webp`,
  `${CORRIDOR_TEX}/kwiatekwdoniczce.webp`,
  `${CORRIDOR_TEX}/szafkaprzod.webp`,
  `${CORRIDOR_TEX}/szafkaprzod_sides.png`,
  `${CORRIDOR_TEX}/kratkawentylacyjna.webp`,
  `${CORRIDOR_TEX}/ramkanazdjecieduza.webp`,
  `${CORRIDOR_TEX}/ramkanazdjecieduza_painted.webp`,
  "/textures/shared/table.webp",
  ...corridor.stations.map((station) => station.art),
  ...corridor.doodles,
];

/** Everything in the sky flight (clouds, milestones, skills, projects). */
const SKY_ASSETS: (string | undefined)[] = [
  ...CLOUD_TEXTURE_URLS,
  ...journeyMilestones.map((milestone) => milestone.island),
  "/textures/journey/lantern.webp",
  ...skills.flatMap((skill) => [skill.balloon.sketch, skill.balloon.painted]),
  ...projects.flatMap((project) => [project.panel.sketch, project.panel.painted]),
  projectUI.openLive,
  projectUI.paperTexture,
];

/** The beach landing + contact scene. */
const BEACH_ASSETS: (string | undefined)[] = [
  CONTACT_TEXTURES.waves,
  CONTACT_TEXTURES.lighthouse,
  CONTACT_TEXTURES.ship,
  CONTACT_TEXTURES.boardwalkWood,
  ...Object.entries(CONTACT_BUTTON_TEXTURES)
    .filter(([key]) => key !== "linkedin" || Boolean(contact.linkedin))
    .map(([, texture]) => texture),
];

function preloadAll(urls: (string | undefined)[]) {
  const unique = new Set(urls.filter((url): url is string => Boolean(url)));
  unique.forEach((url) => useLoader.preload(THREE.TextureLoader, url));
}

/**
 * AssetPreloader — warms the r3f texture cache in the background while the
 * visitor is still in the room, staged in journey order so nothing pops in:
 * corridor first, then the sky flight, then the beach.
 */
export default function AssetPreloader() {
  useEffect(() => {
    const timers = [
      window.setTimeout(() => preloadAll(CORRIDOR_ASSETS), 600),
      window.setTimeout(() => preloadAll(SKY_ASSETS), 3500),
      window.setTimeout(() => preloadAll(BEACH_ASSETS), 7000),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return null;
}
