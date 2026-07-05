"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Float, Html } from "@react-three/drei";

import PaintSprite from "./PaintSprite";
import PartingItem, { seededRange } from "./PartingItem";
import AboutSection from "./sections/AboutSection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import ContactSection from "./sections/ContactSection";
import { about, projects, skills } from "@/data/portfolio";

// ── Section anchors along -z (spread far apart so you meet them one at a time) ──
export const SECTION_Z = {
  about: -36,
  skills: -78,
  projects: -114,
  contact: -148,
};

const ENABLE_JOURNEY_DEBUG_GUI = process.env.NODE_ENV !== "production";
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

const CLOUD_NUMBER_BADGE_STYLE: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  color: "#ffffff",
  background: "rgba(17, 24, 39, 0.84)",
  border: "1px solid rgba(255, 255, 255, 0.9)",
  boxShadow: "0 3px 10px rgba(0, 0, 0, 0.35)",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
  pointerEvents: "none",
  userSelect: "none",
};

type GuiLike = any;

type DebugTransform = {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  scale: number;
  renderOrder: number;
};

type DebugSection = DebugTransform & {
  anchorZ: number;
};

type AirplaneDebug = {
  visible: boolean;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  scale: number;
  renderOrder: number;
  paperColor: string;
  edgeColor: string;
  lineColor: string;
  roughness: number;
  metalness: number;
  edgeLinewidth: number;
  edgeThreshold: number;
  centerLineWidth: number;
  rollStrength: number;
  rollFrequency: number;
  rollSpeed: number;
  pitchBase: number;
  pitchStrength: number;
  pitchFrequency: number;
  pitchSpeed: number;
  yawStrength: number;
  yawFrequency: number;
  yawSpeed: number;
};

type CloudDebug = {
  label: string;
  tex: string;
  visible: boolean;
  showNumber: boolean;
  x: number;
  y: number;
  z: number;
  spriteX: number;
  spriteY: number;
  spriteZ: number;
  scale: number;
  height: number;
  renderOrder: number;
  push: number;
  lift: number;
  forward: number;
  influenceDistance: number;
  lerp: number;
  floatSpeed: number;
  rotationIntensity: number;
  floatIntensity: number;
  floatMin: number;
  floatMax: number;
};

// Permanent lil-gui cloud tweaks copied from the debug panel.
// Keys are zero-based cloud indexes: 1 = Cloud 02, 10 = Cloud 11, etc.
const CLOUD_DEBUG_OVERRIDES: Record<number, Partial<CloudDebug>> = {
  1: { x: 4.48 },
  10: { y: 0.74, z: -63.89 },
  12: { spriteX: -0.24, spriteY: -0.16, spriteZ: -0.00999999999999979, height: 0.84 },
  13: { x: 4.1, spriteY: -1.96 },
  19: { spriteY: 0.38 },
  22: { spriteX: 1.94, spriteY: 0.62 },
};

type CloudsDebug = DebugTransform & {
  showNumbers: boolean;
  items: CloudDebug[];
};

type SectionSpriteDebug = {
  label: string;
  visible: boolean;
  x: number;
  y: number;
  z: number;
  spriteX: number;
  spriteY: number;
  spriteZ: number;
  scale: number;
  height: number;
  renderOrder: number;
  push: number;
  lift: number;
  forward: number;
  influenceDistance: number;
  lerp: number;
  floatSpeed: number;
  rotationIntensity: number;
  floatIntensity: number;
  floatMin: number;
  floatMax: number;
  revealNear: number;
  revealFar: number;
  hoverScale: number;
};

type ProjectPaperDebug = SectionSpriteDebug & {
  phase: number;
  focusedDistance: number;
  focusedLerp: number;
  focusedQuaternionLerp: number;
  focusedRevealNear: number;
  focusedRevealFar: number;
  driftX: number;
  driftY: number;
  driftZ: number;
  swayZ: number;
  swayY: number;
  swayLerp: number;
  buttonVisible: boolean;
  buttonX: number;
  buttonY: number;
  buttonZ: number;
  buttonHeight: number;
  buttonRenderOrder: number;
  buttonHoverScale: number;
};

type ContactSeaDebug = {
  label: string;
  visible: boolean;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  renderOrder: number;
  color: string;
  opacity: number;
};

type ContactHtmlDebug = {
  label: string;
  visible: boolean;
  x: number;
  y: number;
  z: number;
  scale: number;
  width: number;
  distanceFactor: number;
  zIndexMax: number;
  zIndexMin: number;
};

type AboutDebugSection = DebugSection & {
  avatar: SectionSpriteDebug;
  islands: SectionSpriteDebug[];
};

type SkillsDebugSection = DebugSection & {
  items: SectionSpriteDebug[];
};

type ProjectsDebugSection = DebugSection & {
  items: ProjectPaperDebug[];
};

type ContactDebugSection = DebugSection & {
  sea: ContactSeaDebug;
  lighthouse: SectionSpriteDebug;
  ship: SectionSpriteDebug;
  pier: SectionSpriteDebug;
  barrel: SectionSpriteDebug;
  card: SectionSpriteDebug;
  linksHtml: ContactHtmlDebug;
  sendButton: SectionSpriteDebug;
};

type JourneyDebugState = {
  scene: DebugTransform;
  airplane: AirplaneDebug;
  clouds: CloudsDebug;
  sections: {
    about: AboutDebugSection;
    skills: SkillsDebugSection;
    projects: ProjectsDebugSection;
    contact: ContactDebugSection;
  };
};

function createTransform(renderOrder = 0): DebugTransform {
  return {
    visible: true,
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    renderOrder,
  };
}

function createSection(anchorZ: number): DebugSection {
  return {
    ...createTransform(),
    anchorZ,
  };
}

