import * as THREE from "three";

import type { GuiLike, Vector3Debug } from "./types";

type AddButton = (
  folder: GuiLike,
  buttonName: string,
  label: string,
  getPayload: () => unknown,
) => unknown;

type RuntimeControlHelpers = {
  addButton: AddButton;
  addNumber: (
    folder: GuiLike,
    object: Record<string, any>,
    property: string,
    min: number,
    max: number,
    step: number,
    label?: string,
    onChange?: () => void,
  ) => unknown;
  addBoolean: (
    folder: GuiLike,
    object: Record<string, any>,
    property: string,
    label?: string,
    onChange?: () => void,
  ) => unknown;
  addColor: (
    folder: GuiLike,
    object: Record<string, any>,
    property: string,
    label?: string,
    onChange?: () => void,
  ) => unknown;
  addVector3Controls: (
    folder: GuiLike,
    vector: Vector3Debug,
    label: string,
    min?: number,
    max?: number,
    step?: number,
    onChange?: () => void,
  ) => GuiLike;
};

type RuntimeSceneGraphOptions = {
  folder: GuiLike;
  scene: THREE.Scene;
  camera: THREE.Camera;
  gl: THREE.WebGLRenderer;
  helpers: RuntimeControlHelpers;
  refreshScene: () => void;
  requestRescan: () => void;
};

type RuntimeRenderable = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
};

type SerializedRecord = Record<string, unknown>;

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function serializeVector3(vector: THREE.Vector3 | THREE.Euler | Vector3Debug) {
  return {
    x: round(vector.x),
    y: round(vector.y),
    z: round(vector.z),
  };
}

function serializeColor(color: THREE.Color) {
  return `#${color.getHexString()}`;
}

function serializeTexture(texture: THREE.Texture | null | undefined) {
  if (!texture) return null;

  const image = texture.image as { currentSrc?: string; src?: string } | undefined;

  return {
    uuid: texture.uuid,
    name: texture.name || null,
    source: image?.currentSrc || image?.src || null,
    colorSpace: texture.colorSpace,
    offset: serializeVector3({ x: texture.offset.x, y: texture.offset.y, z: 0 }),
    repeat: serializeVector3({ x: texture.repeat.x, y: texture.repeat.y, z: 0 }),
    rotation: round(texture.rotation),
  };
}

function isLight(object: THREE.Object3D): object is THREE.Light {
  return (object as THREE.Light).isLight === true;
}

function isRenderable(object: THREE.Object3D): object is RuntimeRenderable {
  const candidate = object as RuntimeRenderable & {
    isLine?: boolean;
    isMesh?: boolean;
    isPoints?: boolean;
    isSprite?: boolean;
  };

  return Boolean(
    candidate.isMesh ||
      candidate.isSprite ||
      candidate.isLine ||
      candidate.isPoints ||
      candidate.geometry ||
      candidate.material,
  );
}

function objectMaterials(object: THREE.Object3D): THREE.Material[] {
  if (!isRenderable(object) || !object.material) return [];
  return Array.isArray(object.material) ? object.material : [object.material];
}

function collectRuntimeItems(scene: THREE.Scene) {
  const objects: THREE.Object3D[] = [];
  const lights: THREE.Light[] = [];
  const materials = new Map<string, THREE.Material>();

  scene.traverse((object) => {
    if (object === scene) return;

    if (isLight(object)) {
      lights.push(object);
      return;
    }

    objects.push(object);
    objectMaterials(object).forEach((material) => materials.set(material.uuid, material));
  });

  return {
    objects,
    lights,
    materials: Array.from(materials.values()),
  };
}

function objectPath(object: THREE.Object3D) {
  const parts: string[] = [];
  let current: THREE.Object3D | null = object;

  while (current && !(current instanceof THREE.Scene)) {
    parts.push(current.name || current.type);
    current = current.parent;
  }

  return parts.reverse().join(" / ");
}

function shortId(uuid: string) {
  return uuid.slice(0, 8);
}

