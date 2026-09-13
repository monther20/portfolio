"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGLTF } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM_LANTERN_MODEL_URL } from "./assetPaths";
import { useResponsiveExperience } from "../ResponsiveExperience";
import {
  useDayNight,
  useDayNightTransition,
} from "./dayNight/DayNightProvider";
import {
  DAY_CONFIG,
  LANTERN_GLOW,
  NIGHT_CONFIG,
  type LanternIndex,
  type LanternUniforms,
} from "./dayNight/config";
import { addUnlitNightLighting } from "./dayNight/unlitNightMaterial";

function createLantern(
  source: THREE.Group,
  uniforms: LanternUniforms,
  renderOrder: number,
) {
  const instance = source.clone(true);
  const materials = new Map<THREE.Material, THREE.Material>();
  instance.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.renderOrder = renderOrder;
    const clone = (original: THREE.Material) => {
      if (!materials.has(original)) {
        const material = original.clone();
        if (material instanceof THREE.MeshBasicMaterial)
          addUnlitNightLighting(material, uniforms, "lantern");
        materials.set(original, material);
      }
      return materials.get(original)!;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(clone)
      : clone(object.material);
  });

  const glass = instance.getObjectByName("Glass_Panels");
  const interior = instance.getObjectByName("Interior_Emissive_Light");
  if (
    !(glass instanceof THREE.Mesh) ||
    !(interior instanceof THREE.Mesh) ||
    !(glass.material instanceof THREE.MeshStandardMaterial) ||
    !(interior.material instanceof THREE.MeshStandardMaterial)
  ) {
    throw new Error(
      "The lantern model is missing its controllable glass/source materials.",
    );
  }
  const glassMaterial = glass.material;
  const sourceMaterial = interior.material;
  // Match the former setLight(false) appearance exactly, including transparency
  // and the atlas's graphite/emissive maps. Cached GLTF materials stay untouched.
  glassMaterial.depthWrite = false;
  glassMaterial.side = THREE.FrontSide;
  glassMaterial.roughness = 1;
  glassMaterial.color.set(DAY_CONFIG.glassColor);
  glassMaterial.emissive.set(DAY_CONFIG.glassEmissiveColor);
  glassMaterial.emissiveIntensity = DAY_CONFIG.glassEmissiveIntensity;
  glass.renderOrder = 2;
  interior.renderOrder = 1;
  interior.visible = false;
  sourceMaterial.toneMapped = false;
  sourceMaterial.color.set(DAY_CONFIG.sourceColor);
  sourceMaterial.emissive.set(NIGHT_CONFIG.sourceEmissiveColor);
  sourceMaterial.emissiveIntensity = DAY_CONFIG.sourceEmissiveIntensity;
  sourceMaterial.opacity = 0;

  // GLB node origin + geometry bounds, not the lantern group's origin. The bulb
  // resolves to local (0, .276, 0): world (-2.85, 1.24, -15.57) / (2.77, 1.25, -15.57).
  instance.updateWorldMatrix(true, true);
  const center = new THREE.Box3()
    .setFromObject(interior)
    .getCenter(new THREE.Vector3());
  instance.worldToLocal(center);
  const light = new THREE.PointLight(
    NIGHT_CONFIG.lanternColor,
    0,
    NIGHT_CONFIG.lanternDistance,
    NIGHT_CONFIG.lanternDecay,
  );
  light.name = "Lantern Bulb Light";
  light.position.copy(center);
  light.castShadow = false;
  instance.add(light);

  return {
    instance,
    light,
    glass,
    interior,
    glassMaterial,
    sourceMaterial,
    dayGlass: glassMaterial.color.clone(),
    dayGlassEmission: glassMaterial.emissive.clone(),
    daySource: sourceMaterial.color.clone(),
    nightGlass: new THREE.Color(NIGHT_CONFIG.glassColor),
    nightGlassEmission: new THREE.Color(NIGHT_CONFIG.glassEmissiveColor),
    nightSource: new THREE.Color(NIGHT_CONFIG.sourceColor),
    dispose: () => materials.forEach((material) => material.dispose()),
  };
}

