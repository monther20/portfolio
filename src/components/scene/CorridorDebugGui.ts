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

function serializeCorridor(root: THREE.Object3D) {
  const objects: Record<string, unknown>[] = [];
  root.traverse((object) => {
    objects.push(serializeObject(object));
  });

  return {
    root: serializeObject(root),
    objects,
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
    materialFolder.add(materialRecord, "roughness", 0, 1, 0.01).name("roughness").listen();
  }

  if (typeof materialRecord.metalness === "number") {
    materialFolder.add(materialRecord, "metalness", 0, 1, 0.01).name("metalness").listen();
  }

  materialFolder.close();
}

function getObjectLabel(object: THREE.Object3D, index: number) {
  return `${object.name || object.type || "Object"} #${index}`;
}

function addObjectFolder(folder: GuiLike, object: THREE.Object3D, index: number) {
  const objectFolder = folder.addFolder(getObjectLabel(object, index));
  addButton(objectFolder, "Copy Object Values", () => copyJsonToClipboard("Corridor Object Values", serializeObject(object)));
  addTransformControls(objectFolder, object);

  if (object instanceof THREE.Mesh) {
    if (Array.isArray(object.material)) {
      object.material.forEach((material, materialIndex) => {
        addMaterialControls(objectFolder, material, `material ${materialIndex + 1}: ${material.name || material.type}`);
      });
    } else {
      addMaterialControls(objectFolder, object.material, `material: ${object.material.name || object.material.type}`);
    }
  }

  objectFolder.close();
  return objectFolder;
}

function buildCorridorFolders(gui: GuiLike, root: THREE.Object3D) {
  addButton(gui, "Copy All Values", () => copyJsonToClipboard("Corridor Debug Values", serializeCorridor(root)));

  const itemsFolder = gui.addFolder("Corridor Items");
  addButton(itemsFolder, "Copy Corridor Items Values", () =>
    copyJsonToClipboard("Corridor Items Values", serializeCorridor(root).objects),
  );

  let index = 0;
  root.traverse((object) => {
    addObjectFolder(itemsFolder, object, ++index);
  });

  itemsFolder.close();
}

export function useCorridorDebugGui(rootRef: RefObject<THREE.Group | null>) {
  useEffect(() => {
    if (!ENABLE_CORRIDOR_DEBUG_GUI) return;

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

      gui = new GUI({ title: "Corridor Debug", width: 360 });
      gui.domElement.style.position = "fixed";
      gui.domElement.style.top = "0px";
      gui.domElement.style.right = "0px";
      gui.domElement.style.left = "auto";
      gui.domElement.style.zIndex = "10000";
      buildCorridorFolders(gui, root);
    };

    frameId = window.requestAnimationFrame(setupGui);

    return () => {
      disposed = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      gui?.destroy();
    };
  }, [rootRef]);
}