function objectLabel(object: THREE.Object3D, index: number) {
  const base = object.name || object.type;
  return `${String(index + 1).padStart(3, "0")} · ${base} · ${shortId(object.uuid)}`;
}

function materialLabel(material: THREE.Material, index: number) {
  const base = material.name || material.type;
  return `${String(index + 1).padStart(3, "0")} · ${base} · ${shortId(material.uuid)}`;
}

function closeFolder(folder: GuiLike) {
  folder.close?.();
}

function addBooleanIfPresent(
  helpers: RuntimeControlHelpers,
  folder: GuiLike,
  object: Record<string, any>,
  property: string,
  label: string,
  onChange: () => void,
) {
  if (typeof object[property] !== "boolean") return;
  helpers.addBoolean(folder, object, property, label, onChange);
}

function addNumberIfPresent(
  helpers: RuntimeControlHelpers,
  folder: GuiLike,
  object: Record<string, any>,
  property: string,
  min: number,
  max: number,
  step: number,
  label: string,
  onChange: () => void,
) {
  if (typeof object[property] !== "number") return;
  helpers.addNumber(folder, object, property, min, max, step, label, onChange);
}

function addColorProperty(
  helpers: RuntimeControlHelpers,
  folder: GuiLike,
  owner: Record<string, any>,
  property: string,
  label: string,
  onChange: () => void,
) {
  const color = owner[property];
  if (!(color instanceof THREE.Color)) return;

  const proxy = { [property]: serializeColor(color) };
  helpers.addColor(folder, proxy, property, label, () => {
    color.set(proxy[property]);
    onChange();
  });
}

function addVectorFolder(
  helpers: RuntimeControlHelpers,
  folder: GuiLike,
  vector: THREE.Vector3 | THREE.Euler,
  label: string,
  min: number,
  max: number,
  step: number,
  onChange: () => void,
) {
  const vectorFolder = helpers.addVector3Controls(
    folder,
    vector as unknown as Vector3Debug,
    label,
    min,
    max,
    step,
    onChange,
  );
  closeFolder(vectorFolder);
}

function addObject3DControls(
  folder: GuiLike,
  object: THREE.Object3D,
  helpers: RuntimeControlHelpers,
  refreshScene: () => void,
) {
  const objectRecord = object as unknown as Record<string, any>;
  const onTransformChange = () => {
    object.updateMatrix();
    object.updateMatrixWorld(true);
    refreshScene();
  };

  helpers.addBoolean(folder, objectRecord, "visible", "visible", refreshScene);
  addBooleanIfPresent(helpers, folder, objectRecord, "matrixAutoUpdate", "matrix auto update", onTransformChange);
  addBooleanIfPresent(helpers, folder, objectRecord, "castShadow", "cast shadow", refreshScene);
  addBooleanIfPresent(helpers, folder, objectRecord, "receiveShadow", "receive shadow", refreshScene);
  addBooleanIfPresent(helpers, folder, objectRecord, "frustumCulled", "frustum culled", refreshScene);
  addVectorFolder(helpers, folder, object.position, "position", -250, 250, 0.01, onTransformChange);
  addVectorFolder(helpers, folder, object.rotation, "rotation", -Math.PI, Math.PI, 0.001, onTransformChange);
  addVectorFolder(helpers, folder, object.scale, "scale", 0.001, 30, 0.001, onTransformChange);
  helpers.addNumber(folder, objectRecord, "renderOrder", -1000, 10000, 1, "render order", refreshScene);
}

