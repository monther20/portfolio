"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { projectUI } from "@/data/portfolio";
import { useResponsiveExperience } from "../../../ResponsiveExperience";
import { useDayNightTransition } from "../../dayNight/DayNightProvider";
import { useFogFade } from "../../useFogFade";
import {
  createPaperBoatGeometry,
  paperBoatNoRaycast,
} from "./paperBoatGeometry";
import {
  clonePaperBoatTexture,
  createPaperBoatMaterials,
} from "./paperBoatMaterials";
import {
  createPaperBoatSettings,
  paperBoatForView,
  paperBoatPosition,
  writePaperBoatPose,
  type PaperBoatSettings,
} from "./paperBoatConfig";
import { BEACH } from "../../journeyConfig";

type BoatGeometry = ReturnType<typeof createPaperBoatGeometry>;
type BoatMaterials = ReturnType<typeof createPaperBoatMaterials>;
type SharedPaper = {
  geometry: BoatGeometry;
  texture: THREE.Texture;
  waterPatch: THREE.PlaneGeometry;
};

function PaperBoat({
  boat,
  shared,
  autoFit,
  motion,
}: {
  boat: PaperBoatSettings["boats"][number];
  shared: SharedPaper;
  autoFit: boolean;
  motion: number;
}) {
  const anchor = useRef<THREE.Group>(null);
  const drift = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const pose = useRef({ x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 });
  const [materials, setMaterials] = useState<BoatMaterials | null>(null);
  const responsive = useResponsiveExperience();
  const placed = autoFit
    ? paperBoatForView(boat, responsive.aspect, responsive.cameraFov)
    : boat;
  const position: [number, number, number] = autoFit
    ? paperBoatPosition(placed, responsive.aspect, responsive.cameraFov)
    : [boat.x, BEACH.seaY, boat.z];
  useFogFade(anchor, { preserveTransparency: true });

  // Effect-owned resources survive neither unmount nor a Strict Mode setup cycle.
  // R3F disposal is disabled below so there is exactly one owner for each resource.
  useLayoutEffect(() => {
    const owned = createPaperBoatMaterials(shared.texture);
    setMaterials(owned);
    return () => owned.dispose();
  }, [shared.texture]);
  useDayNightTransition(
    useCallback(
      (amount: number) => {
        materials?.applyNight(amount, boat.lighting);
      },
      [boat.lighting, materials],
    ),
  );

  useFrame(({ clock }) => {
    // useFogFade runs first; custom shaders must explicitly consume its opacity.
    if (materials) materials.wash.uniforms.fade.value = materials.wash.opacity;
    if (!bob.current || !drift.current) return;
    writePaperBoatPose(
      pose.current,
      clock.elapsedTime,
      boat.phase,
      responsive.motionScale * motion,
    );
    // Move the boat and its light spill together across the sea. The wash
    // stays horizontal at the waterline while only the hull rides the swell.
    drift.current.position.set(
      pose.current.x * placed.scale, 0, pose.current.z * placed.scale,
    );
    drift.current.rotation.y = boat.heading + pose.current.yaw;
    // Scale bob with the hull too: tiny phone boats must never lift off the sea.
    bob.current.position.y = pose.current.y * placed.scale;
    bob.current.rotation.set(pose.current.pitch, 0, pose.current.roll);
  });

  return (
    <group
      ref={anchor}
      name={`Paper Boat ${boat.id}`}
      position={position}
      dispose={null}
    >
      <group
        ref={drift}
        name={`Paper Boat Drift ${boat.id}`}
        visible={boat.visible}
        rotation={[0, boat.heading, 0]}
      >
        {materials && (
          <mesh
            name={`Paper Boat Water Glow ${boat.id}`}
            geometry={shared.waterPatch}
            material={materials.wash}
            position={[
              boat.lighting.washOffsetX * placed.scale,
              0.012,
              boat.lighting.washOffsetZ * placed.scale,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[
              placed.scale * boat.lighting.washWidth,
              placed.scale * boat.lighting.washLength,
              1,
            ]}
            // Draw after the transparent sea, while still depth-testing the pier/hull.
            renderOrder={1}
            raycast={paperBoatNoRaycast}
          />
        )}
        <group ref={bob} name={`Paper Boat Motion ${boat.id}`}>
          <group scale={placed.scale} position={[0, boat.hullHeight, 0]}>
            {materials && (
              <>
                <mesh
                  name={`Paper Boat Folds ${boat.id}`}
                  geometry={shared.geometry.paper}
                  material={materials.surfaces}
                  raycast={paperBoatNoRaycast}
                />
                <lineSegments
                  name={`Paper Boat Pencil ${boat.id}`}
                  geometry={shared.geometry.pencil}
                  material={materials.pencil}
                  raycast={paperBoatNoRaycast}
                />
              </>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

/** Three purely decorative paper boats; no journey state, interactions or light slots. */
export default function PaperBoats() {
  const settings = useMemo(createPaperBoatSettings, []);
  const source = useLoader(THREE.TextureLoader, projectUI.paperTexture);
  const [shared, setShared] = useState<SharedPaper | null>(null);
  useEffect(() => {
    const owned = {
      geometry: createPaperBoatGeometry(),
      texture: clonePaperBoatTexture(source),
      waterPatch: new THREE.PlaneGeometry(1, 1),
    };
    setShared(owned);
    return () => {
      owned.geometry.dispose();
      owned.texture.dispose();
      owned.waterPatch.dispose();
    };
  }, [source]);

  return (
    <group name="Beach Paper Boats" dispose={null}>
      {shared &&
        settings.boats.map((boat) => (
          <PaperBoat
            key={boat.id}
            boat={boat}
            shared={shared}
            autoFit={settings.autoFit}
            motion={settings.motion}
          />
        ))}
    </group>
  );
}
