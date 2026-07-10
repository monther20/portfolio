"use client";

import React, { useMemo } from "react";
import { Float } from "@react-three/drei";
import PaintSprite from "../PaintSprite";
import PartingItem, { seededRange } from "../PartingItem";

import { skills } from "@/data/portfolio";

const SIZE_TO_HEIGHT: Record<"S" | "M" | "L", number> = { S: 1.3, M: 1.7, L: 2.1 };

type DebugSpriteItem = {
  visible?: boolean;
  x?: number;
  y?: number;
  z?: number;
  spriteX?: number;
  spriteY?: number;
  spriteZ?: number;
  scale?: number;
  height?: number;
  renderOrder?: number;
  push?: number;
  lift?: number;
  forward?: number;
  influenceDistance?: number;
  lerp?: number;
  floatSpeed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
  floatMin?: number;
  floatMax?: number;
  revealNear?: number;
  revealFar?: number;
  hoverScale?: number;
};

type SkillsSectionDebug = {
  items?: DebugSpriteItem[];
};

function debugHome(debug: DebugSpriteItem | undefined, fallback: [number, number, number]): [number, number, number] {
  return [debug?.x ?? fallback[0], debug?.y ?? fallback[1], debug?.z ?? fallback[2]];
}

function debugSpritePosition(debug: DebugSpriteItem | undefined): [number, number, number] {
  return [debug?.spriteX ?? 0, debug?.spriteY ?? 0, debug?.spriteZ ?? 0];
}

function debugFloatingRange(
  debug: DebugSpriteItem | undefined,
  fallback: [number, number],
): [number, number] {
  const min = debug?.floatMin ?? fallback[0];
  const max = debug?.floatMax ?? fallback[1];
  return [Math.min(min, max), Math.max(min, max)];
}

/**
 * SkillsSection — the skill balloons drift in a loose cluster and paint
 * themselves in as the camera reaches them. Layout is deterministic so it is
 * stable across renders.
 */
export default function SkillsSection({
  zStart = -54,
  debug,
}: {
  zStart?: number;
  debug?: SkillsSectionDebug;
}) {
  // Chunked deterministic scatter: each chunk gets one left, one center, one right item.
  const placed = useMemo(() => {
    const itemsPerChunk = 3;
    const chunkDepth = 7.5;

    return skills.map((skill, i) => {
      const chunk = Math.floor(i / itemsPerChunk);
      const lane = (i % itemsPerChunk) - 1;
      const side = lane === 0 ? (seededRange(`${skill.label}-side`, 0, 1) < 0.5 ? -1 : 1) : lane;
      const x = lane === 0
        ? seededRange(`${skill.label}-center-x`, -1.1, 1.1)
        : side * seededRange(`${skill.label}-outer-x`, 2.3, 4.4);
      const y = seededRange(`${skill.label}-y`, -1.05, 2.1);
      const z = zStart - chunk * chunkDepth - seededRange(`${skill.label}-z`, 0.8, chunkDepth - 0.7);
      const speed = seededRange(`${skill.label}-speed`, 1, 1.75);
      return { skill, pos: [x, y, z] as [number, number, number], speed, side: side as -1 | 1 };
    });
  }, [zStart]);

  return (
    <group name="Skills Section">
      {placed.map(({ skill, pos, speed, side }, i) => {
        const itemDebug = debug?.items?.[i];

        return (
          <PartingItem
            key={skill.label}
            name={`Skill Balloon: ${skill.label}`}
            home={debugHome(itemDebug, pos)}
            side={side}
            push={itemDebug?.push ?? 2.7}
            lift={itemDebug?.lift ?? 0.5}
            forward={itemDebug?.forward ?? 0.4}
            influenceDistance={itemDebug?.influenceDistance ?? 9.5}
            lerp={itemDebug?.lerp ?? 0.09}
          >
            <group
              name={`Skill Balloon Body: ${skill.label}`}
              visible={itemDebug?.visible ?? true}
              scale={itemDebug?.scale ?? 1}
              renderOrder={itemDebug?.renderOrder ?? 0}
            >
              <Float
                speed={itemDebug?.floatSpeed ?? speed}
                rotationIntensity={itemDebug?.rotationIntensity ?? 0.2}
                floatIntensity={itemDebug?.floatIntensity ?? 0.7}
                floatingRange={debugFloatingRange(itemDebug, [-0.3, 0.3])}
              >
                <PaintSprite
                  name={`Skill Sprite: ${skill.label}`}
                  sketch={skill.balloon.sketch}
                  painted={skill.balloon.painted}
                  position={debugSpritePosition(itemDebug)}
                  height={itemDebug?.height ?? SIZE_TO_HEIGHT[skill.size]}
                  renderOrder={itemDebug?.renderOrder ?? 0}
                  revealNear={itemDebug?.revealNear ?? 9}
                  revealFar={itemDebug?.revealFar ?? 22}
                  interactive
                  hoverScale={itemDebug?.hoverScale ?? 1.08}
                />
              </Float>
            </group>
          </PartingItem>
        );
      })}
    </group>
  );
}
