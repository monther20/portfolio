"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { HalfFloatType, type Object3D } from "three";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SelectiveBloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";
import { useDayNight } from "./DayNightProvider";
import { NIGHT_BLOOM, NIGHT_CONFIG } from "./config";

/** A small R3F adapter with explicit GPU ownership. Using postprocessing directly
 * avoids upgrading Fiber just for a wrapper. Only registered glass/source meshes
 * enter bloom: no white walls, colored panels, normal pass, SSAO or MSAA.
 */
export default function NightPostProcessing() {
  const { gl, scene, camera, size, viewport } = useThree();
  const { transition } = useDayNight();
  const resources = useRef<{
    composer: EffectComposer;
    bloom: SelectiveBloomEffect;
    lights: Object3D[];
    registryVersion: number;
  } | null>(null);

  useEffect(() => {
    const originalAutoClear = gl.autoClear;
    const composer = new EffectComposer(gl, {
      multisampling: 0,
      frameBufferType: HalfFloatType,
    });
    const bloom = new SelectiveBloomEffect(scene, camera, {
      intensity: 0,
      luminanceThreshold: NIGHT_BLOOM.threshold,
      luminanceSmoothing: NIGHT_BLOOM.smoothing,
      resolutionScale: NIGHT_BLOOM.resolutionScale,
      mipmapBlur: true,
      levels: NIGHT_BLOOM.levels,
      radius: NIGHT_BLOOM.radius,
    });
    bloom.ignoreBackground = true;
    composer.addPass(new RenderPass(scene, camera));
    // Linear is identity at exposure=1, unlike filmic curves; it honors the
    // animated renderer.toneMappingExposure without changing the pencil palette.
    composer.addPass(
      new EffectPass(
        camera,
        bloom,
        new ToneMappingEffect({ mode: ToneMappingMode.LINEAR }),
      ),
    );
    const owned = {
      composer,
      bloom,
      lights: [] as Object3D[],
      registryVersion: -1,
    };
    resources.current = owned;
    return () => {
      resources.current = null;
      owned.lights.forEach((light) =>
        light.layers.disable(bloom.selection.layer),
      );
      bloom.selection.clear();
      composer.dispose(); // Owns passes/effects, render targets and blur mipmaps.
      gl.autoClear = originalAutoClear;
    };
  }, [camera, gl, scene, transition]);

  useEffect(() => {
    resources.current?.composer.setSize(size.width, size.height);
  }, [size.width, size.height, viewport.dpr]);

  useFrame((_, delta) => {
    if (resources.current) {
      const owned = resources.current;
      // Corridor GLBs mount after entering the door, often while already night.
      if (owned.registryVersion !== transition.registryVersion) {
        owned.lights.forEach((light) =>
          light.layers.disable(owned.bloom.selection.layer),
        );
        owned.lights = [...transition.lights];
        owned.lights.forEach((light) =>
          light.layers.enable(owned.bloom.selection.layer),
        );
        owned.bloom.selection.set(transition.bloomSelection);
        owned.registryVersion = transition.registryVersion;
      }
      resources.current.bloom.intensity =
        NIGHT_CONFIG.bloomIntensity * transition.uniforms.nightAmount.value;
      resources.current.composer.render(delta);
    } else {
      gl.render(scene, camera);
    }
  }, 1);
  return null;
}