function createSectionSpriteDebug(
  label: string,
  home: [number, number, number],
  overrides: Partial<SectionSpriteDebug> = {},
): SectionSpriteDebug {
  return {
    label,
    visible: true,
    x: home[0],
    y: home[1],
    z: home[2],
    spriteX: 0,
    spriteY: 0,
    spriteZ: 0,
    scale: 1,
    height: 2,
    renderOrder: 0,
    push: 2.6,
    lift: 0.45,
    forward: 0.45,
    influenceDistance: 9.5,
    lerp: 0.09,
    floatSpeed: 1,
    rotationIntensity: 0,
    floatIntensity: 0,
    floatMin: 0,
    floatMax: 0,
    revealNear: 12,
    revealFar: 26,
    hoverScale: 1.04,
    ...overrides,
  };
}

function createAboutSectionDebug(anchorZ: number): AboutDebugSection {
  const avatarHome = [seededRange("about-avatar-x", -0.45, 0.45), 0.4, anchorZ] as [number, number, number];
  const islands = about.islands
    .filter((isl) => isl.show)
    .map((isl, i) => {
      const side = seededRange(`about-island-${i}-side`, 0, 1) < 0.5 ? -1 : 1;
      const x = side * seededRange(`about-island-${i}-x`, 2.4, 4.5);
      const y = seededRange(`about-island-${i}-y`, -2.05, -1.3);
      const z = anchorZ - 10 - i * 7 - seededRange(`about-island-${i}-z`, 0.4, 3.4);

      return createSectionSpriteDebug(isl.label || `Island ${i + 1}`, [x, y, z], {
        height: 1.9,
        push: 2.8,
        lift: 0.4,
        forward: 0.45,
        floatSpeed: 1.1,
        floatIntensity: 0.4,
        floatMin: -0.18,
        floatMax: 0.18,
        revealNear: 8,
        revealFar: 20,
      });
    });

  return {
    ...createSection(anchorZ),
    avatar: createSectionSpriteDebug("Avatar", avatarHome, {
      height: 3,
      push: 2.4,
      lift: 0.5,
      forward: 0.5,
      floatSpeed: 1.4,
      rotationIntensity: 0.12,
      floatIntensity: 0.5,
      floatMin: -0.12,
      floatMax: 0.2,
      revealNear: 9,
      revealFar: 24,
    }),
    islands,
  };
}

function createSkillsSectionDebug(anchorZ: number): SkillsDebugSection {
  const sizeToHeight: Record<"S" | "M" | "L", number> = { S: 1.3, M: 1.7, L: 2.1 };
  const itemsPerChunk = 3;
  const chunkDepth = 7.5;

  return {
    ...createSection(anchorZ),
    items: skills.map((skill, i) => {
      const chunk = Math.floor(i / itemsPerChunk);
      const lane = (i % itemsPerChunk) - 1;
      const side = lane === 0 ? (seededRange(`${skill.label}-side`, 0, 1) < 0.5 ? -1 : 1) : lane;
      const x = lane === 0
        ? seededRange(`${skill.label}-center-x`, -1.1, 1.1)
        : side * seededRange(`${skill.label}-outer-x`, 2.3, 4.4);
      const y = seededRange(`${skill.label}-y`, -1.05, 2.1);
      const z = anchorZ - chunk * chunkDepth - seededRange(`${skill.label}-z`, 0.8, chunkDepth - 0.7);
      const speed = seededRange(`${skill.label}-speed`, 1, 1.75);

      return createSectionSpriteDebug(skill.label, [x, y, z], {
        height: sizeToHeight[skill.size],
        push: 2.7,
        lift: 0.5,
        forward: 0.4,
        floatSpeed: speed,
        rotationIntensity: 0.2,
        floatIntensity: 0.7,
        floatMin: -0.3,
        floatMax: 0.3,
        revealNear: 9,
        revealFar: 22,
        hoverScale: 1.08,
      });
    }),
  };
}

function createProjectsSectionDebug(anchorZ: number): ProjectsDebugSection {
  const itemsPerChunk = 2;
  const chunkDepth = 9;

  return {
    ...createSection(anchorZ),
    items: projects.map((project, i) => {
      const chunk = Math.floor(i / itemsPerChunk);
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * seededRange(`${project.name}-x`, 2.3, 4.4);
      const y = seededRange(`${project.name}-y`, 0.1, 2.6);
      const z = anchorZ - chunk * chunkDepth - seededRange(`${project.name}-z`, 1.0, chunkDepth - 0.8);
      const phase = seededRange(`${project.name}-phase`, 0, Math.PI * 2);

      return {
        ...createSectionSpriteDebug(project.name, [x, y, z], {
          height: 2.5,
          revealNear: 9,
          revealFar: 22,
          hoverScale: 1.05,
          push: 2.8,
          lift: 0.5,
          forward: 0.4,
          influenceDistance: 9.5,
          lerp: 0.06,
        }),
        phase,
        focusedDistance: 4.6,
        focusedLerp: 0.12,
        focusedQuaternionLerp: 0.15,
        focusedRevealNear: 30,
        focusedRevealFar: 40,
        driftX: 0.5,
        driftY: 0.35,
        driftZ: 0.3,
        swayZ: 0.12,
        swayY: 0.15,
        swayLerp: 0.05,
        buttonVisible: true,
        buttonX: 0,
        buttonY: -2.5 / 2 - 0.7,
        buttonZ: 0.05,
        buttonHeight: 0.6,
        buttonRenderOrder: 0,
        buttonHoverScale: 1.12,
      };
    }),
  };
}

