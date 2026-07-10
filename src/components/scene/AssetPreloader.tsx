"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

import { corridor, journeyMilestones, projects, projectUI, skills } from "@/data/portfolio";

const CORRIDOR_TEX = "/textures/textures/corridor";
const CONTACT_TEX = "/textures/textures/contact";
const CLOUD_TEX = "/textures/textures/clouds";

const CLOUD_FILES = [
  "1131c3eb-dfae-423f-924b-ff39d8ccd6dc",
  "254b8ec8-d6f7-4275-956f-7bab65b2ce2d",
  "2cc88dd1-483c-466d-b07e-f8308c61ccbe",
  "5606fcc0-3252-447d-a58a-7bcbac73229a",
  "7882dc72-3d01-41fb-ac0e-d07b0184ebc1",
  "9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35",
  "c83293c6-d90c-4a32-8d9d-5ac9af7e2296",
  "f6e358bc-d27c-41dd-95f4-6787a835c41e",
];

/** Everything visible while walking the corridor. */
const CORRIDOR_ASSETS: (string | undefined)[] = [
  ...Array.from({ length: 9 }, (_, i) => `${CORRIDOR_TEX}/avatar_anim/${i + 1}.webp`),
  `${CORRIDOR_TEX}/floor_wood.webp`,
  `${CORRIDOR_TEX}/wall_texture.webp`,
  `${CORRIDOR_TEX}/ceiling_texture.webp`,
  `${CORRIDOR_TEX}/bokilampy.webp`,
  `${CORRIDOR_TEX}/drzewkowdoniczce.webp`,
  `${CORRIDOR_TEX}/kwiatekwdoniczce.webp`,
  `${CORRIDOR_TEX}/szafkaprzod.webp`,
  `${CORRIDOR_TEX}/kratkawentylacyjna.webp`,
  `${CORRIDOR_TEX}/strzalka.webp`,
  `${CORRIDOR_TEX}/ramkanazdjecieduza.webp`,
  `${CORRIDOR_TEX}/ramkanazdjecieduza_painted.webp`,
  "/textures/textures/entrance/window_sketch.webp",
  "/textures/textures/entrance/window_bg.webp",
  "/textures/table.webp",
  ...corridor.stations.map((station) => station.art),
  ...corridor.doodles,
  ...corridor.logos.flatMap((logo) => [logo.sketch, logo.painted]),
];

/** Everything in the sky flight (clouds, milestones, skills, projects). */
const SKY_ASSETS: (string | undefined)[] = [
  ...CLOUD_FILES.map((file) => `${CLOUD_TEX}/${file}.webp`),
  ...journeyMilestones.map((milestone) => milestone.island),
  "/textures/lantern.webp",
  ...skills.flatMap((skill) => [skill.balloon.sketch, skill.balloon.painted]),
  ...projects.flatMap((project) => [project.panel.sketch, project.panel.painted]),
  projectUI.openLive,
  projectUI.paperTexture,
];

/** The beach landing + contact scene. */
const BEACH_ASSETS: (string | undefined)[] = [
  `${CONTACT_TEX}/faletopdown.webp`,
  `${CONTACT_TEX}/latarnia.webp`,
  `${CONTACT_TEX}/statek.webp`,
  `${CONTACT_TEX}/molo.webp`,
  `${CONTACT_TEX}/beczka.webp`,
  `${CONTACT_TEX}/beczka_painted.webp`,
  `${CONTACT_TEX}/backups/maillink.webp`,
  `${CONTACT_TEX}/backups/githublink.webp`,
  `${CONTACT_TEX}/backups/linkedinlink.webp`,
  "/textures/mountain.webp",
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
