"use client";

import { useCallback, useReducer, useRef } from "react";

import WrappedImageMesh from "../WrappedImageMesh";
import {
  useCabinetDebugGui,
  type CabinetDebugSettings,
} from "./CabinetDebugGui";

const C = "/textures/textures/corridor";

const CABINET_DEFAULTS: CabinetDebugSettings = {
  visible: true,
  x: -3.09,
  y: -2.4,
  z: -71,
  rotationX: 0,
  rotationY: 4.6228,
  rotationZ: -0.0002,
  size: 1.6,
  depth: 0.9,
  horizontalBorderUv: 0.055,
  verticalBorderUv: 0.055,
  revealNear: 8,
  revealFar: 16,
};

/** The cabinet artwork wrapped around a square mesh with adjustable depth. */
export default function CorridorCabinet() {
  const settingsRef = useRef<CabinetDebugSettings>(null!);
  const [, forceRender] = useReducer((version: number) => version + 1, 0);
  const requestRender = useCallback(() => forceRender(), []);

  if (!settingsRef.current) {
    settingsRef.current = { ...CABINET_DEFAULTS };
  }

  useCabinetDebugGui(settingsRef, requestRender);
  const settings = settingsRef.current;

  return (
    <group visible={settings.visible}>
      <WrappedImageMesh
        name="Corridor Cabinet"
        sketch={`${C}/szafkaprzod.webp`}
        width={settings.size}
        height={settings.size}
        depth={settings.depth}
        position={[settings.x, settings.y, settings.z]}
        rotation={[settings.rotationX, settings.rotationY, settings.rotationZ]}
        horizontalBorderUv={settings.horizontalBorderUv}
        verticalBorderUv={settings.verticalBorderUv}
        revealNear={settings.revealNear}
        revealFar={settings.revealFar}
      />
    </group>
  );
}