function addSceneControls(
  folder: GuiLike,
  scene: THREE.Scene,
  helpers: RuntimeControlHelpers,
  refreshScene: () => void,
) {
  addObject3DControls(folder, scene, helpers, refreshScene);

  if (scene.background instanceof THREE.Color) {
    addColorProperty(helpers, folder, scene as unknown as Record<string, any>, "background", "background", refreshScene);
  }

  if (scene.fog instanceof THREE.Fog || scene.fog instanceof THREE.FogExp2) {
    const fog = scene.fog as THREE.Fog | THREE.FogExp2;
    const fogFolder = folder.addFolder("fog");
    addColorProperty(helpers, fogFolder, fog as unknown as Record<string, any>, "color", "color", refreshScene);

    if (fog instanceof THREE.Fog) {
      helpers.addNumber(fogFolder, fog as unknown as Record<string, any>, "near", 0, 500, 0.1, "near", refreshScene);
      helpers.addNumber(fogFolder, fog as unknown as Record<string, any>, "far", 0, 1000, 0.1, "far", refreshScene);
    } else {
      helpers.addNumber(fogFolder, fog as unknown as Record<string, any>, "density", 0, 1, 0.0001, "density", refreshScene);
    }

    closeFolder(fogFolder);
  }
}

function addRendererControls(
  folder: GuiLike,
  gl: THREE.WebGLRenderer,
  helpers: RuntimeControlHelpers,
  refreshScene: () => void,
) {
  const clearColor = new THREE.Color();
  gl.getClearColor(clearColor);

  const rendererState = {
    clearColor: serializeColor(clearColor),
    clearAlpha: gl.getClearAlpha(),
    pixelRatio: gl.getPixelRatio(),
    toneMappingExposure: gl.toneMappingExposure,
    shadowMapEnabled: gl.shadowMap.enabled,
    shadowMapAutoUpdate: gl.shadowMap.autoUpdate,
  };

  helpers.addColor(folder, rendererState, "clearColor", "clear color", () => {
    gl.setClearColor(rendererState.clearColor, rendererState.clearAlpha);
    refreshScene();
  });
  helpers.addNumber(folder, rendererState, "clearAlpha", 0, 1, 0.01, "clear alpha", () => {
    gl.setClearColor(rendererState.clearColor, rendererState.clearAlpha);
    refreshScene();
  });
  helpers.addNumber(folder, rendererState, "pixelRatio", 0.1, 3, 0.01, "pixel ratio", () => {
    gl.setPixelRatio(rendererState.pixelRatio);
    refreshScene();
  });
  helpers.addNumber(folder, gl as unknown as Record<string, any>, "toneMappingExposure", 0, 5, 0.01, "tone mapping exposure", refreshScene);
  helpers.addBoolean(folder, gl.shadowMap as unknown as Record<string, any>, "enabled", "shadow map enabled", refreshScene);
  helpers.addBoolean(folder, gl.shadowMap as unknown as Record<string, any>, "autoUpdate", "shadow map auto update", refreshScene);
}

function addCameraControls(
  folder: GuiLike,
  camera: THREE.Camera,
  helpers: RuntimeControlHelpers,
  refreshScene: () => void,
) {
  const updateProjection = () => {
    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
      camera.updateProjectionMatrix();
    }
    refreshScene();
  };

  addObject3DControls(folder, camera, helpers, updateProjection);

  const cameraRecord = camera as unknown as Record<string, any>;
  addNumberIfPresent(helpers, folder, cameraRecord, "fov", 1, 140, 0.1, "fov", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "near", 0.001, 100, 0.001, "near", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "far", 1, 10000, 1, "far", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "zoom", 0.01, 10, 0.01, "zoom", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "left", -100, 100, 0.01, "left", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "right", -100, 100, 0.01, "right", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "top", -100, 100, 0.01, "top", updateProjection);
  addNumberIfPresent(helpers, folder, cameraRecord, "bottom", -100, 100, 0.01, "bottom", updateProjection);
}

