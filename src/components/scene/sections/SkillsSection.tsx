"use client";

import React, { useMemo } from "react";
import { Float } from "@react-three/drei";
import PaintSprite from "../PaintSprite";
import FloatingNote from "../FloatingNote";
import { skills } from "@/data/portfolio";

const SIZE_TO_HEIGHT: Record<"S" | "M" | "L", number> = { S: 1.3, M: 1.7, L: 2.1 };

/**
 * SkillsSection — the skill balloons drift in a loose cluster and paint
 * themselves in as the camera reaches them. Layout is deterministic so it is
 * stable across renders.
 */
export default function SkillsSection({ zStart = -54 }: { zStart?: number }) {
  // Deterministic scatter: alternate sides, stagger depth + height.
  const placed = useMemo(() => {
    return skills.map((skill, i) => {
      const col = i % 3; // 3 loose columns: left / centre / right
      const x = (col - 1) * 3.4 + (i % 2 === 0 ? 0.5 : -0.5);
      const y = -1.2 + ((i * 37) % 5) * 0.8; // pseudo-random but fixed
      const z = zStart - i * 2.0;
      const speed = 1 + (i % 4) * 0.25;
      return { skill, pos: [x, y, z] as [number, number, number], speed };
    });
  }, [zStart]);

  return (
    <group>
      <FloatingNote position={[0, 3.0, zStart + 4]} fontSize={1.5} rotation={-2}>
        {"My toolbox"}
      </FloatingNote>

      {placed.map(({ skill, pos, speed }) => (
        <Float
          key={skill.label}
          speed={speed}
          rotationIntensity={0.2}
          floatIntensity={0.7}
          floatingRange={[-0.3, 0.3]}
        >
          <PaintSprite
            sketch={skill.balloon.sketch}
            painted={skill.balloon.painted}
            position={pos}
            height={SIZE_TO_HEIGHT[skill.size]}
            revealNear={9}
            revealFar={22}
            interactive
            hoverScale={1.08}
          />
        </Float>
      ))}
    </group>
  );
}
