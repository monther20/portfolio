"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";

import { useFogFade } from "./useFogFade";

const CAVEAT_FONT = "/fonts/Caveat-Variable.ttf";
const CSS_PIXELS_PER_REM = 16;
const HTML_DISTANCE_SCALE = 400;

/**
 * FloatingNote — handwritten text rendered inside WebGL, not as a DOM overlay.
 * This lets the normal depth buffer put clouds, sprites and geometry in front
 * of farther notes while the note still fades through the shared scene fog.
 */
export default function FloatingNote({
  children,
  position = [0, 0, 0],
  fontSize = 1.6,
  rotation = 0,
  color = "#2b2b2b",
  weight = 600,
  maxWidth = 320,
  distanceFactor = 9,
  align = "center",
  name,
}: {
  children: string;
  position?: [number, number, number];
  /** Font size in the same rem-like units used by the original HTML notes. */
  fontSize?: number;
  /** Small z-rotation in degrees for a hand-placed feel. */
  rotation?: number;
  color?: string;
  weight?: number;
  /** Maximum width in the same CSS-pixel units used by the original notes. */
  maxWidth?: number;
  /** Preserves the original drei Html visual scale in world space. */
  distanceFactor?: number;
  align?: "left" | "center" | "right";
  name?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFogFade(groupRef, { preserveTransparency: true, visibleThreshold: 0 });

  const worldUnitsPerPixel = distanceFactor / HTML_DISTANCE_SCALE;
  const worldFontSize = fontSize * CSS_PIXELS_PER_REM * worldUnitsPerPixel;
  const worldMaxWidth = maxWidth * worldUnitsPerPixel;

  return (
    <group
      ref={groupRef}
      name={name ?? "Floating Note"}
      position={position}
      rotation={[0, 0, THREE.MathUtils.degToRad(rotation)]}
    >
      <Text
        name={`${name ?? "Floating Note"} Text`}
        font={CAVEAT_FONT}
        fontSize={worldFontSize}
        fontWeight={weight}
        color={color}
        maxWidth={worldMaxWidth}
        lineHeight={1.15}
        textAlign={align}
        anchorX={align}
        anchorY="middle"
        overflowWrap="break-word"
        whiteSpace="normal"
        sdfGlyphSize={128}
        frustumCulled={false}
      >
        {children}
        <meshBasicMaterial
          color={color}
          transparent
          depthTest
          depthWrite={false}
          fog
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </Text>
    </group>
  );
}
