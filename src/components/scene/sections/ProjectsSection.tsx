"use client";

import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import PaintSprite from "../PaintSprite";
import FloatingNote from "../FloatingNote";
import { projects, projectUI, type Project } from "@/data/portfolio";

const PAPER_HEIGHT = 2.5;

/**
 * A single project "paper". Drifts in the wind at its home spot; when focused
 * it flies to a fixed point in front of the camera, paints in fully, and shows
 * its details + an "open live project" button.
 */
function ProjectPaper({
  project,
  home,
  phase,
  focused,
  onToggle,
}: {
  project: Project;
  home: [number, number, number];
  phase: number;
  focused: boolean;
  onToggle: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const dir = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (focused) {
      // Fly to a fixed spot in front of the camera.
      camera.getWorldDirection(dir);
      target.copy(camera.position).addScaledVector(dir, 4.6);
      g.position.lerp(target, 0.12);
      // Face the camera, upright.
      g.quaternion.slerp(camera.quaternion, 0.15);
    } else {
      // Wind drift around the home position.
      target.set(
        home[0] + Math.sin(t * 0.6 + phase) * 0.5,
        home[1] + Math.sin(t * 0.9 + phase * 1.3) * 0.35,
        home[2] + Math.cos(t * 0.5 + phase) * 0.3
      );
      g.position.lerp(target, 0.05);
      // Gentle sway — papers face roughly toward the incoming camera (+z).
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, Math.sin(t * 0.7 + phase) * 0.12, 0.05);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.sin(t * 0.4 + phase) * 0.15, 0.05);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.05);
    }
  });

  const openLive = (e: any) => {
    e.stopPropagation();
    if (project.link && project.link !== "#") {
      window.open(project.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <group ref={groupRef} position={home}>
      {/* The paper itself */}
      <PaintSprite
        sketch={project.panel.sketch}
        painted={project.panel.painted}
        position={[0, 0, 0]}
        height={PAPER_HEIGHT}
        billboard={false}
        revealNear={focused ? 30 : 9}
        revealFar={focused ? 40 : 22}
        interactive
        hoverScale={1.05}
        onClick={onToggle}
      />

      {/* Details — only while focused */}
      {focused && (
        <>
          <FloatingNote position={[0, PAPER_HEIGHT / 2 + 0.9, 0]} fontSize={1.3} rotation={-2}>
            {project.name}
          </FloatingNote>
          <FloatingNote
            position={[0, PAPER_HEIGHT / 2 + 0.25, 0]}
            fontSize={0.8}
            color="#5a5a5a"
            maxWidth={360}
          >
            {project.blurb}
          </FloatingNote>

          {project.link && project.link !== "#" ? (
            <PaintSprite
              sketch={projectUI.openLive}
              position={[0, -PAPER_HEIGHT / 2 - 0.7, 0.05]}
              height={0.6}
              billboard={false}
              autoReveal={false}
              interactive
              hoverScale={1.12}
              onClick={openLive}
            />
          ) : (
            <FloatingNote
              position={[0, -PAPER_HEIGHT / 2 - 0.6, 0]}
              fontSize={0.7}
              color="#9a9a9a"
              rotation={2}
            >
              {"(live link coming soon)"}
            </FloatingNote>
          )}

          <FloatingNote
            position={[PAPER_HEIGHT * 0.85, PAPER_HEIGHT / 2 + 0.5, 0]}
            fontSize={0.65}
            color="#9a9a9a"
            rotation={4}
          >
            {"× click paper to close"}
          </FloatingNote>
        </>
      )}
    </group>
  );
}

/**
 * ProjectsSection — a small field of project papers drifting in the wind.
 */
export default function ProjectsSection({ zStart = -114 }: { zStart?: number }) {
  const [active, setActive] = useState<number | null>(null);

  const placed = useMemo(() => {
    return projects.map((project, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (2.6 + (i % 2) * 0.9);
      const y = 0.5 + ((i * 31) % 4) * 0.7;
      const z = zStart - i * 6;
      const phase = i * 1.7;
      return { project, home: [x, y, z] as [number, number, number], phase, i };
    });
  }, [zStart]);

  return (
    <group>
      <FloatingNote position={[0, 3.2, zStart + 5]} fontSize={1.5} rotation={-2}>
        {"Things I've built"}
      </FloatingNote>
      <FloatingNote position={[0, 2.3, zStart + 5]} fontSize={0.8} color="#6a6a6a" rotation={1}>
        {"click a paper to take a closer look"}
      </FloatingNote>

      {placed.map(({ project, home, phase, i }) => (
        <ProjectPaper
          key={project.name}
          project={project}
          home={home}
          phase={phase}
          focused={active === i}
          onToggle={() => setActive(active === i ? null : i)}
        />
      ))}
    </group>
  );
}
