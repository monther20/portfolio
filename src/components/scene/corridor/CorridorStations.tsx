"use client";

import React from "react";
import { Float } from "@react-three/drei";

import FloatingNote from "../FloatingNote";
import PaintSprite from "../PaintSprite";
import { CORRIDOR } from "../journeyConfig";
import { corridor } from "@/data/portfolio";

const C = "/textures/textures/corridor";

/** Wall-mounted framed drawing + floating notes for one info station. */
function InfoStation({
  station,
  z,
}: {
  station: (typeof corridor.stations)[number];
  z: number;
}) {
  const side = station.side;

  return (
    <group name={`Corridor Station: ${station.title}`}>
      {/* Framed artwork flat on the wall, facing the corridor center */}
      <group name={`Corridor Station Frame: ${station.title}`} position={[side * (CORRIDOR.halfWidth - 0.08), -0.55, z]} rotation={[0, -side * (Math.PI / 2), 0]}>
        <PaintSprite
          sketch={`${C}/ramkanazdjecieduza.webp`}
          painted={`${C}/ramkanazdjecieduza_painted.webp`}
          billboard={false}
          height={1.9}
          revealNear={7}
          revealFar={15}
        />
        <PaintSprite
          name={`Station Artwork: ${station.title}`}
          sketch={station.art}
          billboard={false}
          position={[0, 0, 0.03]}
          height={1.35}
          revealNear={7}
          revealFar={15}
        />
      </group>

      {/* Title + placeholder copy floating beside the frame */}
      <FloatingNote name={`Corridor Station Title: ${station.title}`} position={[side * 1.55, 0.45, z]} fontSize={1.7} weight={700} rotation={side * -2}>
        {station.title}
      </FloatingNote>
      <FloatingNote
        name={`Corridor Station Body: ${station.title}`}
        position={[side * 1.5, -0.5, z]}
        fontSize={1.05}
        color="#4a4a4a"
        maxWidth={260}
        rotation={side * -1}
      >
        {station.lines.join("\n")}
      </FloatingNote>
    </group>
  );
}

/**
 * CorridorStations — the info stops along the corridor walls, the potted
 * props, ceiling lamps and the little vignette pointing at the window.
 */
export default function CorridorStations() {
  return (
    <group name="Corridor Stations">
      {corridor.stations.map((station, i) => (
        <InfoStation key={station.title} station={station} z={-38 - i * 11} />
      ))}

      {/* Props standing on the floor */}
      <PaintSprite
        sketch={`${C}/drzewkowdoniczce.webp`}
        position={[2.6, CORRIDOR.floorY + 0.95, -34]}
        height={1.9}
        revealNear={8}
        revealFar={16}
      />
      <PaintSprite
        sketch={`${C}/kwiatekwdoniczce.webp`}
        position={[-2.7, CORRIDOR.floorY + 0.55, -49]}
        height={1.1}
        revealNear={8}
        revealFar={16}
      />
      <PaintSprite
        sketch={`${C}/szafkaprzod.webp`}
        position={[2.7, CORRIDOR.floorY + 0.8, -55]}
        height={1.6}
        revealNear={8}
        revealFar={16}
      />

      {/* Vent flat on the right wall */}
      <group name="Corridor Vent" position={[CORRIDOR.halfWidth - 0.06, 1.6, -44]} rotation={[0, -Math.PI / 2, 0]}>
        <PaintSprite name="Corridor Vent Sprite" sketch={`${C}/kratkawentylacyjna.webp`} billboard={false} height={0.5} />
      </group>

      {/* Ceiling lamps with a warm pool of light under each */}
      {[-24, -36, -48, -60].map((z) => (
        <group key={z} name={`Corridor Ceiling Lamp ${z}`} position={[0, 0, z]}>
          <PaintSprite
            sketch={`${C}/bokilampy.webp`}
            position={[0, CORRIDOR.ceilY - 0.5, 0]}
            height={0.9}
          />
          <pointLight name={`Corridor Ceiling Lamp Light ${z}`} position={[0, 1.2, 0]} intensity={5} distance={9} decay={2} color="#ffe3b8" />
        </group>
      ))}

      {/* The table beside the window (the airplane rests above it) */}
      <PaintSprite
        name="Corridor Window Table"
        sketch="/textures/table.webp"
        position={[CORRIDOR.table.x, CORRIDOR.floorY + 1.15, CORRIDOR.table.z]}
        height={2.3}
        revealNear={9}
        revealFar={18}
      />

      {/* End vignette — a note and an arrow pointing at the window */}
      <FloatingNote name="Corridor Window Note" position={[-1.5, 0.6, -63.5]} fontSize={1.5} weight={600} rotation={-2}>
        {corridor.windowNote}
      </FloatingNote>
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5} floatingRange={[-0.1, 0.15]}>
        <PaintSprite
          name="Corridor Window Arrow"
          sketch={`${C}/strzalka.webp`}
          position={[-0.6, 0.2, -64.2]}
          height={0.7}
          revealNear={8}
          revealFar={16}
        />
      </Float>
    </group>
  );
}
