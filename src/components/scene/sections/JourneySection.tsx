"use client";

import { useMemo } from "react";
import { Float } from "@react-three/drei";

import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import PartingItem, { seededRange } from "../PartingItem";
import { JOURNEY } from "../journeyConfig";
import { journeyMilestones } from "@/data/portfolio";

const LANTERN_TEX = "/textures/journey/lantern.webp";

/**
 * JourneySection — the first stop of the sky flight: milestones of my story
 * floating between the clouds, with a few paper lanterns drifting above.
 */
export default function JourneySection({ zStart = JOURNEY.journeyAnchorZ }: { zStart?: number }) {
  const placed = useMemo(
    () =>
      journeyMilestones.map((milestone, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return {
          milestone,
          speed: seededRange(`journey-${i}-speed`, 1, 1.6),
          pos: [
            side * seededRange(`journey-${i}-x`, 2.2, 4.0),
            seededRange(`journey-${i}-y`, -0.9, 1.6),
            zStart - i * 9 - seededRange(`journey-${i}-z`, 0.5, 3.5),
          ] as [number, number, number],
        };
      }),
    [zStart],
  );

  const lanterns = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        key: `lantern-${i}`,
        height: seededRange(`lantern-${i}-h`, 0.8, 1.2),
        speed: seededRange(`lantern-${i}-speed`, 0.8, 1.4),
        pos: [
          (i % 2 === 0 ? 1 : -1) * seededRange(`lantern-${i}-x`, 1.5, 4.5),
          seededRange(`lantern-${i}-y`, 1.2, 2.8),
          zStart - 3 - i * 8 - seededRange(`lantern-${i}-z`, 0, 4),
        ] as [number, number, number],
      })),
    [zStart],
  );

  return (
    <group name="Journey Milestones Section">
      {placed.map(({ milestone, pos, speed }) => (
        <PartingItem key={milestone.title} name={`Journey Milestone: ${milestone.title}`} home={pos} push={2.7} lift={0.45}>
          <Float
            speed={speed}
            rotationIntensity={0.1}
            floatIntensity={0.45}
            floatingRange={[-0.18, 0.18]}
          >
            {milestone.island ? (
              <PaintSprite name={`Journey Island: ${milestone.title}`} sketch={milestone.island} position={[0, -1.1, 0]} height={1.9} revealNear={8} revealFar={20} />
            ) : null}
            <group name={`Journey Milestone Note: ${milestone.title}`} position={[0, 0.55, 0]}>
              <FloatingNote position={[0, 0.25, 0]} fontSize={1.55} weight={700} rotation={-1.5}>
                {`${milestone.year} — ${milestone.title}`}
              </FloatingNote>
              <FloatingNote position={[0, -0.35, 0]} fontSize={1} weight={600} color="#4a4a4a" maxWidth={250} rotation={-1.5}>
                {milestone.text}
              </FloatingNote>
            </group>
          </Float>
        </PartingItem>
      ))}

      {lanterns.map((lantern) => (
        <PartingItem key={lantern.key} name={`Journey Lantern: ${lantern.key}`} home={lantern.pos} push={2.4} lift={0.6}>
          <Float
            speed={lantern.speed}
            rotationIntensity={0.15}
            floatIntensity={0.6}
            floatingRange={[-0.25, 0.25]}
          >
            <PaintSprite name={`Journey Lantern Sprite: ${lantern.key}`} sketch={LANTERN_TEX} height={lantern.height} revealNear={9} revealFar={22} />
          </Float>
        </PartingItem>
      ))}
    </group>
  );
}
