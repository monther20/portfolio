"use client";

import { type ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import PaintSprite from "../PaintSprite";
import { seededRange } from "../PartingItem";

import { skills } from "@/data/portfolio";
import { useResponsiveExperience } from "../../ResponsiveExperience";

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

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

type ScrollWindBalloonProps = {
  children: ReactNode;
  label: string;
  homeX: number;
  homeZ: number;
  laneScale: number;
  motionScale: number;
  isPhone: boolean;
  visible?: boolean;
};

function ScrollWindBalloon({
  children,
  label,
  homeX,
  homeZ,
  laneScale,
  motionScale,
  isPhone,
  visible = true,
}: ScrollWindBalloonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const motion = useMemo(() => {
    const rightX = (isPhone ? 4.4 : 6.6) * laneScale;
    const leftX = -(isPhone ? 4.7 : 7.0) * laneScale;
    const startZ = homeZ + seededRange(`${label}-wind-start`, 16, 26);
    const distance = seededRange(`${label}-wind-distance`, 28, 46);

    return {
      startZ,
      endZ: startZ - distance,
      startOffsetX: rightX - homeX,
      endOffsetX: leftX - homeX,
      sway: seededRange(`${label}-wind-sway`, 0.22, 0.55) * motionScale,
      phase: seededRange(`${label}-wind-phase`, 0, Math.PI * 2),
      cycles: seededRange(`${label}-wind-cycles`, 1.15, 2.45),
      tilt: seededRange(`${label}-wind-tilt`, -0.23, -0.12) * motionScale,
      wobble: seededRange(`${label}-wind-wobble`, 0.035, 0.085) * motionScale,
    };
  }, [homeX, homeZ, isPhone, label, laneScale, motionScale]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const rawProgress =
      (motion.startZ - camera.position.z) / (motion.startZ - motion.endZ);
    const progress = clamp01(rawProgress);

    group.visible = visible && rawProgress > 0 && rawProgress < 1;
    if (!group.visible) return;

    const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
    const windWave = Math.sin(
      eased * Math.PI * 2 * motion.cycles + motion.phase,
    );
    const activeWind = Math.sin(eased * Math.PI);

    group.position.x = THREE.MathUtils.lerp(
      motion.startOffsetX,
      motion.endOffsetX,
      eased,
    );
    group.position.y = windWave * motion.sway * activeWind;
    group.rotation.z = motion.tilt * eased + windWave * motion.wobble * activeWind;
    group.rotation.y = windWave * 0.05 * motionScale * activeWind;
  });

  return <group ref={groupRef} visible={false}>{children}</group>;
}

/**
 * SkillsSection — the skill balloons are laid out deterministically, then a
 * scroll-driven wind pass carries each one from right to left as the camera
 * approaches. The wind depends on scroll position (not elapsed time), so the
 * balloons hold still whenever scrolling stops.
 */
export default function SkillsSection({
  zStart = -54,
  debug,
}: {
  zStart?: number;
  debug?: SkillsSectionDebug;
}) {
  const responsive = useResponsiveExperience();

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
      return { skill, pos: [x, y, z] as [number, number, number] };
    });
  }, [zStart]);

  return (
    <group name="Skills Section">
      {placed.map(({ skill, pos }, i) => {
        const itemDebug = debug?.items?.[i];

        const home = debugHome(itemDebug, [
          pos[0] * responsive.laneScale,
          pos[1],
          pos[2],
        ]);

        return (
          <group
            key={skill.label}
            name={`Skill Balloon: ${skill.label}`}
            position={home}
          >
            <ScrollWindBalloon
              label={skill.label}
              homeX={home[0]}
              homeZ={home[2]}
              laneScale={responsive.laneScale}
              motionScale={responsive.motionScale}
              isPhone={responsive.isPhone}
              visible={itemDebug?.visible ?? true}
            >
              <group
                name={`Skill Balloon Body: ${skill.label}`}
                visible
                scale={itemDebug?.scale ?? (responsive.isPhone ? 1.08 : 1)}
                renderOrder={itemDebug?.renderOrder ?? 0}
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
              </group>
            </ScrollWindBalloon>
          </group>
        );
      })}
    </group>
  );
}
