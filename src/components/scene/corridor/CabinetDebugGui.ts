"use client";

import { useEffect, type RefObject } from "react";

const ENABLE_CABINET_DEBUG_GUI = process.env.NODE_ENV !== "production";

type GuiLike = any;

export type CabinetDebugSettings = {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  size: number;
  depth: number;
  horizontalBorderUv: number;
  verticalBorderUv: number;
  revealNear: number;
  revealFar: number;
};

function round(value: number) {
  return Number(value.toFixed(4));
}

function serializeCabinet(settings: CabinetDebugSettings) {
  return {
    visible: settings.visible,
    position: [round(settings.x), round(settings.y), round(settings.z)],
    rotation: [round(settings.rotationX), round(settings.rotationY), round(settings.rotationZ)],
    size: round(settings.size),
    depth: round(settings.depth),
    horizontalBorderUv: round(settings.horizontalBorderUv),
    verticalBorderUv: round(settings.verticalBorderUv),
    revealNear: round(settings.revealNear),
    revealFar: round(settings.revealFar),
  };
}

async function copyCabinetValues(settings: CabinetDebugSettings) {
  const values = serializeCabinet(settings);
  const text = JSON.stringify(values, null, 2);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      console.info("Cabinet debug values copied", values);
      return;
    }
    console.warn("Clipboard API is unavailable. Cabinet values:", text);
  } catch (error) {
    console.error("Failed to copy cabinet debug values", error, text);
  }
}

function addControl(
  folder: GuiLike,
  settings: CabinetDebugSettings,
  property: keyof CabinetDebugSettings,
  min: number,
  max: number,
  step: number,
  label: string,
  requestRender: () => void,
) {
  folder
    .add(settings, property, min, max, step)
    .name(label)
    .listen()
    .onChange(requestRender);
}

/** Development-only live controls for positioning and shaping the cabinet. */
export function useCabinetDebugGui(
  settingsRef: RefObject<CabinetDebugSettings>,
  requestRender: () => void,
) {
  useEffect(() => {
    if (!ENABLE_CABINET_DEBUG_GUI) return;

    let gui: GuiLike | null = null;
    let disposed = false;

    const setup = async () => {
      const { default: GUI } = await import("lil-gui");
      if (disposed) return;

      const settings = settingsRef.current;
      gui = new GUI({ title: "Cabinet Debug", width: 330 });
      gui.domElement.style.position = "fixed";
      gui.domElement.style.top = "0";
      gui.domElement.style.right = "0";
      gui.domElement.style.zIndex = "10000";

      const actions = {
        "Copy Cabinet Values": () => copyCabinetValues(settings),
      };
      gui.add(actions, "Copy Cabinet Values").name("Copy Cabinet Values");
      gui.add(settings, "visible").name("visible").listen().onChange(requestRender);

      const positionFolder = gui.addFolder("Position");
      addControl(positionFolder, settings, "x", -5, 5, 0.01, "x", requestRender);
      addControl(positionFolder, settings, "y", -4, 4, 0.01, "y", requestRender);
      addControl(positionFolder, settings, "z", -110, 10, 0.01, "z", requestRender);
      positionFolder.open();

      const rotationFolder = gui.addFolder("Rotation");
      addControl(rotationFolder, settings, "rotationX", -Math.PI * 2, Math.PI * 2, 0.001, "x", requestRender);
      addControl(rotationFolder, settings, "rotationY", -Math.PI * 2, Math.PI * 2, 0.001, "y", requestRender);
      addControl(rotationFolder, settings, "rotationZ", -Math.PI * 2, Math.PI * 2, 0.001, "z", requestRender);
      rotationFolder.close();

      const geometryFolder = gui.addFolder("Geometry");
      addControl(geometryFolder, settings, "size", 0.2, 4, 0.01, "square size", requestRender);
      addControl(geometryFolder, settings, "depth", 0.01, 3, 0.01, "depth", requestRender);
      geometryFolder.open();

      const textureFolder = gui.addFolder("Texture Wrap");
      addControl(textureFolder, settings, "horizontalBorderUv", 0.005, 0.5, 0.001, "left/right crop", requestRender);
      addControl(textureFolder, settings, "verticalBorderUv", 0.005, 0.5, 0.001, "top/bottom crop", requestRender);
      textureFolder.close();

      const revealFolder = gui.addFolder("Reveal");
      addControl(revealFolder, settings, "revealNear", 0, 30, 0.1, "near", requestRender);
      addControl(revealFolder, settings, "revealFar", 1, 50, 0.1, "far", requestRender);
      revealFolder.close();
    };

    void setup();

    return () => {
      disposed = true;
      gui?.destroy();
    };
  }, [requestRender, settingsRef]);
}
