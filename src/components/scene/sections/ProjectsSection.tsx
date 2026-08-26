"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import PaintSprite from "../PaintSprite";
import ProjectPaperMesh, { type ProjectPaperMeshHandle } from "./ProjectPaperMesh";
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

/** Convert the old 60fps lerp amount into a frame-rate-independent factor. */
function smoothLerpFactor(amount: number, delta: number) {
  const clampedAmount = THREE.MathUtils.clamp(amount, 0, 0.999);
  return 1 - Math.pow(1 - clampedAmount, Math.min(delta, 0.1) * 60);
}

/**
 * A single project "paper". Scroll wind carries it from left to right; when
 * focused it flips to a fixed point in front of the camera and paints in fully.
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
  const paperRollRef = useRef<THREE.Group>(null);
  const paperMeshRef = useRef<ProjectPaperMeshHandle>(null);
  const liveButtonSurfaceRef = useRef<THREE.Group>(null);
  const focusProgress = useRef(0);
  const { camera } = useThree();
  const responsive = useResponsiveExperience();
  const dir = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const returnEuler = useMemo(() => new THREE.Euler(), []);
  const returnQuaternion = useMemo(() => new THREE.Quaternion(), []);
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

  useFrame((state, delta) => {
    const g = groupRef.current;
    const paperRoll = paperRollRef.current;
    if (!g) return;

    const rawWindProgress =
      (scrollWind.startZ - camera.position.z) /
      (scrollWind.startZ - scrollWind.endZ);
    const windProgress = clamp01(rawWindProgress);
    const windEased = THREE.MathUtils.smoothstep(windProgress, 0, 1);
    const activeWind = Math.sin(windEased * Math.PI);
    const windWave = Math.sin(
      windEased * Math.PI * 2 * scrollWind.cycles + scrollWind.phase,
    );
    const windX = home[0] + THREE.MathUtils.lerp(
      scrollWind.startOffsetX,
      scrollWind.endOffsetX,
      windEased,
    );
    const windY = home[1] + windWave * scrollWind.sway * activeWind;
    const windRotationX = windWave * 0.045 * responsive.motionScale * activeWind;
    const windRotationY = windWave * scrollWind.yaw * activeWind;
    const windRotationZ = scrollWind.tilt * windEased + windWave * scrollWind.wobble * activeWind;

    if (focused || focusProgress.current > 0) {
      g.visible = debug?.visible ?? true;
      const focusedLerp = debug?.focusedLerp ?? 0.12;

      if (focused) {
        // Fly to a fixed spot in front of the camera.
        camera.getWorldDirection(dir);
        target
          .copy(camera.position)
          .addScaledVector(
            dir,
            debug?.focusedDistance ?? responsive.projectFocusDistance,
          );
        // Start the travel gently while the sheet flips, then accelerate only
        // near the end. This lets the turn read clearly before the paper reaches
        // its final readable distance from the camera.
        const approachProgress = THREE.MathUtils.smootherstep(
          focusProgress.current,
          0.45,
          1,
        );
        const approachLerp =
          focusedLerp * THREE.MathUtils.lerp(0.12, 1, approachProgress);
        g.position.lerp(target, smoothLerpFactor(approachLerp, delta));
        // Face the camera, upright.
        g.quaternion.slerp(
          camera.quaternion,
          smoothLerpFactor(debug?.focusedQuaternionLerp ?? 0.15, delta),
        );
      } else {
        // Reverse the travel at the same time as the paper unfolds, returning
        // it to its live scroll-wind position instead of snapping it home.
        const returnProgress = 1 - focusProgress.current;
        target.set(windX, windY, home[2]);
        const returnLerp =
          focusedLerp * THREE.MathUtils.lerp(
            0.35,
            1,
            THREE.MathUtils.smootherstep(returnProgress, 0, 1),
          );
        g.position.lerp(target, smoothLerpFactor(returnLerp, delta));
        returnEuler.set(windRotationX, windRotationY, windRotationZ);
        returnQuaternion.setFromEuler(returnEuler);
        const returnQuaternionLerp =
          (debug?.focusedQuaternionLerp ?? 0.15) *
          THREE.MathUtils.lerp(
            0.4,
            1,
            THREE.MathUtils.smootherstep(returnProgress, 0, 1),
          );
        g.quaternion.slerp(
          returnQuaternion,
          smoothLerpFactor(returnQuaternionLerp, delta),
        );
      }

      // Tug down, curl toward the viewer, and complete a full turn. The back
      // passes through during the flip, but the project front settles open.
      focusProgress.current = responsive.reducedMotion
        ? focused ? 1 : 0
        : THREE.MathUtils.clamp(
            focusProgress.current + (focused ? 1 : -1) * delta / 0.88,
            0,
            1,
          );
      if (paperRoll) {
        const progress = focusProgress.current;
        // One continuous quintic curve avoids the tiny pauses that separate
        // the tug/lift/settle phases while keeping the same paper path.
        const rotationX = responsive.reducedMotion
          ? Math.PI * 2
          : THREE.MathUtils.smootherstep(progress, 0, 1) * Math.PI * 2;
        let offsetY = 0;
        let offsetZ = 0;
        let bend = 0;

        if (!responsive.reducedMotion && progress < 0.16) {
          const phase = THREE.MathUtils.smootherstep(progress / 0.16, 0, 1);
          offsetY = THREE.MathUtils.lerp(0, -0.18, phase);
          bend = THREE.MathUtils.lerp(0, 0.8, phase);
        } else if (!responsive.reducedMotion && progress < 0.62) {
          const phase = THREE.MathUtils.smootherstep((progress - 0.16) / 0.46, 0, 1);
          offsetY = THREE.MathUtils.lerp(-0.18, 0.32, phase);
          offsetZ = THREE.MathUtils.lerp(0, 0.14, phase);
          bend = THREE.MathUtils.lerp(0.8, -0.3, phase);
        } else {
          const phase = THREE.MathUtils.smootherstep((progress - 0.62) / 0.38, 0, 1);
          offsetY = THREE.MathUtils.lerp(0.32, 0, phase);
          offsetZ = THREE.MathUtils.lerp(0.14, 0, phase);
          bend = THREE.MathUtils.lerp(-0.3, 0, phase);
        }

        paperRoll.rotation.set(rotationX, 0, 0);
        paperRoll.position.set(0, offsetY, offsetZ);
        const focusedScale = THREE.MathUtils.lerp(1, 1.05, progress);
        paperRoll.scale.setScalar(focusedScale);
        if (paperMeshRef.current) paperMeshRef.current.bend = bend;
      }
    } else {
      focusProgress.current = 0;
      if (paperRoll) {
        paperRoll.position.set(0, 0, 0);
        paperRoll.rotation.set(0, 0, 0);
        paperRoll.scale.set(1, 1, 1);
      }
      if (paperMeshRef.current) paperMeshRef.current.bend = 0;
      g.visible = (debug?.visible ?? true) && rawWindProgress > 0 && rawWindProgress < 1;
      if (!g.visible) return;

      g.position.set(windX, windY, home[2]);
      g.rotation.set(windRotationX, windRotationY, windRotationZ);
    }

    // Keep the live-project artwork resting on the same curved paper surface.
    // This mirrors the sheet shader's bend and flutter at the button's Y point.
    if (liveButtonSurfaceRef.current) {
      const buttonY = debug?.buttonY ?? 0.88;
      const bend = paperMeshRef.current?.bend ?? 0;
      const flutterStrength = responsive.reducedMotion ? 0 : 0.012;
      const flutterScale = 1 + Math.abs(bend * 2.5);
      const flutterPhase = state.clock.elapsedTime * 2 + buttonY * 2;
      const surfaceZ =
        buttonY * buttonY * bend +
        Math.sin(flutterPhase) * flutterStrength * flutterScale;
      const surfaceSlope =
        2 * buttonY * bend +
        Math.cos(flutterPhase) * 2 * flutterStrength * flutterScale;

      liveButtonSurfaceRef.current.position.set(
        debug?.buttonX ?? 0,
        buttonY,
        (debug?.buttonZ ?? 0.03) + surfaceZ,
      );
      liveButtonSurfaceRef.current.rotation.x = Math.atan(surfaceSlope);
    }
  });

  const hasLiveLink = Boolean(project.link && project.link !== "#");
  const openLive = (event: any) => {
    event.stopPropagation();
    if (hasLiveLink) {
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
      <group
        ref={paperRollRef}
        name={`Project Paper Roll: ${project.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <ProjectPaperMesh
          ref={paperMeshRef}
          name={`Project Panel: ${project.name}`}
          sketch={project.panel.sketch}
          painted={project.panel.painted}
          back={projectUI.paperTexture}
          position={debugSpritePosition(debug)}
          height={paperHeight}
          renderOrder={debug?.renderOrder ?? 0}
          revealNear={focused ? (debug?.focusedRevealNear ?? 30) : (debug?.revealNear ?? 9)}
          revealFar={focused ? (debug?.focusedRevealFar ?? 40) : (debug?.revealFar ?? 22)}
          onClick={onToggle}
        />

        {(debug?.buttonVisible ?? true) ? (
          <group
            ref={liveButtonSurfaceRef}
            name={`Open Live Button Surface: ${project.name}`}
            position={[
              debug?.buttonX ?? 0,
              debug?.buttonY ?? 0.88,
              debug?.buttonZ ?? 0.03,
            ]}
          >
            <PaintSprite
              name={`Open Live Button: ${project.name}`}
              sketch={projectUI.openLive}
              height={debug?.buttonHeight ?? 0.3}
              renderOrder={debug?.buttonRenderOrder ?? (debug?.renderOrder ?? 0) + 1}
              billboard={false}
              autoReveal={false}
              depthWrite={false}
              interactive={focused && hasLiveLink}
              hoverScale={debug?.buttonHoverScale ?? 1.1}
              onClick={focused && hasLiveLink ? openLive : undefined}
            />
          </group>
        ) : null}
      </group>
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