function createContactSectionDebug(anchorZ: number): ContactDebugSection {
  const homes = {
    lighthouse: [seededRange("contact-lighthouse-x", -6.4, -4.7), seededRange("contact-lighthouse-y", -0.25, 0.35), anchorZ - seededRange("contact-lighthouse-z", 7.2, 9.8)] as [number, number, number],
    ship: [seededRange("contact-ship-x", 3.5, 5.4), seededRange("contact-ship-y", -2.1, -1.4), anchorZ - seededRange("contact-ship-z", 5.2, 7.4)] as [number, number, number],
    pier: [seededRange("contact-pier-x", -2.1, -0.7), seededRange("contact-pier-y", -2.95, -2.45), anchorZ - seededRange("contact-pier-z", 1.4, 3.0)] as [number, number, number],
    barrel: [seededRange("contact-barrel-x", 1.7, 3.1), seededRange("contact-barrel-y", -2.95, -2.45), anchorZ - seededRange("contact-barrel-z", 0.4, 2.0)] as [number, number, number],
    card: [seededRange("contact-card-x", -0.45, 0.45), 0.3, anchorZ - seededRange("contact-card-z", 0.4, 1.4)] as [number, number, number],
  };

  return {
    ...createSection(anchorZ),
    sea: {
      label: "Sea",
      visible: true,
      x: 0,
      y: -3.6,
      z: anchorZ - 8,
      width: 60,
      depth: 60,
      renderOrder: 0,
      color: "#bcd3e0",
      opacity: 0.85,
    },
    lighthouse: createSectionSpriteDebug("Lighthouse", homes.lighthouse, {
      height: 4.6,
      push: 2.9,
      lift: 0.45,
      forward: 0.45,
      floatSpeed: 1,
      floatIntensity: 0.3,
      floatMin: -0.1,
      floatMax: 0.15,
      revealNear: 14,
      revealFar: 32,
    }),
    ship: createSectionSpriteDebug("Ship", homes.ship, {
      height: 2.3,
      push: 2.9,
      lift: 0.45,
      forward: 0.45,
      floatSpeed: 1.3,
      rotationIntensity: 0.1,
      floatIntensity: 0.5,
      floatMin: -0.2,
      floatMax: 0.2,
      revealNear: 13,
      revealFar: 28,
    }),
    pier: createSectionSpriteDebug("Pier", homes.pier, {
      height: 1.8,
      push: 2.3,
      lift: 0.35,
      forward: 0.35,
      revealNear: 12,
      revealFar: 26,
    }),
    barrel: createSectionSpriteDebug("Barrel", homes.barrel, {
      height: 1.2,
      push: 2.3,
      lift: 0.35,
      forward: 0.35,
      revealNear: 10,
      revealFar: 22,
    }),
    card: createSectionSpriteDebug("Contact card", homes.card, {
      height: 2.9,
      push: 2.6,
      lift: 0.5,
      forward: 0.4,
      revealNear: 13,
      revealFar: 26,
    }),
    linksHtml: {
      label: "Contact links HTML",
      visible: true,
      x: 0,
      y: -0.05,
      z: 0.1,
      scale: 1,
      width: 200,
      distanceFactor: 6.5,
      zIndexMax: 30,
      zIndexMin: 0,
    },
    sendButton: createSectionSpriteDebug("Send button", [0, -1.95, 0.1], {
      height: 0.65,
      hoverScale: 1.12,
    }),
  };
}

function createCloudDebugItems(): CloudDebug[] {
  const out: CloudDebug[] = [];
  const chunkCount = 11;
  const itemsPerChunk = 3;
  const chunkDepth = 12.5;

  for (let chunk = 0; chunk < chunkCount; chunk++) {
    for (let slot = 0; slot < itemsPerChunk; slot++) {
      const i = chunk * itemsPerChunk + slot;
      const tex = `${CLOUD_BASE}/${CLOUDS[i % CLOUDS.length]}.webp`;
      const lane = slot - 1;
      const side = lane === 0 ? (seededRange(`cloud-${i}-side`, 0, 1) < 0.5 ? -1 : 1) : lane;
      const x = lane === 0
        ? seededRange(`cloud-${i}-center-x`, -1.8, 1.8)
        : side * seededRange(`cloud-${i}-outer-x`, 2.4, 5.8);
      const y = seededRange(`cloud-${i}-y`, -1.0, 2.0);
      const z = -24 - chunk * chunkDepth - seededRange(`cloud-${i}-z`, 1.2, chunkDepth - 1.1);
      const height = seededRange(`cloud-${i}-height`, 1.1, 2.25);
      const speed = seededRange(`cloud-${i}-speed`, 0.55, 1.25);
      const float = seededRange(`cloud-${i}-float`, 0.24, 0.56);

      out.push({
        label: `Cloud ${String(i + 1).padStart(2, "0")}`,
        tex,
        visible: true,
        showNumber: true,
        x,
        y,
        z,
        spriteX: 0,
        spriteY: 0,
        spriteZ: 0,
        scale: 1,
        height,
        renderOrder: 0,
        push: 2.4,
        lift: 0.55,
        forward: 0.55,
        influenceDistance: 8.5,
        lerp: 0.09,
        floatSpeed: speed,
        rotationIntensity: 0.035,
        floatIntensity: float,
        floatMin: -0.2,
        floatMax: 0.2,
        ...(CLOUD_DEBUG_OVERRIDES[i] ?? {}),
      });
    }
  }

  return out;
}

