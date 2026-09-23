"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getFogFadeRange } from "../fogVisibility";
import { configureArtworkTexture } from "../artworkTexture";
import {
  prepareTextureForRenderer,
  useProgressiveArtwork,
} from "../ProgressiveArtwork";
import { useJourneyStagePreparation } from "../journeyStagePreparation";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import { useDayNight } from "../dayNight/DayNightProvider";
import { NIGHT_CONFIG } from "../dayNight/config";

const vertexShader = /* glsl */ `
  uniform float bend;
  uniform float flutter;
  uniform float time;
  varying vec2 vUv;
  varying float vFogDepth;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    transformed.z += transformed.y * transformed.y * bend;
    transformed.z += sin(time * 2.0 + transformed.y * 2.0) * flutter * (1.0 + abs(bend * 2.5));

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vFogDepth = -mvPosition.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D texSketchPreview;
  uniform sampler2D texPaintPreview;
  uniform sampler2D texSketchOriginal;
  uniform sampler2D texPaintOriginal;
  uniform sampler2D texBack;
  uniform float quality;
  uniform float reveal;
  uniform float nightAmount;
  uniform vec3 nightTint;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform float fogFadeNear;
  uniform float fogFadeFar;
  varying vec2 vUv;
  varying float vFogDepth;

  void main() {
    vec4 color;

    if (gl_FrontFacing) {
      vec4 sketch = mix(
        texture2D(texSketchPreview, vUv),
        texture2D(texSketchOriginal, vUv),
        quality
      );
      vec4 painted = mix(
        texture2D(texPaintPreview, vUv),
        texture2D(texPaintOriginal, vUv),
        quality
      );
      float luma = dot(sketch.rgb, vec3(0.299, 0.587, 0.114));
      vec3 pencil = vec3(luma);
      float wipe = smoothstep(1.08 - reveal * 1.28, 1.28 - reveal * 1.28, vUv.y);
      color = vec4(mix(pencil, painted.rgb, wipe), mix(sketch.a, painted.a, wipe));
    } else {
      color = texture2D(texBack, vec2(1.0 - vUv.x, vUv.y));
    }

    if (color.a < 0.2) discard;

    float fogAlpha = 1.0 - smoothstep(fogFadeNear, fogFadeFar, vFogDepth);
    if (fogAlpha <= 0.01) discard;

    color.a *= fogAlpha;
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    color.rgb *= mix(vec3(1.0), nightTint, nightAmount);
    color.rgb = mix(color.rgb, fogColor, fogFactor);
    gl_FragColor = color;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type ProjectPaperMeshHandle = {
  bend: number;
};

type ProjectPaperMeshProps = {
  name: string;
  sketch: string;
  painted?: string;
  back: string;
  position?: [number, number, number];
  height: number;
  revealNear: number;
  revealFar: number;
  renderOrder?: number;
  onClick: (event: any) => void;
};

/** A double-sided, subdivided project sheet that can physically bend while flipping. */
const ProjectPaperMesh = forwardRef<ProjectPaperMeshHandle, ProjectPaperMeshProps>(
  function ProjectPaperMesh(
    {
      name,
      sketch,
      painted,
      back,
      position = [0, 0, 0],
      height,
      revealNear,
      revealFar,
      renderOrder = 0,
      onClick,
    },
    ref,
  ) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const bendRef = useRef(0);
    const qualityTarget = useRef(0);
    const { camera, gl, scene } = useThree();
    const registerStagePreparation = useJourneyStagePreparation();
    const responsive = useResponsiveExperience();
    const { transition } = useDayNight();
    const sketchTexture = useProgressiveArtwork(sketch);
    const paintTexture = useProgressiveArtwork(painted ?? sketch);
    const originalsReady =
      sketchTexture.originalReady && paintTexture.originalReady;
    const texBack = useLoader(THREE.TextureLoader, back);
    const worldPosition = useMemo(() => new THREE.Vector3(), []);

    useImperativeHandle(ref, () => ({
      get bend() {
        return bendRef.current;
      },
      set bend(value: number) {
        bendRef.current = value;
      },
    }), []);

    useEffect(() => {
      configureArtworkTexture(
        texBack,
        gl.capabilities.getMaxAnisotropy(),
      );
      const preparation = prepareTextureForRenderer(gl, texBack, false);
      registerStagePreparation?.(preparation);
    }, [gl, registerStagePreparation, texBack]);

    useEffect(
      () => () => {
        if (!responsive.isCoarsePointer) document.body.style.cursor = "auto";
      },
      [responsive.isCoarsePointer],
    );

    const width = useMemo(
      () =>
        height *
        (paintTexture.height
          ? paintTexture.width / paintTexture.height
          : 0.5),
      [height, paintTexture.height, paintTexture.width],
    );

    const uniforms = useMemo(() => ({
      texSketchPreview: { value: sketchTexture.preview },
      texPaintPreview: { value: paintTexture.preview },
      texSketchOriginal: { value: sketchTexture.preview },
      texPaintOriginal: { value: paintTexture.preview },
      texBack: { value: texBack },
      quality: { value: 0 },
      reveal: { value: 0 },
      nightAmount: transition.uniforms.nightAmount,
      nightTint: { value: new THREE.Color(NIGHT_CONFIG.unlitTint.illustration) },
      bend: { value: 0 },
      flutter: { value: 0.012 },
      time: { value: 0 },
      fogColor: { value: new THREE.Color(1, 1, 1) },
      fogNear: { value: 5 },
      fogFar: { value: 55 },
      fogFadeNear: { value: 27.5 },
      fogFadeFar: { value: 41 },
    }), [paintTexture.preview, sketchTexture.preview, texBack, transition]);

    useEffect(() => {
      const material = materialRef.current;
      if (!material) return;

      material.uniforms.texSketchPreview.value = sketchTexture.preview;
      material.uniforms.texPaintPreview.value = paintTexture.preview;
      material.uniforms.texSketchOriginal.value = originalsReady
        ? sketchTexture.original
        : sketchTexture.preview;
      material.uniforms.texPaintOriginal.value = originalsReady
        ? paintTexture.original
        : paintTexture.preview;
      qualityTarget.current = originalsReady ? 1 : 0;
      if (!originalsReady) material.uniforms.quality.value = 0;
    }, [originalsReady, paintTexture, sketchTexture]);

    useFrame((state, delta) => {
      const material = materialRef.current;
      if (!material) return;

      material.uniforms.time.value = state.clock.elapsedTime;
      material.uniforms.bend.value = bendRef.current;
      material.uniforms.flutter.value = responsive.reducedMotion ? 0 : 0.012;
      material.uniforms.quality.value = responsive.reducedMotion
        ? qualityTarget.current
        : THREE.MathUtils.damp(
            material.uniforms.quality.value,
            qualityTarget.current,
            12,
            delta,
          );

      if (meshRef.current) {
        meshRef.current.getWorldPosition(worldPosition);
        const distance = worldPosition.distanceTo(camera.position);
        const distanceReveal = 1 - THREE.MathUtils.smoothstep(distance, revealNear, revealFar);
        material.uniforms.reveal.value = THREE.MathUtils.lerp(
          material.uniforms.reveal.value,
          distanceReveal,
          0.08,
        );
      }

      if (scene.fog instanceof THREE.Fog) {
        const { fadeNear, fadeFar } = getFogFadeRange(scene.fog);
        material.uniforms.fogColor.value.copy(scene.fog.color);
        material.uniforms.fogNear.value = scene.fog.near;
        material.uniforms.fogFar.value = scene.fog.far;
        material.uniforms.fogFadeNear.value = fadeNear;
        material.uniforms.fogFadeFar.value = fadeFar;
      }
    });

    return (
      <group name={name} position={position}>
        <mesh
          ref={meshRef}
          name={`${name} Mesh`}
          renderOrder={renderOrder}
          onClick={(event) => {
            event.stopPropagation();
            onClick(event);
          }}
          onPointerEnter={(event) => {
            event.stopPropagation();
            if (!responsive.isCoarsePointer) document.body.style.cursor = "pointer";
          }}
          onPointerLeave={(event) => {
            event.stopPropagation();
            if (!responsive.isCoarsePointer) document.body.style.cursor = "auto";
          }}
        >
          <planeGeometry args={[width, height, 16, 16]} />
          <shaderMaterial
            ref={materialRef}
            uniforms={uniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthTest
            depthWrite
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    );
  },
);

export default ProjectPaperMesh;
