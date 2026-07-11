"use client";

import { useEffect, type RefObject } from "react";
import * as THREE from "three";

const ENABLE_CORRIDOR_DEBUG_GUI = process.env.NODE_ENV !== "production";

type GuiLike = any;

function round(value: number) {
  return Number(value.toFixed(4));
}

function serializeVector3(vector: THREE.Vector3 | THREE.Euler) {
  return {
    x: round(vector.x),
    y: round(vector.y),
    z: round(vector.z),
  };
}

function serializeColor(color: THREE.Color) {
  return `#${color.getHexString()}`;
}

function serializeMaterial(material: THREE.Material) {
  const record: Record<string, unknown> = {
    uuid: material.uuid,
    name: material.name || material.type,
    type: material.type,
    opacity: round(material.opacity),
    transparent: material.transparent,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    visible: material.visible,
    side: material.side,
  };

  const materialRecord = material as THREE.Material & {
    color?: THREE.Color;
    wireframe?: boolean;
    roughness?: number;
    metalness?: number;
  };

  if (materialRecord.color instanceof THREE.Color) record.color = serializeColor(materialRecord.color);
  if (typeof materialRecord.wireframe === "boolean") record.wireframe = materialRecord.wireframe;
  if (typeof materialRecord.roughness === "number") record.roughness = round(materialRecord.roughness);
  if (typeof materialRecord.metalness === "number") record.metalness = round(materialRecord.metalness);

  return record;
}

function serializeLight(light: THREE.Light) {
  const record: Record<string, unknown> = {
    color: serializeColor(light.color),
    intensity: round(light.intensity),
  };

  if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
    record.distance = round(light.distance);
    record.decay = round(light.decay);
  }

  if (light instanceof THREE.SpotLight) {
    record.angle = round(light.angle);
    record.penumbra = round(light.penumbra);
  }

  return record;
}

function serializeObject(object: THREE.Object3D) {
  const record: Record<string, unknown> = {
    uuid: object.uuid,
    name: object.name || object.type,
    type: object.type,
    visible: object.visible,
    renderOrder: object.renderOrder,
    position: serializeVector3(object.position),
    rotation: serializeVector3(object.rotation),
    scale: serializeVector3(object.scale),
  };

  if (object instanceof THREE.Light) {
    record.light = serializeLight(object);
  }

  if (object instanceof THREE.Mesh) {
    record.geometry = {
      type: object.geometry.type,
      parameters: object.geometry.parameters,
    };

    record.material = Array.isArray(object.material)
      ? object.material.map(serializeMaterial)
      : serializeMaterial(object.material);
  }

  return record;
}

function serializeObjectTree(object: THREE.Object3D): Record<string, unknown> {
  return {
    ...serializeObject(object),
    children: object.children.map(serializeObjectTree),
  };
}

function serializeCorridor(root: THREE.Object3D, rootLabel = "Corridor Items") {
  return {
    name: root.name || rootLabel,
    type: root.type,
    wholeGroup: serializeObject(root),
    itemGroups: root.children.map(serializeObjectTree),
  };
}

async function copyJsonToClipboard(label: string, value: unknown) {
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

function addButton(folder: GuiLike, name: string, action: () => void | Promise<void>) {
  const button = { [name]: action };
  folder.add(button, name).name(name);
}

function addVector3Controls(
  folder: GuiLike,
  vector: THREE.Vector3 | THREE.Euler,
  label: string,
  min: number,
  max: number,
  step: number,
) {
  const vectorFolder = folder.addFolder(label);
  vectorFolder.add(vector, "x", min, max, step).listen();
  vectorFolder.add(vector, "y", min, max, step).listen();
  vectorFolder.add(vector, "z", min, max, step).listen();
  vectorFolder.close();
}

function addTransformControls(folder: GuiLike, object: THREE.Object3D) {
  folder.add(object, "visible").name("visible").listen();
  folder.add(object, "renderOrder", -1000, 10000, 1).name("renderOrder").listen();
  addVector3Controls(folder, object.position, "position", -120, 20, 0.01);
  addVector3Controls(folder, object.rotation, "rotation", -Math.PI * 2, Math.PI * 2, 0.001);
  addVector3Controls(folder, object.scale, "scale", 0.01, 20, 0.01);
}

function addLightControls(folder: GuiLike, light: THREE.Light) {
  const lightFolder = folder.addFolder("light");
  const proxy = { color: serializeColor(light.color) };

  lightFolder
    .addColor(proxy, "color")
    .name("color")
    .onChange((value: string) => {
      light.color.set(value);
    });
  lightFolder.add(light, "intensity", 0, 30, 0.01).name("intensity").listen();

  if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
    lightFolder.add(light, "distance", 0, 50, 0.01).name("distance").listen();
    lightFolder.add(light, "decay", 0, 5, 0.01).name("decay").listen();
  }

  if (light instanceof THREE.SpotLight) {
    lightFolder.add(light, "angle", 0, Math.PI / 2, 0.001).name("angle").listen();
    lightFolder.add(light, "penumbra", 0, 1, 0.01).name("penumbra").listen();
  }

  lightFolder.close();
}

