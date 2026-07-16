"use client";

import { useMemo } from "react";
import { Float } from "@react-three/drei";

import AnimatedAvatar from "../AnimatedAvatar";
import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import { seededRange } from "../PartingItem";
import { CORRIDOR } from "../journeyConfig";
import { corridor } from "@/data/portfolio";

/**
 * CorridorGreeter — the animated avatar just past the door, welcoming the
 * visitor with handwritten notes and a small orbit of floating doodles and
 * tech logos.
 */
export default function CorridorGreeter() {
  // Deterministic scatter for the doodles around the avatar.
  const doodles = useMemo(
    () =>
      corridor.doodles.map((tex, i) => ({
        tex,
        x: seededRange(`${tex}-x`, 0.9, 2.3) * (i % 2 === 0 ? -1 : 1),
        y: seededRange(`${tex}-y`, -0.4, 1.6),
        z: seededRange(`${tex}-z`, -0.8, 0.8),
        height: seededRange(`${tex}-h`, 0.55, 0.8),
        speed: seededRange(`${tex}-speed`, 1, 1.8),
      })),
    [],
  );

  return (
    <group name="Corridor Greeter" position={[CORRIDOR.avatar.x, 0, CORRIDOR.avatar.z]}>
      <AnimatedAvatar position={[0, CORRIDOR.floorY + 1.35, 0]} height={2.7} />

      {/* Greeting + tagline floating above his head */}
      <FloatingNote name="Corridor Greeting Note" position={[0.55, 0.85, 0]} fontSize={2.2} weight={700} rotation={-2}>
        {corridor.greeting}
      </FloatingNote>
      <FloatingNote name="Corridor Tagline Note" position={[0.65, 0.15, 0]} fontSize={1.25} color="#6a6a6a" rotation={-1}>
        {corridor.tagline}
      </FloatingNote>

      {/* Hand-drawn doodles drifting around him */}
      {doodles.map((doodle) => (
        <Float
          key={doodle.tex}
          name={`Greeter Doodle Float: ${doodle.tex.split("/").pop() ?? doodle.tex}`}
          speed={doodle.speed}
          rotationIntensity={0.25}
          floatIntensity={0.5}
          floatingRange={[-0.15, 0.15]}
        >
          <PaintSprite
            name={`Greeter Doodle: ${doodle.tex.split("/").pop() ?? doodle.tex}`}
            sketch={doodle.tex}
            position={[doodle.x, doodle.y, doodle.z]}
            height={doodle.height}
            revealNear={7}
            revealFar={16}
          />
        </Float>
      ))}

      {/* A few favourite tools floating on his other side */}
      {corridor.logos.map((logo, i) => (
        <Float
          key={logo.sketch}
          name={`Greeter Logo Float ${i + 1}`}
          speed={1.2 + i * 0.25}
          rotationIntensity={0.2}
          floatIntensity={0.5}
          floatingRange={[-0.12, 0.18]}
        >
          <PaintSprite
            name={`Greeter Logo ${i + 1}`}
            sketch={logo.sketch}
            painted={logo.painted}
            position={[1.9 + (i % 2) * 0.5, 0.5 + i * 0.65, -0.4 + i * 0.35]}
            height={0.7}
            revealNear={7}
            revealFar={16}
            interactive
            hoverScale={1.1}
          />
        </Float>
      ))}
    </group>
  );
}
