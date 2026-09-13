"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CORRIDOR } from "../journeyConfig";
import {
  CORRIDOR_PENDANT_MODEL_URL,
  CORRIDOR_SCONCE_MODEL_URL,
} from "../assetPaths";
import {
  CORRIDOR_LAMPS,
  CORRIDOR_LAMP_DEPTHS,
  NIGHT_CONFIG,
} from "../dayNight/config";
import {
  useDayNight,
  useDayNightTransition,
} from "../dayNight/DayNightProvider";
import { useResponsiveExperience } from "../../ResponsiveExperience";

// Alongside the wall displays and clear of the walking/camera line. Each
// light slot's fixtures are >46 units apart: their camera fades never overlap.
const CORRIDOR_LAMP_LAYOUT = CORRIDOR_LAMP_DEPTHS.map((depth, index) => {
  const pendant = index === 1 || index === 7;
  const side = index % 2 === 0 ? -1 : 1;
  return {
    pendant,
    position: [
      pendant ? 0 : side * (CORRIDOR.halfWidth - CORRIDOR_LAMPS.wallInset),
      pendant
        ? CORRIDOR.ceilY - CORRIDOR_LAMPS.ceilingInset
        : CORRIDOR_LAMPS.sconceHeight,
      CORRIDOR.startZ - depth,
    ] as [number, number, number],
    rotation: [0, pendant ? 0 : (-side * Math.PI) / 2, 0] as [
      number,
      number,
      number,
    ],
  };
});

type Fixture = (typeof CORRIDOR_LAMP_LAYOUT)[number];

function CorridorFixture({
  fixture,
  index,
  sourcePositions,
}: {
  fixture: Fixture;
  index: number;
  sourcePositions: THREE.Vector3[];
}) {
  const gltf = useGLTF(
    fixture.pendant ? CORRIDOR_PENDANT_MODEL_URL : CORRIDOR_SCONCE_MODEL_URL,
  );
  const { transition, toggle, enabled } = useDayNight();
  const { isCoarsePointer } = useResponsiveExperience();
  const [hovered, setHovered] = useState(false);
  const model = useMemo(() => {
    const instance = gltf.scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();
    instance.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) &&
        !(object instanceof THREE.LineSegments)
      )
        return;
      const clone = (source: THREE.Material) => {
        if (!materials.has(source)) materials.set(source, source.clone());
        return materials.get(source)!;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(clone)
        : clone(object.material);
      if (object instanceof THREE.LineSegments) object.raycast = () => {};
    });
    const glass = instance.getObjectByName("Glass_Panels");
    const source = instance.getObjectByName("Light_Source");
    if (
      !(glass instanceof THREE.Mesh) ||
      !(source instanceof THREE.Mesh) ||
      !(glass.material instanceof THREE.MeshStandardMaterial) ||
      !(source.material instanceof THREE.MeshStandardMaterial)
    ) {
      throw new Error(
        "Generated corridor fixture is missing its glass or light source.",
      );
    }
    glass.material.depthWrite = false;
    source.material.depthWrite = false;
    glass.material.emissive.set(NIGHT_CONFIG.glassEmissiveColor);
    source.material.emissive.set(NIGHT_CONFIG.sourceEmissiveColor);
    source.visible = false;
    return {
      instance,
      glass,
      source,
      glassMaterial: glass.material,
      sourceMaterial: source.material,
      materials,
    };
  }, [gltf.scene]);

  useLayoutEffect(() => {
    model.instance.updateWorldMatrix(true, true);
    // The named emitter in the generated GLB is authoritative, including the
    // pendant's drop and the sconce's bracket offset/rotation toward the room.
    model.source.getWorldPosition(sourcePositions[index]);
    transition.bloomSelection.push(model.glass, model.source);
    transition.registryVersion += 1;
    return () => {
      transition.registryVersion += 1;
      for (const mesh of [model.glass, model.source]) {
        const at = transition.bloomSelection.indexOf(mesh);
        if (at >= 0) transition.bloomSelection.splice(at, 1);
      }
    };
  }, [index, model, sourcePositions, transition]);

  useDayNightTransition(
    useCallback(
      (amount) => {
        model.glassMaterial.emissiveIntensity =
          CORRIDOR_LAMPS.glassEmission * amount;
        model.sourceMaterial.emissiveIntensity =
          CORRIDOR_LAMPS.sourceEmission * amount;
        model.sourceMaterial.opacity = amount;
        model.source.visible = amount > 0;
      },
      [model],
    ),
  );

  useEffect(() => {
    if (!hovered || !enabled || isCoarsePointer) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [enabled, hovered, isCoarsePointer]);
  useEffect(
    () => () => model.materials.forEach((material) => material.dispose()),
    [model],
  );

  return (
    <primitive
      object={model.instance}
      dispose={null}
      name={`Corridor ${fixture.pendant ? "Pendant" : "Sconce"} ${index + 1}`}
      position={fixture.position}
      rotation={fixture.rotation}
      onClick={
        enabled
          ? (event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              if (event.delta <= 4) toggle();
            }
          : undefined
      }
      onPointerOver={
        enabled
          ? (event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={() => setHovered(false)}
    />
  );
}

export default function CorridorLights() {
  const { transition } = useDayNight();
  const sources = useMemo(
    () => CORRIDOR_LAMP_LAYOUT.map(() => new THREE.Vector3()),
    [],
  );
  const lights = useMemo(
    () =>
      Array.from({ length: CORRIDOR_LAMPS.lightPoolSize }, (_, index) => {
        const light = new THREE.PointLight(
          NIGHT_CONFIG.lanternColor,
          0,
          NIGHT_CONFIG.lanternDistance,
          NIGHT_CONFIG.lanternDecay,
        );
        light.name = `Corridor Warm Light ${index + 1}`;
        light.castShadow = false;
        return light;
      }),
    [],
  );

  useLayoutEffect(() => {
    transition.lights.push(...lights);
    transition.registryVersion += 1;
    return () => {
      transition.registryVersion += 1;
      lights.forEach((light, index) => {
        const at = transition.lights.indexOf(light);
        if (at >= 0) transition.lights.splice(at, 1);
        transition.uniforms.lanternIntensities.value[index + 2] = 0;
      });
    };
  }, [lights, transition]);

  useFrame(({ camera }) => {
    const amount = transition.uniforms.nightAmount.value;
    lights.forEach((light, slot) => {
      let strength = 0;
      for (let index = slot; index < sources.length; index += lights.length) {
        const fade =
          1 -
          THREE.MathUtils.smoothstep(
            Math.abs(camera.position.z - sources[index].z),
            CORRIDOR_LAMPS.fadeNear,
            CORRIDOR_LAMPS.fadeFar,
          );
        if (fade > strength) {
          strength = fade;
          light.position.copy(sources[index]);
        }
      }
      light.intensity = CORRIDOR_LAMPS.intensity * amount * strength;
      transition.uniforms.lanternPositions.value[slot + 2].copy(light.position);
      transition.uniforms.lanternIntensities.value[slot + 2] = light.intensity;
    });
  }, -2);

  return (
    <group name="Illustrated Corridor Lights">
      {CORRIDOR_LAMP_LAYOUT.map((fixture, index) => (
        <CorridorFixture
          key={index}
          index={index}
          fixture={fixture}
          sourcePositions={sources}
        />
      ))}
      {lights.map((light) => (
        <primitive key={light.uuid} object={light} />
      ))}
    </group>
  );
}