function createJourneyDebugState(): JourneyDebugState {
  return {
    scene: createTransform(),
    airplane: {
      visible: true,
      offsetX: 0,
      offsetY: -0.46,
      offsetZ: -2.85,
      scale: 0.34,
      renderOrder: 1000,
      paperColor: "#faf8f1",
      edgeColor: "#8e8a82",
      lineColor: "#8e8a82",
      roughness: 0.88,
      metalness: 0,
      edgeLinewidth: 2,
      edgeThreshold: 15,
      centerLineWidth: 2,
      rollStrength: 0.18,
      rollFrequency: 0.28,
      rollSpeed: 0.55,
      pitchBase: 0.12,
      pitchStrength: 0.055,
      pitchFrequency: 0.42,
      pitchSpeed: 0.35,
      yawStrength: 0.08,
      yawFrequency: 0.2,
      yawSpeed: 0.45,
    },
    clouds: {
      ...createTransform(),
      showNumbers: true,
      items: createCloudDebugItems(),
    },
    sections: {
      about: createAboutSectionDebug(SECTION_Z.about),
      skills: createSkillsSectionDebug(SECTION_Z.skills),
      projects: createProjectsSectionDebug(SECTION_Z.projects),
      contact: createContactSectionDebug(SECTION_Z.contact),
    },
  };
}

