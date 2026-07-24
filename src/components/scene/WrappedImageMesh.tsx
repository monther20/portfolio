"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";

import { getFogFadeRange } from "./fogVisibility";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vFogDepth;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    vFogDepth = -mvPos.z;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying float vFogDepth;

  uniform sampler2D texSketch;
  uniform sampler2D texPaint;
  uniform float reveal;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform float fogFadeNear;
  uniform float fogFadeFar;

  void main() {
    vec4 sketch = texture2D(texSketch, vUv);
    vec4 paint = texture2D(texPaint, vUv);

    float luma = dot(sketch.rgb, vec3(0.299, 0.587, 0.114));
    float wipeLine = 1.0 - (reveal * 1.35 - 0.18);
    float paintedAmount = smoothstep(wipeLine - 0.16, wipeLine + 0.16, vUv.y);
    vec3 color = mix(vec3(luma), paint.rgb, paintedAmount);
    float alpha = mix(sketch.a, paint.a, paintedAmount);

    if (alpha < 0.35) discard;

    float fogAlpha = 1.0 - smoothstep(fogFadeNear, fogFadeFar, vFogDepth);
    if (fogAlpha <= 0.01) discard;

    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    color = mix(color, fogColor, fogFactor);
    gl_FragColor = vec4(color, alpha * fogAlpha);
    #include <colorspace_fragment>
  }
`;

type Point = [number, number, number];
type Uv = [number, number];

function createWrappedGeometry(
  width: number,
  height: number,
  depth: number,
  horizontalBorderUv: number,
  verticalBorderUv: number,
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const positions: number[] = [];
  const uvs: number[] = [];

  const addQuad = (a: Point, b: Point, c: Point, d: Point, uvA: Uv, uvB: Uv, uvC: Uv, uvD: Uv) => {
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    uvs.push(...uvA, ...uvB, ...uvC, ...uvA, ...uvC, ...uvD);
  };

  // Front and back use the complete illustration.
  addQuad(
    [-halfWidth, -halfHeight, halfDepth],
    [halfWidth, -halfHeight, halfDepth],
    [halfWidth, halfHeight, halfDepth],
    [-halfWidth, halfHeight, halfDepth],
    [0, 0], [1, 0], [1, 1], [0, 1],
  );
  addQuad(
    [halfWidth, -halfHeight, -halfDepth],
    [-halfWidth, -halfHeight, -halfDepth],
    [-halfWidth, halfHeight, -halfDepth],
    [halfWidth, halfHeight, -halfDepth],
    [0, 0], [1, 0], [1, 1], [0, 1],
  );

  // The side UVs sample their matching border strips from the illustration.
  addQuad(
    [-halfWidth, halfHeight, halfDepth],
    [halfWidth, halfHeight, halfDepth],
    [halfWidth, halfHeight, -halfDepth],
    [-halfWidth, halfHeight, -halfDepth],
    [0, 1], [1, 1], [1, 1 - verticalBorderUv], [0, 1 - verticalBorderUv],
  );
  addQuad(
    [-halfWidth, -halfHeight, -halfDepth],
    [halfWidth, -halfHeight, -halfDepth],
    [halfWidth, -halfHeight, halfDepth],
    [-halfWidth, -halfHeight, halfDepth],
    [0, verticalBorderUv], [1, verticalBorderUv], [1, 0], [0, 0],
  );
  addQuad(
    [halfWidth, -halfHeight, halfDepth],
    [halfWidth, -halfHeight, -halfDepth],
    [halfWidth, halfHeight, -halfDepth],
    [halfWidth, halfHeight, halfDepth],
    [1, 0], [1 - horizontalBorderUv, 0], [1 - horizontalBorderUv, 1], [1, 1],
  );
  addQuad(
    [-halfWidth, -halfHeight, -halfDepth],
    [-halfWidth, -halfHeight, halfDepth],
    [-halfWidth, halfHeight, halfDepth],
    [-halfWidth, halfHeight, -halfDepth],
    [horizontalBorderUv, 0], [0, 0], [0, 1], [horizontalBorderUv, 1],
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export type WrappedImageMeshProps = {
  name: string;
  sketch: string;
  painted?: string;
  width: number;
  height: number;
  depth: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  horizontalBorderUv?: number;
  verticalBorderUv?: number;
  revealNear?: number;
  revealFar?: number;
  /** Skip the distance reveal and render the painted texture at all times. */
  alwaysPainted?: boolean;
};

/** A thin box whose side UVs continue the matching borders of its front art. */
export default function WrappedImageMesh({
  name,
  sketch,
  painted,
  width,
  height,
  depth,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  horizontalBorderUv = 0.08,
  verticalBorderUv = 0.08,
  revealNear = 14,
  revealFar = 34,
  alwaysPainted = false,
}: WrappedImageMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, scene } = useThree();
  const [texSketch, texPaint] = useLoader(THREE.TextureLoader, [sketch, painted ?? sketch]);
  const geometry = useMemo(
    () => createWrappedGeometry(width, height, depth, horizontalBorderUv, verticalBorderUv),
    [depth, height, horizontalBorderUv, verticalBorderUv, width],
  );
  const worldPosition = useMemo(() => new THREE.Vector3(), []);

  const material = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: {
        texSketch: { value: texSketch },
        texPaint: { value: texPaint },
        reveal: { value: alwaysPainted ? 1 : 0 },
        fogColor: { value: new THREE.Color("#ffffff") },
        fogNear: { value: 5 },
        fogFar: { value: 45 },
        fogFadeNear: { value: 23 },
        fogFadeFar: { value: 34 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
    }),
    [alwaysPainted, texPaint, texSketch],
  );

  useEffect(() => {
    [texSketch, texPaint].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    });
  }, [texPaint, texSketch]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (alwaysPainted) {
      material.uniforms.reveal.value = 1;
    } else {
      mesh.getWorldPosition(worldPosition);
      const distance = worldPosition.distanceTo(camera.position);
      const revealTarget =
        1 - THREE.MathUtils.smoothstep(distance, revealNear, revealFar);
      material.uniforms.reveal.value = THREE.MathUtils.lerp(
        material.uniforms.reveal.value,
        revealTarget,
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
    <mesh
      ref={meshRef}
      name={name}
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
    />
  );
}
