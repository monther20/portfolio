"use client";

import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import PaintSprite from "../PaintSprite";
import { seededRange } from "../PartingItem";

import { projects, projectUI, type Project } from "@/data/portfolio";

const PAPER_HEIGHT = 2.5;

type ProjectPaperDebug = {
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
  phase?: number;
  revealNear?: number;
  revealFar?: number;
  focusedRevealNear?: number;
  focusedRevealFar?: number;
  hoverScale?: number;
  focusedDistance?: number;
  focusedLerp?: number;
  focusedQuaternionLerp?: number;
  driftX?: number;
  driftY?: number;
  driftZ?: number;
  push?: number;
  lift?: number;
  forward?: number;
  influenceDistance?: number;
  lerp?: number;
  swayZ?: number;
  swayY?: number;
  swayLerp?: number;
  buttonVisible?: boolean;
  buttonX?: number;
  buttonY?: number;
  buttonZ?: number;
  buttonHeight?: number;
  buttonRenderOrder?: number;
  buttonHoverScale?: number;
};

type ProjectsSectionDebug = {
  items?: ProjectPaperDebug[];
};

function debugHome(debug: ProjectPaperDebug | undefined, fallback: [number, number, number]): [number, number, number] {
  return [debug?.x ?? fallback[0], debug?.y ?? fallback[1], debug?.z ?? fallback[2]];
}

function debugSpritePosition(debug: ProjectPaperDebug | undefined): [number, number, number] {
  return [debug?.spriteX ?? 0, debug?.spriteY ?? 0, debug?.spriteZ ?? 0];
}

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
  debug,
}: {
  project: Project;
  home: [number, number, number];
  phase: number;
  focused: boolean;
  onToggle: () => void;
  debug?: ProjectPaperDebug;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const dir = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const debugPhase = debug?.phase ?? phase;
  const paperHeight = debug?.height ?? PAPER_HEIGHT;

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (focused) {
      // Fly to a fixed spot in front of the camera.
      camera.getWorldDirection(dir);
      target.copy(camera.position).addScaledVector(dir, debug?.focusedDistance ?? 4.6);
      g.position.lerp(target, debug?.focusedLerp ?? 0.12);
      // Face the camera, upright.
      g.quaternion.slerp(camera.quaternion, debug?.focusedQuaternionLerp ?? 0.15);
    } else {
      // Wind drift around the home position. If the paper is in front of the
      // airplane and close, part it to the side like the clouds.
      const airplaneZ = camera.position.z - 2.85;
      const distanceInFront = airplaneZ - home[2];
      const influence = distanceInFront >= 0
        ? 1 - THREE.MathUtils.smoothstep(distanceInFront, 0.5, debug?.influenceDistance ?? 9.5)
        : 0;
      const side = home[0] >= 0 ? 1 : -1;

      target.set(
        home[0] + Math.sin(t * 0.6 + debugPhase) * (debug?.driftX ?? 0.5) + side * influence * (debug?.push ?? 2.8),
        home[1] + Math.sin(t * 0.9 + debugPhase * 1.3) * (debug?.driftY ?? 0.35) + influence * (debug?.lift ?? 0.5),
        home[2] + Math.cos(t * 0.5 + debugPhase) * (debug?.driftZ ?? 0.3) + influence * (debug?.forward ?? 0.4)
      );
      g.position.lerp(target, debug?.lerp ?? 0.06);
      // Gentle sway — papers face roughly toward the incoming camera (+z).
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, Math.sin(t * 0.7 + debugPhase) * (debug?.swayZ ?? 0.12), debug?.swayLerp ?? 0.05);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.sin(t * 0.4 + debugPhase) * (debug?.swayY ?? 0.15), debug?.swayLerp ?? 0.05);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, debug?.swayLerp ?? 0.05);
    }
  });

  const openLive = (e: any) => {
    e.stopPropagation();
    if (project.link && project.link !== "#") {
      window.open(project.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <group
      ref={groupRef}
      position={home}
      visible={debug?.visible ?? true}
      scale={debug?.scale ?? 1}
      renderOrder={debug?.renderOrder ?? 0}
    >
      {/* The paper itself */}
      <PaintSprite
        sketch={project.panel.sketch}
        painted={project.panel.painted}
        position={debugSpritePosition(debug)}
        height={paperHeight}
        renderOrder={debug?.renderOrder ?? 0}
        billboard={false}
        revealNear={focused ? (debug?.focusedRevealNear ?? 30) : (debug?.revealNear ?? 9)}
        revealFar={focused ? (debug?.focusedRevealFar ?? 40) : (debug?.revealFar ?? 22)}
        interactive
        hoverScale={debug?.hoverScale ?? 1.05}
        onClick={onToggle}
      />

      {/* Details — only while focused */}
      {focused && (
        <>
          {project.link && project.link !== "#" && (debug?.buttonVisible ?? true) ? (
            <PaintSprite
              sketch={projectUI.openLive}
              position={[
                debug?.buttonX ?? 0,
                debug?.buttonY ?? -paperHeight / 2 - 0.7,
                debug?.buttonZ ?? 0.05,
              ]}
              height={debug?.buttonHeight ?? 0.6}
              renderOrder={debug?.buttonRenderOrder ?? debug?.renderOrder ?? 0}
              billboard={false}
              autoReveal={false}
              interactive
              hoverScale={debug?.buttonHoverScale ?? 1.12}
              onClick={openLive}
            />
          ) : null}
        </>
      )}
    </group>
  );
}

/**
 * ProjectsSection — a small field of project papers drifting in the wind.
 */
export default function ProjectsSection({
  zStart = -114,
  debug,
}: {
  zStart?: number;
  debug?: ProjectsSectionDebug;
}) {
  const [active, setActive] = useState<number | null>(null);

  const placed = useMemo(() => {
    const itemsPerChunk = 2;
    const chunkDepth = 9;

    return projects.map((project, i) => {
      const chunk = Math.floor(i / itemsPerChunk);
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * seededRange(`${project.name}-x`, 2.3, 4.4);
      const y = seededRange(`${project.name}-y`, 0.1, 2.6);
      const z = zStart - chunk * chunkDepth - seededRange(`${project.name}-z`, 1.0, chunkDepth - 0.8);
      const phase = seededRange(`${project.name}-phase`, 0, Math.PI * 2);
      return { project, home: [x, y, z] as [number, number, number], phase, i };
    });
  }, [zStart]);

  return (
    <group>
      {placed.map(({ project, home, phase, i }) => {
        const itemDebug = debug?.items?.[i];
        const debuggedHome = debugHome(itemDebug, home);

        return (
          <ProjectPaper
            key={project.name}
            project={project}
            home={debuggedHome}
            phase={itemDebug?.phase ?? phase}
            focused={active === i}
            onToggle={() => setActive(active === i ? null : i)}
            debug={itemDebug}
          />
        );
      })}
    </group>
  );
}