function createPaintedGlow() {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      glowColor: { value: new THREE.Color(NIGHT_CONFIG.lanternColor) },
      glowOpacity: { value: 0 },
    },
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 glowColor; uniform float glowOpacity; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        // Low-frequency uneven brush edges, rather than a perfect UI circle.
        p.x += 0.065 * sin(p.y * 8.0 + 0.7);
        p.y += 0.045 * sin(p.x * 11.0);
        float r = dot(p, p);
        float brush = 0.92 + 0.08 * sin(p.x * 19.0 + sin(p.y * 13.0));
        float alpha = exp(-3.5 * r) * (1.0 - smoothstep(0.35, 1.0, r)) * brush;
        gl_FragColor = vec4(glowColor, glowOpacity * alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
}

/** Both existing lanterns operate the same hero time-of-day state. */
export default function Lantern({
  index,
  position,
  rotation,
  scale,
  visible,
  renderOrder,
  wallZ,
}: {
  index: LanternIndex;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  renderOrder: number;
  wallZ: number;
}) {
  const gltf = useGLTF(ROOM_LANTERN_MODEL_URL);
  const { transition, toggle, enabled } = useDayNight();
  const { isCoarsePointer } = useResponsiveExperience();
  const [hovered, setHovered] = useState(false);
  const model = useMemo(
    () => createLantern(gltf.scene, transition.uniforms, renderOrder),
    [gltf.scene, renderOrder, transition],
  );
  const glowMaterial = useMemo(createPaintedGlow, []);
  const glow = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const { lights, bloomSelection, uniforms } = transition;
    model.instance.updateWorldMatrix(true, true);
    model.light.getWorldPosition(uniforms.lanternPositions.value[index]);
    uniforms.lanternIntensities.value[index] = model.light.intensity;
    const center = uniforms.lanternPositions.value[index];
    glow.current?.position.set(
      center.x,
      center.y,
      wallZ + LANTERN_GLOW.wallOffset,
    );
    lights.push(model.light);
    bloomSelection.push(model.glass, model.interior);
    transition.registryVersion += 1;
    return () => {
      transition.registryVersion += 1;
      lights.splice(lights.indexOf(model.light), 1);
      for (const mesh of [model.glass, model.interior])
        bloomSelection.splice(bloomSelection.indexOf(mesh), 1);
      uniforms.lanternIntensities.value[index] = 0;
    };
  }, [index, model, position, rotation, scale, transition, wallZ]);

  useDayNightTransition(
    useCallback(
      (amount) => {
        model.light.intensity = visible
          ? THREE.MathUtils.lerp(
              DAY_CONFIG.lanternIntensity,
              NIGHT_CONFIG.lanternIntensity,
              amount,
            )
          : 0;
        transition.uniforms.lanternIntensities.value[index] =
          model.light.intensity;
        model.glassMaterial.color
          .copy(model.dayGlass)
          .lerp(model.nightGlass, amount);
        model.glassMaterial.emissive
          .copy(model.dayGlassEmission)
          .lerp(model.nightGlassEmission, amount);
        model.glassMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          DAY_CONFIG.glassEmissiveIntensity,
          NIGHT_CONFIG.glassEmissiveIntensity,
          amount,
        );
        model.sourceMaterial.color
          .copy(model.daySource)
          .lerp(model.nightSource, amount);
        model.sourceMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          DAY_CONFIG.sourceEmissiveIntensity,
          NIGHT_CONFIG.sourceEmissiveIntensity,
          amount,
        );
        model.sourceMaterial.opacity = amount;
        model.interior.visible = amount > 0;
        glowMaterial.uniforms.glowOpacity.value = THREE.MathUtils.lerp(
          DAY_CONFIG.glowOpacity,
          NIGHT_CONFIG.glowOpacity,
          amount,
        );
        if (glow.current) glow.current.visible = visible && amount > 0;
      },
      [glowMaterial, index, model, transition, visible],
    ),
  );

  useEffect(() => {
    if (!hovered || !enabled || !visible || isCoarsePointer) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [enabled, hovered, isCoarsePointer, visible]);

  useEffect(
    () => () => {
      model.dispose();
      glowMaterial.dispose();
    },
    [glowMaterial, model],
  );

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta <= 4) toggle();
  };
  return (
    <group>
      <primitive
        object={model.instance}
        dispose={null}
        position={position}
        rotation={rotation}
        scale={scale}
        visible={visible}
        onClick={enabled ? handleClick : undefined}
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
      <mesh
        ref={glow}
        name="Painted Lantern Wall Wash"
        material={glowMaterial}
        raycast={() => {}}
      >
        <planeGeometry args={[LANTERN_GLOW.width, LANTERN_GLOW.height]} />
      </mesh>
    </group>
  );
}
