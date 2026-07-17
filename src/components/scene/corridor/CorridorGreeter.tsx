"use client";

import { Float } from "@react-three/drei";

import AnimatedAvatar from "../AnimatedAvatar";
import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import { CORRIDOR } from "../journeyConfig";
import { corridor } from "@/data/portfolio";

const FLOATING_ITEMS = [
  {
    label: "Pencil",
    texture: corridor.doodles[0],
    position: [1.8037, 0.8988, 0.2453] as [number, number, number],
    height: 0.727,
    speed: 1.6127,
    rotationIntensity: 0.25,
    floatIntensity: 0.5,
    floatingRange: [-0.15, 0.15] as [number, number],
    revealNear: 7,
    revealFar: 16,
  },
  {
    label: "While True Loop",
    texture: corridor.doodles[1],
    position: [-1.29, -1.03, -0.2967] as [number, number, number],
    height: 0.6423,
    speed: 1.5422,
    rotationIntensity: 0.25,
    floatIntensity: 0.5,
    floatingRange: [-0.15, 0.15] as [number, number],
    revealNear: 7,
    revealFar: 16,
  },
] as const;

/** The finalized corridor welcome: avatar, notes and two selected doodles. */
export default function CorridorGreeter() {
  return (
    <group name="Corridor Greeter" position={[CORRIDOR.avatar.x, 0, CORRIDOR.avatar.z]}>
      <AnimatedAvatar position={[0, -1.85, 0]} height={2.7} fps={28} />

      <FloatingNote
        name="Corridor Greeting Note"
        position={[0.53, 0.85, -2.61]}
        fontSize={2.2}
        weight={700}
        color="#2b2b2b"
        rotation={-2}
      >
        {corridor.greeting}
      </FloatingNote>
      <FloatingNote
        name="Corridor Tagline Note"
        position={[0.63, 0.15, -2.61]}
        fontSize={1.18}
        weight={600}
        color="#6a6a6a"
        rotation={-1}
      >
        {corridor.tagline}
      </FloatingNote>

      {FLOATING_ITEMS.map((item) => (
        <Float
          key={item.label}
          name={`Greeter Doodle Float: ${item.label}`}
          speed={item.speed}
          rotationIntensity={item.rotationIntensity}
          floatIntensity={item.floatIntensity}
          floatingRange={item.floatingRange}
        >
          <PaintSprite
            name={`Greeter Doodle: ${item.label}`}
            sketch={item.texture}
            position={item.position}
            height={item.height}
            revealNear={item.revealNear}
            revealFar={item.revealFar}
          />
        </Float>
      ))}
    </group>
  );
}
