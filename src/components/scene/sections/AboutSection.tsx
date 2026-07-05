"use client";

import React, { useMemo } from "react";
import { Float } from "@react-three/drei";
import PaintSprite from "../PaintSprite";
import PartingItem, { seededRange } from "../PartingItem";

import { about } from "@/data/portfolio";

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
};

type AboutSectionDebug = {
  avatar?: DebugSpriteItem;
  islands?: DebugSpriteItem[];
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
 * AboutSection — the first thing you meet after walking through the door.
 * An avatar-on-a-cloud that paints itself in as you approach, surrounded by
 * hand-written welcome notes, followed by a few "about me" blurbs and islands.
 */
export default function AboutSection({
  zAvatar = -36,
  debug,
}: {
  zAvatar?: number;
  debug?: AboutSectionDebug;
}) {
  const avatarHome = useMemo(
    () => [seededRange("about-avatar-x", -0.45, 0.45), 0.4, zAvatar] as [number, number, number],
    [zAvatar],
  );
  const islands = useMemo(() => {
    return about.islands
      .filter((isl) => isl.show)
      .map((isl, i) => {
        const side = seededRange(`about-island-${i}-side`, 0, 1) < 0.5 ? -1 : 1;
        const x = side * seededRange(`about-island-${i}-x`, 2.4, 4.5);
        const y = seededRange(`about-island-${i}-y`, -2.05, -1.3);
        const z = zAvatar - 10 - i * 7 - seededRange(`about-island-${i}-z`, 0.4, 3.4);
        return { isl, home: [x, y, z] as [number, number, number], side: side as -1 | 1 };
      });
  }, [zAvatar]);

  const avatarDebug = debug?.avatar;

  return (
    <group>
      {/* ── Avatar welcome ── */}
      <PartingItem
        home={debugHome(avatarDebug, avatarHome)}
        push={avatarDebug?.push ?? 2.4}
        lift={avatarDebug?.lift ?? 0.5}
        forward={avatarDebug?.forward ?? 0.5}
        influenceDistance={avatarDebug?.influenceDistance ?? 9.5}
        lerp={avatarDebug?.lerp ?? 0.09}
      >
        <group
          visible={avatarDebug?.visible ?? true}
          scale={avatarDebug?.scale ?? 1}
          renderOrder={avatarDebug?.renderOrder ?? 0}
        >
          <Float
            speed={avatarDebug?.floatSpeed ?? 1.4}
            rotationIntensity={avatarDebug?.rotationIntensity ?? 0.12}
            floatIntensity={avatarDebug?.floatIntensity ?? 0.5}
            floatingRange={debugFloatingRange(avatarDebug, [-0.12, 0.2])}
          >
            <PaintSprite
              sketch="/textures/textures/about/awatarnachmurce.webp"
              position={debugSpritePosition(avatarDebug)}
              height={avatarDebug?.height ?? 3.0}
              renderOrder={avatarDebug?.renderOrder ?? 0}
              revealNear={avatarDebug?.revealNear ?? 9}
              revealFar={avatarDebug?.revealFar ?? 24}
            />
          </Float>
        </group>
      </PartingItem>

      {/* ── Islands (decorative milestones) ── */}
      {islands.map(({ isl, home, side }, i) => {
        const islandDebug = debug?.islands?.[i];

        return (
          <PartingItem
            key={isl.tex}
            home={debugHome(islandDebug, home)}
            side={side}
            push={islandDebug?.push ?? 2.8}
            lift={islandDebug?.lift ?? 0.4}
            forward={islandDebug?.forward ?? 0.45}
            influenceDistance={islandDebug?.influenceDistance ?? 9.5}
            lerp={islandDebug?.lerp ?? 0.09}
          >
            <group
              visible={islandDebug?.visible ?? true}
              scale={islandDebug?.scale ?? 1}
              renderOrder={islandDebug?.renderOrder ?? 0}
            >
              <Float
                speed={islandDebug?.floatSpeed ?? 1.1}
                rotationIntensity={islandDebug?.rotationIntensity ?? 0}
                floatIntensity={islandDebug?.floatIntensity ?? 0.4}
                floatingRange={debugFloatingRange(islandDebug, [-0.18, 0.18])}
              >
                <PaintSprite
                  sketch={isl.tex}
                  position={debugSpritePosition(islandDebug)}
                  height={islandDebug?.height ?? 1.9}
                  renderOrder={islandDebug?.renderOrder ?? 0}
                  revealNear={islandDebug?.revealNear ?? 8}
                  revealFar={islandDebug?.revealFar ?? 20}
                />
              </Float>
            </group>
          </PartingItem>
        );
      })}
    </group>
  );
}
