"use client";

import React from "react";
import { Float } from "@react-three/drei";
import PaintSprite from "../PaintSprite";
import FloatingNote from "../FloatingNote";
import { about } from "@/data/portfolio";

/**
 * AboutSection — the first thing you meet after walking through the door.
 * An avatar-on-a-cloud that paints itself in as you approach, surrounded by
 * hand-written welcome notes, followed by a few "about me" blurbs and islands.
 */
export default function AboutSection({ zAvatar = -36 }: { zAvatar?: number }) {
  return (
    <group>
      {/* ── Avatar welcome ── */}
      <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.5} floatingRange={[-0.12, 0.2]}>
        <PaintSprite
          sketch="/textures/textures/about/awatarnachmurce.webp"
          position={[0, 0.4, zAvatar]}
          height={3.0}
          revealNear={9}
          revealFar={24}
        />
      </Float>

      {/* Floating welcome text around the avatar */}
      <FloatingNote position={[2.3, 2.3, zAvatar + 0.5]} fontSize={1.4} rotation={-4}>
        {about.greeting}
      </FloatingNote>
      <FloatingNote position={[2.4, 1.45, zAvatar + 0.5]} fontSize={0.85} rotation={2} color="#4a4a4a">
        {about.tagline}
      </FloatingNote>
      <FloatingNote position={[-2.7, 1.6, zAvatar + 0.5]} fontSize={0.8} rotation={5} color="#5a5a5a">
        {"scroll to explore ↓"}
      </FloatingNote>

      {/* ── A few things about me ── */}
      {about.blurbs.map((line, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <FloatingNote
            key={i}
            position={[side * 2.6, 0.6, zAvatar - 9 - i * 7]}
            fontSize={0.95}
            rotation={side * 3}
            maxWidth={260}
          >
            {line}
          </FloatingNote>
        );
      })}

      {/* ── Islands (decorative milestones) ── */}
      {about.islands
        .filter((isl) => isl.show)
        .map((isl, i) => {
          const side = i % 2 === 0 ? -1 : 1;
          const z = zAvatar - 12 - i * 7;
          return (
            <group key={isl.tex}>
              <Float speed={1.1} floatIntensity={0.4} floatingRange={[-0.18, 0.18]}>
                <PaintSprite
                  sketch={isl.tex}
                  position={[side * 3.0, -1.8, z]}
                  height={1.9}
                  revealNear={8}
                  revealFar={20}
                />
              </Float>
              <FloatingNote position={[side * 3.0, -3.0, z]} fontSize={0.75} rotation={side * 2} color="#5a5a5a">
                {isl.label}
              </FloatingNote>
            </group>
          );
        })}
    </group>
  );
}
