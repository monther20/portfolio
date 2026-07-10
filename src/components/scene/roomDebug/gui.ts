"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { ShadowConfig } from "../ShadowDebugPanel";
import { makeControlHelpers } from "./guiControls";
import {
  cloneShadowConfig,
  serializeRoomDebugState,
  type FloorDecalCategoryDebug,
  type FloorDecalGroupDebug,
  type FloorDecalItemDebug,
  type GuiLike,
  type MaterialDebug,
  type RoomDebugState,
  type TransformDebug,
} from "./types";
import {
  addRuntimeSceneGraphControls,
  createRuntimeSceneSignature,
  serializeRuntimeSceneGraph,
} from "./runtimeScene";

const ENABLE_ROOM_DEBUG_GUI = process.env.NODE_ENV !== "production";

type UseRoomDebugGuiOptions = {
  debugRef: React.MutableRefObject<RoomDebugState>;
  camera: THREE.Camera;
  scene: THREE.Scene;
  gl: THREE.WebGLRenderer;
  setIsNight: React.Dispatch<React.SetStateAction<boolean>>;
  onShadowConfigChange: React.Dispatch<React.SetStateAction<ShadowConfig>>;
  forceUpdate: React.Dispatch<React.SetStateAction<number>>;
};

export function useRoomDebugGui({
  debugRef,
  camera,
  scene,
  gl,
  setIsNight,
  onShadowConfigChange,
  forceUpdate,
}: UseRoomDebugGuiOptions) {
  const [runtimeSceneVersion, setRuntimeSceneVersion] = useState(0);
  const runtimeSceneSignatureRef = useRef("");
  const nextRuntimeScanAtRef = useRef(0);
  const didApplyInitialRoomStateRef = useRef(false);

  useFrame(({ clock }) => {
    if (!ENABLE_ROOM_DEBUG_GUI) return;

    const elapsed = clock.getElapsedTime();
    if (elapsed < nextRuntimeScanAtRef.current) return;
    nextRuntimeScanAtRef.current = elapsed + 0.75;

    const signature = createRuntimeSceneSignature(scene);
    if (signature !== runtimeSceneSignatureRef.current) {
      runtimeSceneSignatureRef.current = signature;
      setRuntimeSceneVersion((version) => version + 1);
    }
  });

  useEffect(() => {
    if (!ENABLE_ROOM_DEBUG_GUI || typeof window === "undefined") return undefined;

    let gui: GuiLike | null = null;
    let disposed = false;
    const debug = debugRef.current;
    const refreshScene = () => forceUpdate((value) => value + 1);
    const syncShadows = () => onShadowConfigChange(cloneShadowConfig(debug.shadows));

    const {
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
    } = makeControlHelpers(refreshScene);

    const onShadowChange = () => {
      syncShadows();
      refreshScene();
    };

    const runtimeHelpers = {
      addButton,
      addNumber,
      addBoolean,
      addColor,
      addVector3Controls,
    };

    const applyRenderer = () => {
      gl.toneMappingExposure = debug.renderer.toneMappingExposure;
      gl.setClearColor(new THREE.Color(debug.renderer.clearColor));
      refreshScene();
    };

    const applyCamera = () => {
      camera.position.set(debug.camera.position.x, debug.camera.position.y, debug.camera.position.z);

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = debug.camera.fov;
        camera.near = debug.camera.near;
        camera.far = debug.camera.far;
        camera.updateProjectionMatrix();
      }

      camera.lookAt(debug.camera.lookAt.x, debug.camera.lookAt.y, debug.camera.lookAt.z);
      refreshScene();
    };

    const rerenderScene = () => {
      setIsNight(debug.interaction.nightMode);
      syncShadows();
      applyRenderer();
      applyCamera();

      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = debug.scene.fogNear;
        scene.fog.far = debug.scene.fogFar;
      }

      refreshScene();
    };

    const addRerenderButton = (folder: GuiLike, buttonName = "Rerender Scene") => {
      const controller = folder.add({ rerender: rerenderScene }, "rerender");
      controller.name(buttonName);
      return controller;
    };

    const addFloorDecalGroupControls = (folder: GuiLike, group: FloorDecalGroupDebug) => {
      addBoolean(folder, group, "visible", "visible");
      addVector3Controls(folder, group.position, "position offset", -40, 40, 0.01);
      addNumber(folder, group, "scale", 0.01, 10, 0.01, "scale");
    };

    const addFloorDecalItemControls = (folder: GuiLike, item: FloorDecalItemDebug) => {
      addBoolean(folder, item, "visible", "visible");
      addVector3Controls(folder, item.position, "position", -40, 40, 0.01);
      addNumber(folder, item, "scale", 0.01, 12, 0.01, "scale");
      addNumber(folder, item, "renderOrder", -1000, 5000, 1, "renderOrder");
    };

    const addFloorDecalCategoryControls = (
      parentFolder: GuiLike,
      name: string,
      category: FloorDecalCategoryDebug,
    ) => {
      const categoryFolder = parentFolder.addFolder(name);
      addButton(categoryFolder, `Copy ${name} Values`, `${name} Values`, () => category);
      addRerenderButton(categoryFolder, `Rerender ${name}`);

      const globalFolder = categoryFolder.addFolder(`${name} Global`);
      addFloorDecalGroupControls(globalFolder, category.group);
      globalFolder.close();

      category.items.forEach((item) => {
        const itemFolder = categoryFolder.addFolder(item.label);
        addFloorDecalItemControls(itemFolder, item);
        itemFolder.close();
      });

      categoryFolder.close();
    };

    const setupGui = async () => {
      const { default: GUI } = await import("lil-gui");
      if (disposed) return;

      runtimeSceneSignatureRef.current = createRuntimeSceneSignature(scene);

      gui = new GUI({ title: "RoomScene Debug", width: 360 });
      gui.domElement.style.zIndex = "999998";
      gui.domElement.style.left = "16px";
      gui.domElement.style.right = "auto";

      addButton(gui, "Copy All Values", "All Debug Values", () => ({
        room: serializeRoomDebugState(debugRef.current),
        runtime: serializeRuntimeSceneGraph(scene, camera, gl),
      }));
      addRerenderButton(gui, "Rerender Scene");

      const interactionFolder = gui.addFolder("Interaction");
      addButton(interactionFolder, "Copy Interaction Values", "Interaction Values", () => debug.interaction);
      addRerenderButton(interactionFolder, "Rerender Interaction");
      addBoolean(interactionFolder, debug.interaction, "nightMode", "night mode", () => {
        setIsNight(debug.interaction.nightMode);
        refreshScene();
      });

      const sceneFolder = gui.addFolder("Scene");
      addButton(sceneFolder, "Copy Scene Values", "Scene Values", () => debug.scene);
      addRerenderButton(sceneFolder, "Rerender Scene Values");
      const sceneRootFolder = sceneFolder.addFolder("Scene Root");
      addColor(sceneRootFolder, debug.scene, "dayBackgroundColor", "day background");
      addColor(sceneRootFolder, debug.scene, "nightBackgroundColor", "night background");
      addColor(sceneRootFolder, debug.scene, "dayFogColor", "day fog");
      addColor(sceneRootFolder, debug.scene, "nightFogColor", "night fog");
      addNumber(sceneRootFolder, debug.scene, "fogNear", 0, 100, 0.1, "fog near");
      addNumber(sceneRootFolder, debug.scene, "fogFar", 1, 250, 0.1, "fog far");
      sceneRootFolder.close();

      const rendererFolder = gui.addFolder("Renderer");
      addButton(rendererFolder, "Copy Renderer Values", "Renderer Values", () => debug.renderer);
      addRerenderButton(rendererFolder, "Rerender Renderer");
      const rendererItemFolder = rendererFolder.addFolder("WebGL Renderer");
      addColor(rendererItemFolder, debug.renderer, "clearColor", "clear color", applyRenderer);
      addNumber(rendererItemFolder, debug.renderer, "toneMappingExposure", 0, 5, 0.01, "tone mapping exposure", applyRenderer);
      rendererItemFolder.close();

      const cameraFolder = gui.addFolder("Camera");
      addButton(cameraFolder, "Copy Camera Values", "Camera Values", () => debug.camera);
      addRerenderButton(cameraFolder, "Rerender Camera");
      const mainCameraFolder = cameraFolder.addFolder("Main Camera");
      addVector3Controls(mainCameraFolder, debug.camera.position, "position", -80, 80, 0.01, applyCamera);
      addVector3Controls(mainCameraFolder, debug.camera.lookAt, "look at", -80, 20, 0.01, applyCamera);
      addNumber(mainCameraFolder, debug.camera, "fov", 1, 120, 0.1, "fov", applyCamera);
      addNumber(mainCameraFolder, debug.camera, "near", 0.001, 20, 0.001, "near", applyCamera);
      addNumber(mainCameraFolder, debug.camera, "far", 20, 5000, 1, "far", applyCamera);
      mainCameraFolder.close();

      const environmentFolder = gui.addFolder("Environment");
      addButton(environmentFolder, "Copy Environment Values", "Environment Values", () => debug.environment);
      addRerenderButton(environmentFolder, "Rerender Environment");
      const studioFolder = environmentFolder.addFolder("Studio HDRI");
      addBoolean(studioFolder, debug.environment.studioHdri, "visible", "visible");
      addNumber(studioFolder, debug.environment.studioHdri, "environmentIntensity", 0, 5, 0.01, "environment intensity");
      studioFolder.close();

      const lightsFolder = gui.addFolder("Lights");
      addButton(lightsFolder, "Copy Lights Values", "Lights Values", () => debug.lights);
      addRerenderButton(lightsFolder, "Rerender Lights");
      const hallwayAmbientFolder = lightsFolder.addFolder("Hallway Ambient Light");
      addLightControls(hallwayAmbientFolder, debug.lights.hallwayAmbient);
      hallwayAmbientFolder.close();
      const coolPointFolder = lightsFolder.addFolder("Cool Portal Point Light");
      addPointLightControls(coolPointFolder, debug.lights.coolPortalPoint);
      coolPointFolder.close();
      const warmPointFolder = lightsFolder.addFolder("Warm Portal Point Light");
      addPointLightControls(warmPointFolder, debug.lights.warmPortalPoint);
      warmPointFolder.close();
      const interiorAmbientFolder = lightsFolder.addFolder("Interior Ambient Light");
      addLightControls(interiorAmbientFolder, debug.lights.interiorAmbient);
      interiorAmbientFolder.close();
      const leftSpotFolder = lightsFolder.addFolder("Left Lantern Spot Light");
      addSpotLightControls(leftSpotFolder, debug.lights.leftLanternSpot);
      leftSpotFolder.close();
      const rightSpotFolder = lightsFolder.addFolder("Right Lantern Spot Light");
      addSpotLightControls(rightSpotFolder, debug.lights.rightLanternSpot);
      rightSpotFolder.close();

      const meshesFolder = gui.addFolder("Meshes");
      addButton(meshesFolder, "Copy Meshes Values", "Meshes Values", () => debug.meshes);
      addRerenderButton(meshesFolder, "Rerender Meshes");
      const meshEntries: [string, TransformDebug][] = [
        ["Floor", debug.meshes.floor],
        ["Stone Path", debug.meshes.stonePath],
        ["Exterior Wall", debug.meshes.exteriorWall],
        ["Door Root", debug.meshes.doorRoot],
        ["Door Frame", debug.meshes.doorFrame],
        ["Door Panel Pivot", debug.meshes.doorPanelPivot],
        ["Door Panel Surface", debug.meshes.doorPanelSurface],
        ["Left Lantern", debug.meshes.leftLantern],
        ["Right Lantern", debug.meshes.rightLantern],
        ["Left Floor Glow", debug.meshes.leftFloorGlow],
        ["Right Floor Glow", debug.meshes.rightFloorGlow],
      ];
      meshEntries.forEach(([name, mesh]) => {
        const meshFolder = meshesFolder.addFolder(name);
        addTransformControls(meshFolder, mesh);
        if ("radius" in mesh) {
          addNumber(meshFolder, mesh, "radius", 0.1, 12, 0.01, "radius");
          addColor(meshFolder, mesh, "color", "color");
          addNumber(meshFolder, mesh, "maxOpacity", 0, 1, 0.01, "max opacity");
        }
        meshFolder.close();
      });

      const interiorDetailsFolder = gui.addFolder("Interior Details");
      addButton(interiorDetailsFolder, "Copy Interior Details Values", "Interior Details Values", () => debug.interiorDetails);
      addRerenderButton(interiorDetailsFolder, "Rerender Interior Details");
      const floorItemsFolder = interiorDetailsFolder.addFolder("Herps, Stones, Table & Chair");
      addButton(floorItemsFolder, "Copy Floor Item Values", "Floor Item Values", () => debug.interiorDetails.floorDecals);
      addRerenderButton(floorItemsFolder, "Rerender Floor Items");
      const allFloorItemsFolder = floorItemsFolder.addFolder("Global: All Floor Items");
      addFloorDecalGroupControls(allFloorItemsFolder, debug.interiorDetails.floorDecals.all);
      allFloorItemsFolder.close();
      addFloorDecalCategoryControls(floorItemsFolder, "Stones", debug.interiorDetails.floorDecals.stones);
      addFloorDecalCategoryControls(floorItemsFolder, "Herps", debug.interiorDetails.floorDecals.herps);
      addFloorDecalCategoryControls(floorItemsFolder, "Table", debug.interiorDetails.floorDecals.table);
      addFloorDecalCategoryControls(floorItemsFolder, "Chair", debug.interiorDetails.floorDecals.chair);
      floorItemsFolder.close();

      const materialsFolder = gui.addFolder("Materials");
      addButton(materialsFolder, "Copy Materials Values", "Materials Values", () => debug.materials);
      addRerenderButton(materialsFolder, "Rerender Materials");
      const materialEntries: [string, MaterialDebug][] = [
        ["Floor Material", debug.materials.floor],
        ["Stone Path Material", debug.materials.stonePath],
        ["Exterior Wall Material", debug.materials.exteriorWall],
        ["Door Frame Material", debug.materials.doorFrame],
        ["Door Panel Material", debug.materials.doorPanel],
      ];
      materialEntries.forEach(([name, material]) => {
        const materialFolder = materialsFolder.addFolder(name);
        addMaterialControls(materialFolder, material);
        materialFolder.close();
      });

      const shadowsFolder = gui.addFolder("Shadows");
      addButton(shadowsFolder, "Copy Shadows Values", "Shadows Values", () => debug.shadows);
      addRerenderButton(shadowsFolder, "Rerender Shadows");
      const tableShadowFolder = shadowsFolder.addFolder("Table Shadow");
      addShadowControls(tableShadowFolder, debug.shadows.table, onShadowChange);
      tableShadowFolder.close();
      const chairShadowFolder = shadowsFolder.addFolder("Chair Shadow");
      addShadowControls(chairShadowFolder, debug.shadows.chair, onShadowChange);
      chairShadowFolder.close();

      const runtimeFolder = gui.addFolder("Runtime Scene Graph");
      addRuntimeSceneGraphControls({
        folder: runtimeFolder,
        scene,
        camera,
        gl,
        helpers: runtimeHelpers,
        refreshScene,
        requestRescan: () => setRuntimeSceneVersion((version) => version + 1),
      });

      interactionFolder.close();
      sceneFolder.close();
      rendererFolder.close();
      cameraFolder.close();
      environmentFolder.close();
      lightsFolder.close();
      meshesFolder.close();
      interiorDetailsFolder.close();
      materialsFolder.close();
      shadowsFolder.close();
      runtimeFolder.close();
    };

    setupGui();

    if (!didApplyInitialRoomStateRef.current) {
      applyRenderer();
      applyCamera();
      syncShadows();
      didApplyInitialRoomStateRef.current = true;
    }

    return () => {
      disposed = true;
      gui?.destroy();
    };
  }, [camera, debugRef, forceUpdate, gl, onShadowConfigChange, runtimeSceneVersion, scene, setIsNight]);
}