function addLightControls(
  folder: GuiLike,
  light: THREE.Light,
  helpers: RuntimeControlHelpers,
  refreshScene: () => void,
) {
  addObject3DControls(folder, light, helpers, refreshScene);

  const lightRecord = light as unknown as Record<string, any>;
  addColorProperty(helpers, folder, lightRecord, "color", "color", refreshScene);
  addColorProperty(helpers, folder, lightRecord, "groundColor", "ground color", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "intensity", 0, 5000, 0.01, "intensity", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "distance", 0, 1000, 0.01, "distance", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "decay", 0, 10, 0.001, "decay", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "angle", 0, Math.PI / 2, 0.001, "angle", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "penumbra", 0, 1, 0.001, "penumbra", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "width", 0, 100, 0.01, "width", refreshScene);
  addNumberIfPresent(helpers, folder, lightRecord, "height", 0, 100, 0.01, "height", refreshScene);

  if ("target" in light && lightRecord.target instanceof THREE.Object3D) {
    addVectorFolder(helpers, folder, lightRecord.target.position, "target position", -250, 250, 0.01, () => {
      lightRecord.target.updateMatrixWorld(true);
      refreshScene();
    });
  }
}

function addMaterialControls(
  folder: GuiLike,
  material: THREE.Material,
  helpers: RuntimeControlHelpers,
  refreshScene: () => void,
) {
  const materialRecord = material as unknown as Record<string, any>;
  const markMaterialChanged = () => {
    material.needsUpdate = true;
    refreshScene();
  };

  addBooleanIfPresent(helpers, folder, materialRecord, "visible", "visible", markMaterialChanged);
  addColorProperty(helpers, folder, materialRecord, "color", "color", markMaterialChanged);
  addColorProperty(helpers, folder, materialRecord, "emissive", "emissive", markMaterialChanged);
  addColorProperty(helpers, folder, materialRecord, "specular", "specular", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "opacity", 0, 1, 0.01, "opacity", markMaterialChanged);
  addBooleanIfPresent(helpers, folder, materialRecord, "transparent", "transparent", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "roughness", 0, 1, 0.01, "roughness", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "metalness", 0, 1, 0.01, "metalness", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "envMapIntensity", 0, 10, 0.01, "env map intensity", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "bumpScale", -1, 1, 0.001, "bump scale", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "displacementScale", -10, 10, 0.001, "displacement scale", markMaterialChanged);
  addNumberIfPresent(helpers, folder, materialRecord, "alphaTest", 0, 1, 0.001, "alpha test", markMaterialChanged);
  addBooleanIfPresent(helpers, folder, materialRecord, "wireframe", "wireframe", markMaterialChanged);
  addBooleanIfPresent(helpers, folder, materialRecord, "depthTest", "depth test", markMaterialChanged);
  addBooleanIfPresent(helpers, folder, materialRecord, "depthWrite", "depth write", markMaterialChanged);
  addBooleanIfPresent(helpers, folder, materialRecord, "toneMapped", "tone mapped", markMaterialChanged);

  if (typeof materialRecord.side === "number") {
    folder
      .add(materialRecord, "side", {
        FrontSide: THREE.FrontSide,
        BackSide: THREE.BackSide,
        DoubleSide: THREE.DoubleSide,
      })
      .name("side")
      .onChange(markMaterialChanged);
  }
}

function serializeObject3D(object: THREE.Object3D): SerializedRecord {
  const record: SerializedRecord = {
    name: object.name || null,
    type: object.type,
    uuid: object.uuid,
    path: objectPath(object),
    visible: object.visible,
    position: serializeVector3(object.position),
    rotation: serializeVector3(object.rotation),
    scale: serializeVector3(object.scale),
    renderOrder: object.renderOrder,
    children: object.children.length,
  };

  const candidate = object as unknown as Record<string, any>;
  ["castShadow", "receiveShadow", "frustumCulled", "matrixAutoUpdate"].forEach((property) => {
    if (typeof candidate[property] === "boolean") record[property] = candidate[property];
  });

  if (isRenderable(object)) {
    record.geometry = object.geometry
      ? { type: object.geometry.type, uuid: object.geometry.uuid }
      : null;
    record.materials = objectMaterials(object).map((material) => ({
      name: material.name || null,
      type: material.type,
      uuid: material.uuid,
    }));
  }

  return record;
}

