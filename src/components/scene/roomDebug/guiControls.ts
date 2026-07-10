import type { ShadowConfig } from "../ShadowDebugPanel";
import type {
  GuiLike,
  LightDebug,
  MaterialDebug,
  PointLightDebug,
  SpotLightDebug,
  TransformDebug,
  Vector3Debug,
} from "./types";

export async function copyJsonToClipboard(label: string, value: unknown) {
  const text = JSON.stringify(value, null, 2);

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      console.info(`${label} copied to clipboard`, value);
      return;
    }

    console.warn("Clipboard API is unavailable. JSON value:", text);
  } catch (error) {
    console.error(`Failed to copy ${label}`, error, text);
  }
}

/**
 * Shared lil-gui controller builders for the room debug panel. `refreshScene`
 * is the default onChange (bumps a React counter so the JSX re-reads the
 * mutated debug ref).
 */
export function makeControlHelpers(refreshScene: () => void) {
  const addButton = (
    folder: GuiLike,
    buttonName: string,
    label: string,
    getPayload: () => unknown,
  ) => {
    const action = {
      copy: () => void copyJsonToClipboard(label, getPayload()),
    };
    const controller = folder.add(action, "copy");
    controller.name(buttonName);
    return controller;
  };

  const addNumber = (
    folder: GuiLike,
    object: Record<string, any>,
    property: string,
    min: number,
    max: number,
    step: number,
    label = property,
    onChange: () => void = refreshScene,
  ) => {
    const controller = folder.add(object, property, min, max, step);
    controller.name(label).onChange(onChange);
    return controller;
  };

  const addBoolean = (
    folder: GuiLike,
    object: Record<string, any>,
    property: string,
    label = property,
    onChange: () => void = refreshScene,
  ) => {
    const controller = folder.add(object, property);
    controller.name(label).onChange(onChange);
    return controller;
  };

  const addColor = (
    folder: GuiLike,
    object: Record<string, any>,
    property: string,
    label = property,
    onChange: () => void = refreshScene,
  ) => {
    const controller = folder.addColor(object, property);
    controller.name(label).onChange(onChange);
    return controller;
  };

  const addVector3Controls = (
    folder: GuiLike,
    vector: Vector3Debug,
    label: string,
    min = -20,
    max = 20,
    step = 0.01,
    onChange: () => void = refreshScene,
  ) => {
    const vectorFolder = folder.addFolder(label);
    addNumber(vectorFolder, vector, "x", min, max, step, "x", onChange);
    addNumber(vectorFolder, vector, "y", min, max, step, "y", onChange);
    addNumber(vectorFolder, vector, "z", min, max, step, "z", onChange);
    return vectorFolder;
  };

  const addTransformControls = (folder: GuiLike, transform: TransformDebug) => {
    addBoolean(folder, transform, "visible", "visible");
    addVector3Controls(folder, transform.position, "position", -60, 60, 0.01);
    addVector3Controls(folder, transform.rotation, "rotation", -Math.PI, Math.PI, 0.001);
    addVector3Controls(folder, transform.scale, "scale", 0.01, 10, 0.01);
    addNumber(folder, transform, "renderOrder", -1000, 5000, 1, "renderOrder");
  };

  const addPointLightControls = (folder: GuiLike, light: PointLightDebug) => {
    addBoolean(folder, light, "visible", "visible");
    addVector3Controls(folder, light.position, "position", -220, 220, 0.01);
    addColor(folder, light, "color", "color");
    addNumber(folder, light, "intensity", 0, 5000, 1, "intensity");
    addNumber(folder, light, "distance", 0, 500, 1, "distance");
    addNumber(folder, light, "decay", 0, 5, 0.01, "decay");
  };

  const addLightControls = (folder: GuiLike, light: LightDebug) => {
    addBoolean(folder, light, "visible", "visible");
    addColor(folder, light, "color", "color");
    addNumber(folder, light, "dayIntensity", 0, 5, 0.01, "day intensity");
    addNumber(folder, light, "nightIntensity", 0, 5, 0.01, "night intensity");
  };

  const addSpotLightControls = (folder: GuiLike, light: SpotLightDebug) => {
    addBoolean(folder, light, "visible", "visible");
    addVector3Controls(folder, light.position, "position", -60, 60, 0.01);
    addVector3Controls(folder, light.target, "target", -60, 60, 0.01);
    addColor(folder, light, "color", "color");
    addNumber(folder, light, "intensity", 0, 200, 0.1, "intensity");
    addNumber(folder, light, "angle", 0, Math.PI / 2, 0.001, "angle");
    addNumber(folder, light, "penumbra", 0, 1, 0.001, "penumbra");
    addNumber(folder, light, "distance", 0, 60, 0.1, "distance");
    addNumber(folder, light, "decay", 0, 5, 0.01, "decay");
  };

  const addMaterialControls = (folder: GuiLike, material: MaterialDebug) => {
    addColor(folder, material, "color", "color");
    if (material.nightColor !== undefined) {
      addColor(folder, material, "nightColor", "night color");
    }
    addNumber(folder, material, "roughness", 0, 1, 0.01, "roughness");
    addNumber(folder, material, "metalness", 0, 1, 0.01, "metalness");
    if (material.bumpScale !== undefined) {
      addNumber(folder, material, "bumpScale", 0, 0.2, 0.001, "bump scale");
    }
    addBoolean(folder, material, "wireframe", "wireframe");
  };

  const addShadowControls = (
    folder: GuiLike,
    shadow: ShadowConfig["table"] | ShadowConfig["chair"],
    onShadowChange: () => void,
  ) => {
    addNumber(folder, shadow, "x", -15, 15, 0.05, "position x", onShadowChange);
    addNumber(folder, shadow, "y", -10, 10, 0.05, "position y", onShadowChange);
    addNumber(folder, shadow, "z", -30, 5, 0.05, "position z", onShadowChange);
    addNumber(folder, shadow, "scale", 0.5, 12, 0.05, "scale", onShadowChange);
    addNumber(folder, shadow, "maxOpacity", 0, 1, 0.01, "max opacity", onShadowChange);
  };

  return {
    addButton,
    addNumber,
    addBoolean,
    addColor,
    addVector3Controls,
    addTransformControls,
    addPointLightControls,
    addLightControls,
    addSpotLightControls,
    addMaterialControls,
    addShadowControls,
  };
}