function createDebugCopyText(label: string, payload: unknown) {
  return [
    `JourneyScene debug values: ${label}`,
    "Paste this back to me and I can make the values permanent in the code.",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function copyJourneyDebugValues(label: string, payload: unknown) {
  void copyTextToClipboard(createDebugCopyText(label, payload));
  console.info(`[JourneyScene debug] Copied ${label} values to clipboard.`);
}

function useJourneyDebugGui(
  debugRef: React.MutableRefObject<JourneyDebugState>,
  forceUpdate: React.Dispatch<React.SetStateAction<number>>,
) {
  useEffect(() => {
    if (!ENABLE_JOURNEY_DEBUG_GUI || typeof window === "undefined") return undefined;

    let gui: GuiLike | null = null;
    let disposed = false;
    const debug = debugRef.current;
    const refreshScene = () => forceUpdate((value) => value + 1);

    const addNumber = (
      folder: GuiLike,
      object: Record<string, any>,
      property: string,
      min?: number,
      max?: number,
      step?: number,
      label = property,
    ) => {
      const controller = min === undefined
        ? folder.add(object, property)
        : folder.add(object, property, min, max, step);
      controller.name(label).onChange(refreshScene);
      return controller;
    };

    const addBoolean = (folder: GuiLike, object: Record<string, any>, property: string, label = property) => {
      const controller = folder.add(object, property);
      controller.name(label).onChange(refreshScene);
      return controller;
    };

    const addColor = (folder: GuiLike, object: Record<string, any>, property: string, label = property) => {
      const controller = folder.addColor(object, property);
      controller.name(label).onChange(refreshScene);
      return controller;
    };

    const addButton = (folder: GuiLike, actions: Record<string, () => void>, property: string, label: string) => {
      const controller = folder.add(actions, property);
      controller.name(label);
      return controller;
    };

    const addTransformControls = (folder: GuiLike, transform: DebugTransform, label: string) => {
      const transformFolder = folder.addFolder(label);
      addBoolean(transformFolder, transform, "visible", "visible");
      addNumber(transformFolder, transform, "x", -20, 20, 0.01, "position x");
      addNumber(transformFolder, transform, "y", -20, 20, 0.01, "position y");
      addNumber(transformFolder, transform, "z", -240, 40, 0.01, "position z");
      addNumber(transformFolder, transform, "scale", 0.01, 8, 0.01, "scale");
      addNumber(transformFolder, transform, "renderOrder", -1000, 5000, 1, "z-index / renderOrder");
      return transformFolder;
    };

    const addSectionControls = (folder: GuiLike, section: DebugSection, label: string) => {
      const sectionFolder = addTransformControls(folder, section, label);
      addNumber(sectionFolder, section, "anchorZ", -240, 20, 0.1, "section anchor z");
      return sectionFolder;
    };

    const addSpriteItemControls = (folder: GuiLike, item: SectionSpriteDebug, label = item.label) => {
      const itemFolder = folder.addFolder(label);
      addButton(
        itemFolder,
        { copyItem: () => copyJourneyDebugValues(label, item) },
        "copyItem",
        `Copy ${label} values`,
      );
      addBoolean(itemFolder, item, "visible", "visible");
      addNumber(itemFolder, item, "x", -20, 20, 0.01, "position x");
      addNumber(itemFolder, item, "y", -12, 12, 0.01, "position y");
      addNumber(itemFolder, item, "z", -240, 20, 0.01, "position z");
      addNumber(itemFolder, item, "scale", 0.01, 8, 0.01, "scale");
      addNumber(itemFolder, item, "height", 0.05, 10, 0.01, "height");
      addNumber(itemFolder, item, "renderOrder", -1000, 5000, 1, "z-index / renderOrder");

      const spriteFolder = itemFolder.addFolder("sprite offset");
      addNumber(spriteFolder, item, "spriteX", -8, 8, 0.01, "sprite x");
      addNumber(spriteFolder, item, "spriteY", -8, 8, 0.01, "sprite y");
      addNumber(spriteFolder, item, "spriteZ", -8, 8, 0.01, "sprite z");
      spriteFolder.close();

      const revealFolder = itemFolder.addFolder("reveal + hover");
      addNumber(revealFolder, item, "revealNear", 0, 60, 0.1, "reveal near");
      addNumber(revealFolder, item, "revealFar", 0, 80, 0.1, "reveal far");
      addNumber(revealFolder, item, "hoverScale", 0.5, 3, 0.01, "hover scale");
      revealFolder.close();

      const partingFolder = itemFolder.addFolder("parting behavior");
      addNumber(partingFolder, item, "push", -10, 10, 0.01, "push");
      addNumber(partingFolder, item, "lift", -10, 10, 0.01, "lift");
      addNumber(partingFolder, item, "forward", -10, 10, 0.01, "forward");
      addNumber(partingFolder, item, "influenceDistance", 0.1, 40, 0.01, "influence distance");
      addNumber(partingFolder, item, "lerp", 0.001, 1, 0.001, "lerp");
      partingFolder.close();

      const floatFolder = itemFolder.addFolder("float animation");
      addNumber(floatFolder, item, "floatSpeed", 0, 5, 0.01, "speed");
      addNumber(floatFolder, item, "rotationIntensity", 0, 2, 0.001, "rotation intensity");
      addNumber(floatFolder, item, "floatIntensity", 0, 2, 0.001, "float intensity");
      addNumber(floatFolder, item, "floatMin", -5, 5, 0.01, "floating range min");
      addNumber(floatFolder, item, "floatMax", -5, 5, 0.01, "floating range max");
      floatFolder.close();

      return itemFolder;
    };

    const addProjectItemControls = (folder: GuiLike, item: ProjectPaperDebug, label = item.label) => {
      const itemFolder = addSpriteItemControls(folder, item, label);

      const motionFolder = itemFolder.addFolder("project motion");
      addNumber(motionFolder, item, "phase", 0, Math.PI * 2, 0.001, "phase");
      addNumber(motionFolder, item, "focusedDistance", 1, 12, 0.01, "focused distance");
      addNumber(motionFolder, item, "focusedLerp", 0.001, 1, 0.001, "focused position lerp");
      addNumber(motionFolder, item, "focusedQuaternionLerp", 0.001, 1, 0.001, "focused rotation lerp");
      addNumber(motionFolder, item, "focusedRevealNear", 0, 80, 0.1, "focused reveal near");
      addNumber(motionFolder, item, "focusedRevealFar", 0, 100, 0.1, "focused reveal far");
      addNumber(motionFolder, item, "driftX", 0, 5, 0.01, "drift x");
      addNumber(motionFolder, item, "driftY", 0, 5, 0.01, "drift y");
      addNumber(motionFolder, item, "driftZ", 0, 5, 0.01, "drift z");
      addNumber(motionFolder, item, "swayZ", 0, 2, 0.001, "sway z");
      addNumber(motionFolder, item, "swayY", 0, 2, 0.001, "sway y");
      addNumber(motionFolder, item, "swayLerp", 0.001, 1, 0.001, "sway lerp");
      motionFolder.close();

      const buttonFolder = itemFolder.addFolder("open-live button");
      addBoolean(buttonFolder, item, "buttonVisible", "visible");
      addNumber(buttonFolder, item, "buttonX", -8, 8, 0.01, "position x");
      addNumber(buttonFolder, item, "buttonY", -8, 8, 0.01, "position y");
      addNumber(buttonFolder, item, "buttonZ", -8, 8, 0.01, "position z");
      addNumber(buttonFolder, item, "buttonHeight", 0.05, 4, 0.01, "height");
      addNumber(buttonFolder, item, "buttonRenderOrder", -1000, 5000, 1, "z-index / renderOrder");
      addNumber(buttonFolder, item, "buttonHoverScale", 0.5, 3, 0.01, "hover scale");
      buttonFolder.close();

      return itemFolder;
    };

    const addSeaControls = (folder: GuiLike, sea: ContactSeaDebug) => {
      const seaFolder = folder.addFolder(sea.label);
      addButton(seaFolder, { copySea: () => copyJourneyDebugValues(sea.label, sea) }, "copySea", "Copy Sea values");
      addBoolean(seaFolder, sea, "visible", "visible");
      addNumber(seaFolder, sea, "x", -20, 20, 0.01, "position x");
      addNumber(seaFolder, sea, "y", -12, 12, 0.01, "position y");
      addNumber(seaFolder, sea, "z", -240, 20, 0.01, "position z");
      addNumber(seaFolder, sea, "width", 1, 120, 0.1, "width");
      addNumber(seaFolder, sea, "depth", 1, 120, 0.1, "depth");
      addNumber(seaFolder, sea, "renderOrder", -1000, 5000, 1, "z-index / renderOrder");
      addColor(seaFolder, sea, "color", "color");
      addNumber(seaFolder, sea, "opacity", 0, 1, 0.01, "opacity");
      return seaFolder;
    };

    const addHtmlControls = (folder: GuiLike, html: ContactHtmlDebug) => {
      const htmlFolder = folder.addFolder(html.label);
      addButton(htmlFolder, { copyHtml: () => copyJourneyDebugValues(html.label, html) }, "copyHtml", `Copy ${html.label} values`);
      addBoolean(htmlFolder, html, "visible", "visible");
      addNumber(htmlFolder, html, "x", -8, 8, 0.01, "position x");
      addNumber(htmlFolder, html, "y", -8, 8, 0.01, "position y");
      addNumber(htmlFolder, html, "z", -8, 8, 0.01, "position z");
      addNumber(htmlFolder, html, "scale", 0.1, 5, 0.01, "scale");
      addNumber(htmlFolder, html, "width", 20, 600, 1, "width");
      addNumber(htmlFolder, html, "distanceFactor", 0.1, 20, 0.01, "distance factor");
      addNumber(htmlFolder, html, "zIndexMax", -1000, 100000, 1, "z-index max");
      addNumber(htmlFolder, html, "zIndexMin", -1000, 100000, 1, "z-index min");
      return htmlFolder;
    };

    const setupGui = async () => {
      const { default: GUI } = await import("lil-gui");
      if (disposed) return;

      gui = new GUI({ title: "JourneyScene debug", width: 360 });
      gui.domElement.style.zIndex = "999999";

      const copyActions = {
        copyAllValues: () => copyJourneyDebugValues("all panel", debug),
        copyCloudValues: () => copyJourneyDebugValues("all clouds", debug.clouds),
        copySectionValues: () => copyJourneyDebugValues("all sections", debug.sections),
      };
      addButton(gui, copyActions, "copyAllValues", "Copy all values");
      addButton(gui, copyActions, "copyCloudValues", "Copy cloud values");
      addButton(gui, copyActions, "copySectionValues", "Copy section values");

      const sceneFolder = addTransformControls(gui, debug.scene, "Scene root");
      sceneFolder.close();

      const airplaneFolder = gui.addFolder("Paper airplane");
      addBoolean(airplaneFolder, debug.airplane, "visible", "visible");
      addNumber(airplaneFolder, debug.airplane, "offsetX", -5, 5, 0.01, "position offset x");
      addNumber(airplaneFolder, debug.airplane, "offsetY", -5, 5, 0.01, "position offset y");
      addNumber(airplaneFolder, debug.airplane, "offsetZ", -10, 2, 0.01, "position offset z");
      addNumber(airplaneFolder, debug.airplane, "scale", 0.01, 3, 0.01, "scale");
      addNumber(airplaneFolder, debug.airplane, "renderOrder", -1000, 5000, 1, "z-index / renderOrder");

      const airplaneMaterialFolder = airplaneFolder.addFolder("material + lines");
      addColor(airplaneMaterialFolder, debug.airplane, "paperColor", "paper color");
      addColor(airplaneMaterialFolder, debug.airplane, "edgeColor", "edge color");
      addColor(airplaneMaterialFolder, debug.airplane, "lineColor", "fold line color");
      addNumber(airplaneMaterialFolder, debug.airplane, "roughness", 0, 1, 0.01, "roughness");
      addNumber(airplaneMaterialFolder, debug.airplane, "metalness", 0, 1, 0.01, "metalness");
      addNumber(airplaneMaterialFolder, debug.airplane, "edgeLinewidth", 0.1, 10, 0.1, "edge linewidth");
      addNumber(airplaneMaterialFolder, debug.airplane, "edgeThreshold", 0, 90, 1, "edge threshold");
      addNumber(airplaneMaterialFolder, debug.airplane, "centerLineWidth", 0.1, 10, 0.1, "fold line width");
      airplaneMaterialFolder.close();

      const airplaneMotionFolder = airplaneFolder.addFolder("flight wobble");
      addNumber(airplaneMotionFolder, debug.airplane, "rollStrength", 0, 1, 0.001, "roll strength");
      addNumber(airplaneMotionFolder, debug.airplane, "rollFrequency", 0, 2, 0.001, "roll frequency");
      addNumber(airplaneMotionFolder, debug.airplane, "rollSpeed", 0, 3, 0.001, "roll speed");
      addNumber(airplaneMotionFolder, debug.airplane, "pitchBase", -1, 1, 0.001, "pitch base");
      addNumber(airplaneMotionFolder, debug.airplane, "pitchStrength", 0, 1, 0.001, "pitch strength");
      addNumber(airplaneMotionFolder, debug.airplane, "pitchFrequency", 0, 2, 0.001, "pitch frequency");
      addNumber(airplaneMotionFolder, debug.airplane, "pitchSpeed", 0, 3, 0.001, "pitch speed");
      addNumber(airplaneMotionFolder, debug.airplane, "yawStrength", 0, 1, 0.001, "yaw strength");
      addNumber(airplaneMotionFolder, debug.airplane, "yawFrequency", 0, 2, 0.001, "yaw frequency");
      addNumber(airplaneMotionFolder, debug.airplane, "yawSpeed", 0, 3, 0.001, "yaw speed");
      airplaneMotionFolder.close();

      const cloudFolder = gui.addFolder("Flight clouds");
      addBoolean(cloudFolder, debug.clouds, "showNumbers", "show cloud numbers");
      const cloudTransformFolder = addTransformControls(cloudFolder, debug.clouds, "Cloud group");
      cloudTransformFolder.close();

      const cloudItemsFolder = cloudFolder.addFolder("Individual clouds");
      debug.clouds.items.forEach((cloud, i) => {
        const itemFolder = cloudItemsFolder.addFolder(cloud.label);
        addButton(
          itemFolder,
          { copyThisCloud: () => copyJourneyDebugValues(cloud.label, { index: i, cloud }) },
          "copyThisCloud",
          `Copy ${cloud.label} values`,
        );
        addBoolean(itemFolder, cloud, "visible", "visible");
        addBoolean(itemFolder, cloud, "showNumber", "show number label");
        addNumber(itemFolder, cloud, "x", -12, 12, 0.01, "position x");
        addNumber(itemFolder, cloud, "y", -8, 8, 0.01, "position y");
        addNumber(itemFolder, cloud, "z", -220, 10, 0.01, "position z");
        addNumber(itemFolder, cloud, "spriteX", -5, 5, 0.01, "sprite offset x");
        addNumber(itemFolder, cloud, "spriteY", -5, 5, 0.01, "sprite offset y");
        addNumber(itemFolder, cloud, "spriteZ", -5, 5, 0.01, "sprite offset z");
        addNumber(itemFolder, cloud, "scale", 0.01, 8, 0.01, "scale");
        addNumber(itemFolder, cloud, "height", 0.1, 8, 0.01, "height");
        addNumber(itemFolder, cloud, "renderOrder", -1000, 5000, 1, "z-index / renderOrder");

        const partingFolder = itemFolder.addFolder("parting behavior");
        addNumber(partingFolder, cloud, "push", -10, 10, 0.01, "push");
        addNumber(partingFolder, cloud, "lift", -10, 10, 0.01, "lift");
        addNumber(partingFolder, cloud, "forward", -10, 10, 0.01, "forward");
        addNumber(partingFolder, cloud, "influenceDistance", 0.1, 30, 0.01, "influence distance");
        addNumber(partingFolder, cloud, "lerp", 0.001, 1, 0.001, "lerp");
        partingFolder.close();

        const floatFolder = itemFolder.addFolder("float animation");
        addNumber(floatFolder, cloud, "floatSpeed", 0, 5, 0.01, "speed");
        addNumber(floatFolder, cloud, "rotationIntensity", 0, 2, 0.001, "rotation intensity");
        addNumber(floatFolder, cloud, "floatIntensity", 0, 2, 0.001, "float intensity");
        addNumber(floatFolder, cloud, "floatMin", -5, 5, 0.01, "floating range min");
        addNumber(floatFolder, cloud, "floatMax", -5, 5, 0.01, "floating range max");
        floatFolder.close();
        itemFolder.close();
      });
      cloudItemsFolder.close();
      cloudFolder.close();

      const sectionsFolder = gui.addFolder("Sections");

      const aboutFolder = addSectionControls(sectionsFolder, debug.sections.about, "About section");
      addButton(aboutFolder, { copyAbout: () => copyJourneyDebugValues("About section", debug.sections.about) }, "copyAbout", "Copy About values");
      const aboutItemsFolder = aboutFolder.addFolder("Individual items");
      addSpriteItemControls(aboutItemsFolder, debug.sections.about.avatar).close();
      debug.sections.about.islands.forEach((item) => addSpriteItemControls(aboutItemsFolder, item).close());
      aboutItemsFolder.close();
      aboutFolder.close();

      const skillsFolder = addSectionControls(sectionsFolder, debug.sections.skills, "Skills section");
      addButton(skillsFolder, { copySkills: () => copyJourneyDebugValues("Skills section", debug.sections.skills) }, "copySkills", "Copy Skills values");
      const skillItemsFolder = skillsFolder.addFolder("Individual skills");
      debug.sections.skills.items.forEach((item) => addSpriteItemControls(skillItemsFolder, item).close());
      skillItemsFolder.close();
      skillsFolder.close();

      const projectsFolder = addSectionControls(sectionsFolder, debug.sections.projects, "Projects section");
      addButton(projectsFolder, { copyProjects: () => copyJourneyDebugValues("Projects section", debug.sections.projects) }, "copyProjects", "Copy Projects values");
      const projectItemsFolder = projectsFolder.addFolder("Individual projects");
      debug.sections.projects.items.forEach((item) => addProjectItemControls(projectItemsFolder, item).close());
      projectItemsFolder.close();
      projectsFolder.close();

      const contactFolder = addSectionControls(sectionsFolder, debug.sections.contact, "Contact section");
      addButton(contactFolder, { copyContact: () => copyJourneyDebugValues("Contact section", debug.sections.contact) }, "copyContact", "Copy Contact values");
      const contactItemsFolder = contactFolder.addFolder("Individual contact items");
      addSeaControls(contactItemsFolder, debug.sections.contact.sea).close();
      addSpriteItemControls(contactItemsFolder, debug.sections.contact.lighthouse).close();
      addSpriteItemControls(contactItemsFolder, debug.sections.contact.ship).close();
      addSpriteItemControls(contactItemsFolder, debug.sections.contact.pier).close();
      addSpriteItemControls(contactItemsFolder, debug.sections.contact.barrel).close();
      addSpriteItemControls(contactItemsFolder, debug.sections.contact.card).close();
      addHtmlControls(contactItemsFolder, debug.sections.contact.linksHtml).close();
      addSpriteItemControls(contactItemsFolder, debug.sections.contact.sendButton).close();
      contactItemsFolder.close();
      contactFolder.close();

      sectionsFolder.close();
    };

    setupGui();

    return () => {
      disposed = true;
      gui?.destroy();
    };
  }, [debugRef, forceUpdate]);
}

function debugPosition(debug: { x: number; y: number; z: number }): [number, number, number] {
  return [debug.x, debug.y, debug.z];
}

function debugScale(debug: { scale: number }) {
  return debug.scale;
}

/**
 * PaperAirplane — an origami-style folded paper plane, inspired by ITom's About room.
 * It is built from one BufferGeometry, outlined with edges, and kept just in front of the camera.
 */
function PaperAirplane({ debug }: { debug: AirplaneDebug }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const localOffset = useMemo(() => new THREE.Vector3(), []);
  const worldOffset = useMemo(() => new THREE.Vector3(), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const wobbleEuler = useMemo(() => new THREE.Euler(0, 0, 0, "XYZ"), []);
  const wobbleQuaternion = useMemo(() => new THREE.Quaternion(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Nose tip
      0, 0, -1.5,
      // Wing tips
      -1.2, 0.05, 0.3,
      1.2, 0.05, 0.3,
      // Raised center fold
      0, 0.15, -0.5,
      0, 0.12, 0.5,
      // Tail
      -0.3, 0.08, 0.8,
      0.3, 0.08, 0.8,
      0, 0.1, 0.6,
      // Underside
      0, -0.02, -1.5,
      -1.2, -0.02, 0.3,
      1.2, -0.02, 0.3,
      0, 0, 0.5,
    ]);

    const indices = [
      0, 1, 3, 1, 4, 3, 1, 5, 4, 5, 7, 4,
      0, 3, 2, 3, 4, 2, 4, 6, 2, 4, 7, 6,
      8, 11, 9, 8, 10, 11,
      0, 8, 1, 8, 9, 1, 1, 9, 5,
      0, 2, 8, 8, 2, 10, 2, 6, 10,
      5, 9, 11, 5, 11, 7, 6, 7, 11, 6, 11, 10,
    ];

    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    const plane = groupRef.current;
    if (!plane) return;

    localOffset.set(debug.offsetX, debug.offsetY, debug.offsetZ);
    worldOffset.copy(localOffset).applyQuaternion(camera.quaternion);
    targetPosition.copy(camera.position).add(worldOffset);

    // No lerp here: the airplane is a cockpit/foreground object. It must stay locked
    // to the camera every frame, otherwise the camera moves first and the plane catches up.
    plane.position.copy(targetPosition);

    const flightDistance = Math.max(0, -19 - camera.position.z);
    const t = state.clock.elapsedTime;

    // Independent looping maneuvers: not tied to scroll direction, so it rolls/pitches/yaws
    // through a repeating flight pattern whether the user scrolls forward or backward.
    const roll = Math.sin(flightDistance * debug.rollFrequency + t * debug.rollSpeed) * debug.rollStrength;
    const pitch = debug.pitchBase + Math.sin(flightDistance * debug.pitchFrequency + t * debug.pitchSpeed) * debug.pitchStrength;
    const yaw = Math.sin(flightDistance * debug.yawFrequency + t * debug.yawSpeed) * debug.yawStrength;

    wobbleEuler.set(pitch, yaw, roll);
    wobbleQuaternion.setFromEuler(wobbleEuler);
    targetQuaternion.copy(camera.quaternion).multiply(wobbleQuaternion);
    plane.quaternion.copy(targetQuaternion);
  });

  return (
    <group ref={groupRef} scale={debug.scale} renderOrder={debug.renderOrder} visible={debug.visible}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={debug.paperColor}
          roughness={debug.roughness}
          metalness={debug.metalness}
          side={THREE.DoubleSide}
        />
        <Edges linewidth={debug.edgeLinewidth} threshold={debug.edgeThreshold} color={debug.edgeColor} />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, -1.5, 0, 0.15, -0.5, 0, 0.12, 0.5, 0, 0.1, 0.6]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={debug.lineColor} linewidth={debug.centerLineWidth} />
      </line>
    </group>
  );
}