function serializeLight(light: THREE.Light): SerializedRecord {
  const record = serializeObject3D(light);
  const lightRecord = light as unknown as Record<string, any>;

  ["intensity", "distance", "decay", "angle", "penumbra", "width", "height"].forEach((property) => {
    if (typeof lightRecord[property] === "number") record[property] = round(lightRecord[property]);
  });

  if (light.color instanceof THREE.Color) record.color = serializeColor(light.color);
  if (lightRecord.groundColor instanceof THREE.Color) record.groundColor = serializeColor(lightRecord.groundColor);
  if (lightRecord.target instanceof THREE.Object3D) {
    record.target = serializeVector3(lightRecord.target.position);
  }

  return record;
}

function serializeMaterial(material: THREE.Material): SerializedRecord {
  const record: SerializedRecord = {
    name: material.name || null,
    type: material.type,
    uuid: material.uuid,
    visible: material.visible,
    opacity: round(material.opacity),
    transparent: material.transparent,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
  };
  const materialRecord = material as unknown as Record<string, any>;

  ["color", "emissive", "specular"].forEach((property) => {
    if (materialRecord[property] instanceof THREE.Color) record[property] = serializeColor(materialRecord[property]);
  });

  [
    "roughness",
    "metalness",
    "envMapIntensity",
    "bumpScale",
    "displacementScale",
    "alphaTest",
    "wireframe",
    "toneMapped",
  ].forEach((property) => {
    if (typeof materialRecord[property] !== "undefined") record[property] = materialRecord[property];
  });

  if (materialRecord.map instanceof THREE.Texture) record.map = serializeTexture(materialRecord.map);
  if (materialRecord.normalMap instanceof THREE.Texture) record.normalMap = serializeTexture(materialRecord.normalMap);
  if (materialRecord.roughnessMap instanceof THREE.Texture) record.roughnessMap = serializeTexture(materialRecord.roughnessMap);
  if (materialRecord.metalnessMap instanceof THREE.Texture) record.metalnessMap = serializeTexture(materialRecord.metalnessMap);
  if (materialRecord.alphaMap instanceof THREE.Texture) record.alphaMap = serializeTexture(materialRecord.alphaMap);

  return record;
}

function serializeScene(scene: THREE.Scene): SerializedRecord {
  const record: SerializedRecord = {
    name: scene.name || null,
    type: scene.type,
    uuid: scene.uuid,
    background:
      scene.background instanceof THREE.Color
        ? serializeColor(scene.background)
        : scene.background instanceof THREE.Texture
          ? serializeTexture(scene.background)
          : scene.background,
    environment: scene.environment instanceof THREE.Texture ? serializeTexture(scene.environment) : scene.environment,
    position: serializeVector3(scene.position),
    rotation: serializeVector3(scene.rotation),
    scale: serializeVector3(scene.scale),
  };

  if (scene.fog instanceof THREE.Fog) {
    record.fog = {
      type: "Fog",
      color: serializeColor(scene.fog.color),
      near: scene.fog.near,
      far: scene.fog.far,
    };
  } else if (scene.fog instanceof THREE.FogExp2) {
    record.fog = {
      type: "FogExp2",
      color: serializeColor(scene.fog.color),
      density: scene.fog.density,
    };
  }

  return record;
}

function serializeRenderer(gl: THREE.WebGLRenderer): SerializedRecord {
  const clearColor = new THREE.Color();
  gl.getClearColor(clearColor);

  return {
    clearColor: serializeColor(clearColor),
    clearAlpha: gl.getClearAlpha(),
    pixelRatio: gl.getPixelRatio(),
    toneMapping: gl.toneMapping,
    toneMappingExposure: gl.toneMappingExposure,
    outputColorSpace: gl.outputColorSpace,
    shadowMap: {
      enabled: gl.shadowMap.enabled,
      autoUpdate: gl.shadowMap.autoUpdate,
      type: gl.shadowMap.type,
    },
  };
}

function serializeCamera(camera: THREE.Camera): SerializedRecord {
  const record = serializeObject3D(camera);
  const cameraRecord = camera as unknown as Record<string, any>;

  ["fov", "near", "far", "zoom", "left", "right", "top", "bottom"].forEach((property) => {
    if (typeof cameraRecord[property] === "number") record[property] = round(cameraRecord[property]);
  });

  return record;
}

