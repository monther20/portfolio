"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import PaintSprite from "../PaintSprite";
import { seededRange } from "../PartingItem";

import { projects, projectUI, type Project } from "@/data/portfolio";
import { setJourneyState } from "../journeyState";
import { JOURNEY } from "../journeyConfig";
import { useResponsiveExperience } from "../../ResponsiveExperience";

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

const PROJECTS_SPACE_FROM_SKILLS = 40;

const PROJECT_PLACEMENT = [
  {
    name: "Reachlet",
    x: -0.88,
    y: 2.38,
    zOffset: -3.9,
    moveStartBefore: 27.6,
    moveDistance: 39.995,
  },
  {
    name: "eZorro",
    x: 0.77,
    y: -0.03,
    zOffset: -1.318,
    moveStartBefore: 28,
    moveDistance: 26.801,
  },
] as const;

function debugHome(debug: ProjectPaperDebug | undefined, fallback: [number, number, number]): [number, number, number] {
  return [debug?.x ?? fallback[0], debug?.y ?? fallback[1], debug?.z ?? fallback[2]];
}

function debugSpritePosition(debug: ProjectPaperDebug | undefined): [number, number, number] {
  return [debug?.spriteX ?? 0, debug?.spriteY ?? 0, debug?.spriteZ ?? 0];
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

/**
 * A single project "paper". Scroll wind carries it from left to right; when
 * focused it flies to a fixed point in front of the camera, paints in fully,
 * and shows its details + an "open live project" button.
 */
function ProjectPaper({
  project,
  home,
  phase,
  focused,
  onToggle,
  debug,
  moveStartBefore,
  moveDistance,
}: {
  project: Project;
  home: [number, number, number];
  phase: number;
  focused: boolean;
  onToggle: () => void;
  debug?: ProjectPaperDebug;
  moveStartBefore: number;
  moveDistance: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const responsive = useResponsiveExperience();
  const dir = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const debugPhase = debug?.phase ?? phase;
  const paperHeight = debug?.height ?? PAPER_HEIGHT;
  const scrollWind = useMemo(() => {
    const leftX = -(responsive.isPhone ? 4.7 : 7.0) * responsive.laneScale;
    const rightX = (responsive.isPhone ? 4.8 : 7.2) * responsive.laneScale;
    const startZ = home[2] + moveStartBefore;
    const distance = moveDistance;

    return {
      startZ,
      endZ: startZ - distance,
      startOffsetX: leftX - home[0],
      endOffsetX: rightX - home[0],
      sway: seededRange(`${project.name}-wind-sway`, 0.25, 0.62) * responsive.motionScale,
      phase: debugPhase,
      cycles: seededRange(`${project.name}-wind-cycles`, 1.05, 2.2),
      tilt: seededRange(`${project.name}-wind-tilt`, 0.11, 0.24) * responsive.motionScale,
      wobble: seededRange(`${project.name}-wind-wobble`, 0.045, 0.1) * responsive.motionScale,
      yaw: seededRange(`${project.name}-wind-yaw`, 0.05, 0.14) * responsive.motionScale,
    };
  }, [debugPhase, home, moveDistance, moveStartBefore, project.name, responsive.isPhone, responsive.laneScale, responsive.motionScale]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    if (focused) {
      g.visible = debug?.visible ?? true;
      // Fly to a fixed spot in front of the camera.
      camera.getWorldDirection(dir);
      target
        .copy(camera.position)
        .addScaledVector(
          dir,
          debug?.focusedDistance ?? responsive.projectFocusDistance,
        );
      g.position.lerp(target, debug?.focusedLerp ?? 0.12);
      // Face the camera, upright.
      g.quaternion.slerp(camera.quaternion, debug?.focusedQuaternionLerp ?? 0.15);
    } else {
      const rawProgress =
        (scrollWind.startZ - camera.position.z) /
        (scrollWind.startZ - scrollWind.endZ);
      const progress = clamp01(rawProgress);

      g.visible = (debug?.visible ?? true) && rawProgress > 0 && rawProgress < 1;
      if (!g.visible) return;

      const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
      const activeWind = Math.sin(eased * Math.PI);
      const windWave = Math.sin(
        eased * Math.PI * 2 * scrollWind.cycles + scrollWind.phase,
      );

      g.position.set(
        home[0] +
          THREE.MathUtils.lerp(
            scrollWind.startOffsetX,
            scrollWind.endOffsetX,
            eased,
          ),
        home[1] + windWave * scrollWind.sway * activeWind,
        home[2],
      );

      g.rotation.x = windWave * 0.045 * responsive.motionScale * activeWind;
      g.rotation.y = windWave * scrollWind.yaw * activeWind;
      g.rotation.z = scrollWind.tilt * eased + windWave * scrollWind.wobble * activeWind;
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
      name={`Project Paper: ${project.name}`}
      position={home}
      visible={false}
      scale={(debug?.scale ?? 1) * (responsive.isPhone ? 1.08 : 1)}
      renderOrder={debug?.renderOrder ?? 0}
    >
      {/* The paper itself */}
      <PaintSprite
        name={`Project Panel: ${project.name}`}
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
              name={`Open Live Button: ${project.name}`}
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
 * ProjectsSection — project papers ride scroll-driven wind from left to right.
 */
export default function ProjectsSection({
  debug,
}: {
  zStart?: number;
  debug?: ProjectsSectionDebug;
}) {
  const [active, setActive] = useState<number | null>(null);
  const responsive = useResponsiveExperience();

  useEffect(() => {
    setJourneyState({ interactionLocked: active !== null });
    return () => setJourneyState({ interactionLocked: false });
  }, [active]);

  useEffect(() => {
    if (active === null) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [active]);

  const placed = useMemo(() => {
    const sectionZ = JOURNEY.skillsAnchorZ - PROJECTS_SPACE_FROM_SKILLS;

    return projects.map((project, i) => {
      const item = PROJECT_PLACEMENT.find((entry) => entry.name === project.name);
      const phase = seededRange(`${project.name}-phase`, 0, Math.PI * 2);

      return {
        project,
        home: [
          item?.x ?? 0,
          item?.y ?? 0,
          sectionZ + (item?.zOffset ?? 0),
        ] as [number, number, number],
        moveStartBefore: item?.moveStartBefore ?? 28,
        moveDistance: item?.moveDistance ?? 32,
        phase,
        i,
      };
    });
  }, []);

  return (
    <group name="Projects Section">
      {placed.map(({ project, home, phase, moveStartBefore, moveDistance, i }) => {
        const itemDebug = debug?.items?.[i];
        const debuggedHome = debugHome(itemDebug, [
          home[0] * responsive.laneScale,
          home[1],
          home[2],
        ]);

        return (
          <ProjectPaper
            key={project.name}
            project={project}
            home={debuggedHome}
            phase={itemDebug?.phase ?? phase}
            focused={active === i}
            onToggle={() => setActive(active === i ? null : i)}
            debug={itemDebug}
            moveStartBefore={moveStartBefore}
            moveDistance={moveDistance}
          />
        );
      })}
    </group>
  );
}