function FlightCloud({ cloud, showNumber }: { cloud: CloudDebug; showNumber: boolean }) {
  const cloudNumber = cloud.label.replace("Cloud ", "");
  const floatingRange: [number, number] = [
    Math.min(cloud.floatMin, cloud.floatMax),
    Math.max(cloud.floatMin, cloud.floatMax),
  ];

  return (
    <group visible={cloud.visible} scale={cloud.scale} renderOrder={cloud.renderOrder}>
      <PartingItem
        home={[cloud.x, cloud.y, cloud.z]}
        push={cloud.push}
        lift={cloud.lift}
        forward={cloud.forward}
        influenceDistance={cloud.influenceDistance}
        lerp={cloud.lerp}
      >
        <Float
          speed={cloud.floatSpeed}
          rotationIntensity={cloud.rotationIntensity}
          floatIntensity={cloud.floatIntensity}
          floatingRange={floatingRange}
        >
          <PaintSprite
            sketch={cloud.tex}
            position={[cloud.spriteX, cloud.spriteY, cloud.spriteZ]}
            height={cloud.height}
            renderOrder={cloud.renderOrder}
            autoReveal={false}
            billboard
          />
          {ENABLE_JOURNEY_DEBUG_GUI && showNumber && cloud.showNumber ? (
            <Html
              center
              position={[cloud.spriteX, cloud.spriteY, cloud.spriteZ + 0.08]}
              occlude={false}
              zIndexRange={[100000, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div style={CLOUD_NUMBER_BADGE_STYLE}>{cloudNumber}</div>
            </Html>
          ) : null}
        </Float>
      </PartingItem>
    </group>
  );
}

function FlightClouds({ debug }: { debug: CloudsDebug }) {
  return (
    <group
      position={debugPosition(debug)}
      scale={debugScale(debug)}
      renderOrder={debug.renderOrder}
      visible={debug.visible}
    >
      {debug.items.map((cloud, i) => (
        <FlightCloud key={`${cloud.tex}-${i}`} cloud={cloud} showNumber={debug.showNumbers} />
      ))}
    </group>
  );
}

function DebugSectionGroup({
  debug,
  children,
}: {
  debug: DebugSection;
  children: React.ReactNode;
}) {
  return (
    <group
      position={debugPosition(debug)}
      scale={debugScale(debug)}
      renderOrder={debug.renderOrder}
      visible={debug.visible}
    >
      {children}
    </group>
  );
}

/**
 * JourneyScene — everything beyond the door (z < -16): a forward-scroll path
 * walking from About → Skills → Projects → Contact.
 */
export default function JourneyScene() {
  const debugRef = useRef<JourneyDebugState>(null!);
  const [, forceGuiUpdate] = useState(0);

  if (!debugRef.current) {
    debugRef.current = createJourneyDebugState();
  }

  useJourneyDebugGui(debugRef, forceGuiUpdate);
  const debug = debugRef.current;

  return (
    <group
      position={debugPosition(debug.scene)}
      scale={debugScale(debug.scene)}
      renderOrder={debug.scene.renderOrder}
      visible={debug.scene.visible}
    >
      <PaperAirplane debug={debug.airplane} />
      <FlightClouds debug={debug.clouds} />
      <DebugSectionGroup debug={debug.sections.about}>
        <AboutSection zAvatar={debug.sections.about.anchorZ} debug={debug.sections.about} />
      </DebugSectionGroup>
      <DebugSectionGroup debug={debug.sections.skills}>
        <SkillsSection zStart={debug.sections.skills.anchorZ} debug={debug.sections.skills} />
      </DebugSectionGroup>
      <DebugSectionGroup debug={debug.sections.projects}>
        <ProjectsSection zStart={debug.sections.projects.anchorZ} debug={debug.sections.projects} />
      </DebugSectionGroup>
      <DebugSectionGroup debug={debug.sections.contact}>
        <ContactSection zStart={debug.sections.contact.anchorZ} debug={debug.sections.contact} />
      </DebugSectionGroup>
    </group>
  );
}