export function serializeRuntimeSceneGraph(
  scene: THREE.Scene,
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
) {
  const { objects, lights, materials } = collectRuntimeItems(scene);

  return {
    counts: {
      objects: objects.length,
      lights: lights.length,
      materials: materials.length,
    },
    scene: serializeScene(scene),
    renderer: serializeRenderer(gl),
    camera: serializeCamera(camera),
    objects: objects.map(serializeObject3D),
    lights: lights.map(serializeLight),
    materials: materials.map(serializeMaterial),
  };
}

export function createRuntimeSceneSignature(scene: THREE.Scene) {
  const pieces: string[] = [];

  scene.traverse((object) => {
    if (object === scene) return;
    const materialIds = objectMaterials(object).map((material) => material.uuid).join(",");
    pieces.push(`${object.uuid}:${object.type}:${object.name}:${object.children.length}:${materialIds}`);
  });

  return pieces.join("|");
}

export function addRuntimeSceneGraphControls({
  folder,
  scene,
  camera,
  gl,
  helpers,
  refreshScene,
  requestRescan,
}: RuntimeSceneGraphOptions) {
  const items = collectRuntimeItems(scene);
  const rescanAction = { rescan: requestRescan };

  helpers.addButton(folder, "Copy Runtime Scene Graph Values", "Runtime Scene Graph Values", () =>
    serializeRuntimeSceneGraph(scene, camera, gl),
  );
  folder.add(rescanAction, "rescan").name("Refresh Runtime Items");

  const sceneFolder = folder.addFolder("Scene");
  helpers.addButton(sceneFolder, "Copy Scene Values", "Runtime Scene Values", () => serializeScene(scene));
  addSceneControls(sceneFolder, scene, helpers, refreshScene);
  closeFolder(sceneFolder);

  const rendererFolder = folder.addFolder("Renderer");
  helpers.addButton(rendererFolder, "Copy Renderer Values", "Runtime Renderer Values", () => serializeRenderer(gl));
  addRendererControls(rendererFolder, gl, helpers, refreshScene);
  closeFolder(rendererFolder);

  const cameraFolder = folder.addFolder("Camera");
  helpers.addButton(cameraFolder, "Copy Camera Values", "Runtime Camera Values", () => serializeCamera(camera));
  addCameraControls(cameraFolder, camera, helpers, refreshScene);
  closeFolder(cameraFolder);

  const lightsFolder = folder.addFolder(`Lights (${items.lights.length})`);
  helpers.addButton(lightsFolder, "Copy Lights Values", "Runtime Lights Values", () => items.lights.map(serializeLight));
  items.lights.forEach((light, index) => {
    const lightFolder = lightsFolder.addFolder(objectLabel(light, index));
    addLightControls(lightFolder, light, helpers, refreshScene);
    closeFolder(lightFolder);
  });
  closeFolder(lightsFolder);

  const objectsFolder = folder.addFolder(`Objects (${items.objects.length})`);
  helpers.addButton(objectsFolder, "Copy Objects Values", "Runtime Objects Values", () =>
    items.objects.map(serializeObject3D),
  );
  items.objects.forEach((object, index) => {
    const objectFolder = objectsFolder.addFolder(objectLabel(object, index));
    addObject3DControls(objectFolder, object, helpers, refreshScene);
    closeFolder(objectFolder);
  });
  closeFolder(objectsFolder);

  const materialsFolder = folder.addFolder(`Materials (${items.materials.length})`);
  helpers.addButton(materialsFolder, "Copy Materials Values", "Runtime Materials Values", () =>
    items.materials.map(serializeMaterial),
  );
  items.materials.forEach((material, index) => {
    const materialFolder = materialsFolder.addFolder(materialLabel(material, index));
    addMaterialControls(materialFolder, material, helpers, refreshScene);
    closeFolder(materialFolder);
  });
  closeFolder(materialsFolder);
}
