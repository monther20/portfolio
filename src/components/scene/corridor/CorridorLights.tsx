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
import {
  CORRIDOR_PENDANT_MODEL_URL,
  CORRIDOR_SCONCE_MODEL_URL,
} from "../assetPaths";
import {
  CORRIDOR_LAMPS,
  NIGHT_CONFIG,
} from "../dayNight/config";
import {
  useDayNight,
  useDayNightTransition,
} from "../dayNight/DayNightProvider";
import { useResponsiveExperience } from "../../ResponsiveExperience";

import { createCorridorLightSettings, type CorridorFixtureSettings, type CorridorLightSettings } from "./corridorLightSettings";
import { createCorridorFixturePalette } from "./corridorFixturePalette";

function CorridorFixture({
  fixture,
  index,
  sourcePositions,
  lanterns,
}: {
  fixture: CorridorFixtureSettings;
  index: number;
  sourcePositions: THREE.Vector3[];
  lanterns: CorridorLightSettings["lanterns"];
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
      applyPalette: createCorridorFixturePalette(materials.values()),
      materials,
    };
  }, [gltf.scene]);

  useLayoutEffect(() => {
    model.instance.updateWorldMatrix(true, true);
    // The named emitter in the generated GLB is authoritative, including the
    // pendant's drop and the sconce's bracket offset/rotation toward the room.
    model.source.getWorldPosition(sourcePositions[index]);
    sourcePositions[index].x += fixture.lightOffset[0];
    sourcePositions[index].y += fixture.lightOffset[1];
    sourcePositions[index].z += fixture.lightOffset[2];
  }, [fixture, index, model, sourcePositions]);

  useLayoutEffect(() => {
    transition.bloomSelection.push(model.glass, model.source);
    transition.registryVersion += 1;
    return () => {
      transition.registryVersion += 1;
      for (const mesh of [model.glass, model.source]) {
        const at = transition.bloomSelection.indexOf(mesh);
        if (at >= 0) transition.bloomSelection.splice(at, 1);
      }
    };
  }, [model, transition]);

  useDayNightTransition(
    useCallback(
      (amount) => {
        model.applyPalette(amount);
        model.glassMaterial.emissive.set(lanterns.glassColor);
        model.sourceMaterial.emissive.set(lanterns.sourceColor);
        model.glassMaterial.emissiveIntensity =
          lanterns.glassEmission * amount;
        model.sourceMaterial.emissiveIntensity =
          lanterns.sourceEmission * amount;
        model.sourceMaterial.opacity = amount;
        model.source.visible = amount > 0;
      },
      [lanterns, model],
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
      scale={fixture.scale}
      visible={fixture.visible}
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
  const settings = useMemo(createCorridorLightSettings, []);
  const fixtureCount = settings.fixtures.length;
  const sources = useMemo(
    () => Array.from({ length: fixtureCount }, () => new THREE.Vector3()),
    [fixtureCount],
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
        const fixture = settings.fixtures[index];
        if (!fixture.visible) continue;
        const fade = fixture.intensityMultiplier * (
          1 -
          THREE.MathUtils.smoothstep(
            Math.abs(camera.position.z - sources[index].z),
            settings.lighting.fadeNear,
            settings.lighting.fadeFar,
          ));
        if (fade > strength) {
          strength = fade;
          light.position.copy(sources[index]);
        }
      }
      light.intensity = settings.lighting.intensity * amount * strength;
      transition.uniforms.lanternPositions.value[slot + 2].copy(light.position);
      transition.uniforms.lanternIntensities.value[slot + 2] = light.intensity;
    });
  }, -2);

  return (
    <group name="Illustrated Corridor Lights">
      {settings.fixtures.map((fixture, index) => (
        <CorridorFixture
          key={index}
          index={index}
          fixture={fixture}
          sourcePositions={sources}
          lanterns={settings.lanterns}
        />
      ))}
      {lights.map((light) => (
        <primitive key={light.uuid} object={light} />
      ))}
    </group>
  );
}