function addMaterialControls(folder: GuiLike, material: THREE.Material, label: string) {
  const materialFolder = folder.addFolder(label);
  const materialRecord = material as THREE.Material & {
    color?: THREE.Color;
    wireframe?: boolean;
    roughness?: number;
    metalness?: number;
  };

  if (materialRecord.color instanceof THREE.Color) {
    const proxy = { color: serializeColor(materialRecord.color) };
    materialFolder
      .addColor(proxy, "color")
      .name("color")
      .onChange((value: string) => {
        materialRecord.color?.set(value);
        material.needsUpdate = true;
      });
  }

  materialFolder
    .add(material, "opacity", 0, 1, 0.01)
    .name("opacity")
    .listen()
    .onChange(() => {
      material.needsUpdate = true;
    });
  materialFolder
    .add(material, "transparent")
    .name("transparent")
    .listen()
    .onChange(() => {
      material.needsUpdate = true;
    });
  materialFolder
    .add(material, "depthTest")
    .name("depthTest")
    .listen()
    .onChange(() => {
      material.needsUpdate = true;
    });
  materialFolder
    .add(material, "depthWrite")
    .name("depthWrite")
    .listen()
    .onChange(() => {
      material.needsUpdate = true;
    });

  if (typeof materialRecord.wireframe === "boolean") {
    materialFolder
      .add(materialRecord, "wireframe")
      .name("wireframe")
      .listen()
      .onChange(() => {
        material.needsUpdate = true;
      });
  }

  if (typeof materialRecord.roughness === "number") {
    materialFolder
      .add(materialRecord, "roughness", 0, 1, 0.01)
      .name("roughness")
      .listen()
      .onChange(() => {
        material.needsUpdate = true;
      });
  }

  if (typeof materialRecord.metalness === "number") {
    materialFolder
      .add(materialRecord, "metalness", 0, 1, 0.01)
      .name("metalness")
      .listen()
      .onChange(() => {
        material.needsUpdate = true;
      });
  }

  materialFolder.close();
}

function getObjectLabel(object: THREE.Object3D, index: number) {
  const name = object.name?.trim();
  return name || `${object.type || "Item"} ${index}`;
}

function addObjectFolder(parentFolder: GuiLike, object: THREE.Object3D, index: number) {
  const label = getObjectLabel(object, index);
  const objectFolder = parentFolder.addFolder(label);
  const isGroup = object.children.length > 0;
  const copyLabel = isGroup ? `Copy ${label} Group Values` : `Copy ${label} Values`;

  addButton(objectFolder, copyLabel, () => copyJsonToClipboard(`${label} Values`, serializeObjectTree(object)));
  addTransformControls(objectFolder, object);

  if (object instanceof THREE.Light) {
    addLightControls(objectFolder, object);
  }

  if (object instanceof THREE.Mesh) {
    if (Array.isArray(object.material)) {
      object.material.forEach((material, materialIndex) => {
        addMaterialControls(objectFolder, material, `material ${materialIndex + 1}: ${material.name || material.type}`);
      });
    } else {
      addMaterialControls(objectFolder, object.material, `material: ${object.material.name || object.material.type}`);
    }
  }

  if (object.children.length > 0) {
    const childrenFolder = objectFolder.addFolder("Individual Items");
    object.children.forEach((child, childIndex) => {
      addObjectFolder(childrenFolder, child, childIndex + 1);
    });
    childrenFolder.close();
  }

  objectFolder.close();
  return objectFolder;
}

function buildCorridorFolders(gui: GuiLike, root: THREE.Object3D, rootLabel = "Corridor Items") {
  addButton(gui, "Copy All Values", () => copyJsonToClipboard(`All ${rootLabel} Values`, serializeCorridor(root, rootLabel)));

  const itemsFolder = gui.addFolder(rootLabel);
  addButton(itemsFolder, `Copy ${rootLabel} Values`, () =>
    copyJsonToClipboard(`${rootLabel} Values`, serializeCorridor(root, rootLabel)),
  );

  const wholeGroupFolder = itemsFolder.addFolder(`Whole ${rootLabel} Group`);
  addButton(wholeGroupFolder, `Copy Whole ${rootLabel} Group Values`, () =>
    copyJsonToClipboard(`Whole ${rootLabel} Group Values`, serializeObjectTree(root)),
  );
  addTransformControls(wholeGroupFolder, root);
  wholeGroupFolder.close();

  const namedGroupsFolder = itemsFolder.addFolder("Named Item Groups");
  root.children.forEach((object, index) => {
    addObjectFolder(namedGroupsFolder, object, index + 1);
  });
  namedGroupsFolder.close();

  itemsFolder.open();
}

export function useCorridorDebugGui(
  rootRef: RefObject<THREE.Group | null>,
  options: { title?: string; rootLabel?: string; top?: string; width?: number; side?: "left" | "right" } = {},
) {
  useEffect(() => {
    if (!ENABLE_CORRIDOR_DEBUG_GUI) return;

    const title = options.title ?? "Corridor Items";
    const rootLabel = options.rootLabel ?? "Corridor Items";
    const top = options.top ?? "0px";
    const width = options.width ?? 380;
    const side = options.side ?? "right";

    let gui: GuiLike | null = null;
    let disposed = false;
    let frameId: number | null = null;

    const setupGui = async () => {
      const root = rootRef.current;
      if (!root) {
        frameId = window.requestAnimationFrame(setupGui);
        return;
      }

      const { default: GUI } = await import("lil-gui");
      if (disposed) return;

      gui = new GUI({ title, width });
      gui.domElement.style.position = "fixed";
      gui.domElement.style.top = top;
      gui.domElement.style.right = side === "right" ? "0px" : "auto";
      gui.domElement.style.left = side === "left" ? "0px" : "auto";
      gui.domElement.style.zIndex = "10000";
      buildCorridorFolders(gui, root, rootLabel);
    };

    frameId = window.requestAnimationFrame(setupGui);

    return () => {
      disposed = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      gui?.destroy();
    };
  }, [rootRef, options.title, options.rootLabel, options.top, options.width, options.side]);
}
