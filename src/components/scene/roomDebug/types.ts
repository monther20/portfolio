import type { ShadowConfig } from "../ShadowDebugPanel";

/** lil-gui is imported dynamically, so folders/controllers stay untyped. */
export type GuiLike = any;

export type Vector3Debug = {
  x: number;
  y: number;
  z: number;
};

export type TransformDebug = {
  visible: boolean;
  position: Vector3Debug;
  rotation: Vector3Debug;
  scale: Vector3Debug;
  renderOrder: number;
};

export type LightDebug = {
  visible: boolean;
  color: string;
  dayIntensity: number;
  nightIntensity: number;
};

export type SpotLightDebug = {
  visible: boolean;
  position: Vector3Debug;
  target: Vector3Debug;
  color: string;
  intensity: number;
  angle: number;
  penumbra: number;
  distance: number;
  decay: number;
};

export type MaterialDebug = {
  color: string;
  nightColor?: string;
  roughness: number;
  metalness: number;
  bumpScale?: number;
  wireframe: boolean;
};

export type FloorGlowDebug = TransformDebug & {
  radius: number;
  color: string;
  maxOpacity: number;
};

export type FloorDecalTextureKey = "rock1" | "rockHerp" | "herp" | "table" | "chair";

export type FloorDecalGroupDebug = {
  visible: boolean;
  position: Vector3Debug;
  scale: number;
};

export type FloorDecalItemDebug = {
  id: string;
  label: string;
  textureKey: FloorDecalTextureKey;
  aspect: number;
  visible: boolean;
  position: Vector3Debug;
  scale: number;
  renderOrder: number;
};

export type FloorDecalCategoryDebug = {
  group: FloorDecalGroupDebug;
  items: FloorDecalItemDebug[];
};

export type FloorDecalsDebug = {
  all: FloorDecalGroupDebug;
  stones: FloorDecalCategoryDebug;
  herps: FloorDecalCategoryDebug;
  table: FloorDecalCategoryDebug;
  chair: FloorDecalCategoryDebug;
};

export type InteriorDetailsDebug = {
  floorDecals: FloorDecalsDebug;
};

export type RoomDebugState = {
  interaction: {
    nightMode: boolean;
  };
  scene: {
    dayBackgroundColor: string;
    nightBackgroundColor: string;
    dayFogColor: string;
    nightFogColor: string;
    fogNear: number;
    fogFar: number;
  };
  renderer: {
    toneMappingExposure: number;
    clearColor: string;
  };
  camera: {
    position: Vector3Debug;
    lookAt: Vector3Debug;
    fov: number;
    near: number;
    far: number;
  };
  environment: {
    studioHdri: {
      visible: boolean;
      environmentIntensity: number;
    };
  };
  lights: {
    interiorAmbient: LightDebug;
    leftLanternSpot: SpotLightDebug;
    rightLanternSpot: SpotLightDebug;
  };
  meshes: {
    floor: TransformDebug;
    stonePath: TransformDebug;
    exteriorWall: TransformDebug;
    doorRoot: TransformDebug;
    doorFrame: TransformDebug;
    doorPanelPivot: TransformDebug;
    doorPanelSurface: TransformDebug;
    leftLantern: TransformDebug;
    rightLantern: TransformDebug;
    leftFloorGlow: FloorGlowDebug;
    rightFloorGlow: FloorGlowDebug;
  };
  interiorDetails: InteriorDetailsDebug;
  materials: {
    floor: MaterialDebug;
    stonePath: MaterialDebug;
    exteriorWall: MaterialDebug;
    doorFrame: MaterialDebug;
    doorPanel: MaterialDebug;
  };
  shadows: ShadowConfig;
};

export function createVector3(x = 0, y = 0, z = 0): Vector3Debug {
  return { x, y, z };
}

export function createTransform(
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
  renderOrder = 0,
): TransformDebug {
  return {
    visible: true,
    position: createVector3(...position),
    rotation: createVector3(...rotation),
    scale: createVector3(...scale),
    renderOrder,
  };
}

export function cloneShadowConfig(config: ShadowConfig): ShadowConfig {
  return {
    table: { ...config.table },
    chair: { ...config.chair },
  };
}

export function vector3Tuple(vector: Vector3Debug): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function rotationTuple(vector: Vector3Debug): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function scaleTuple(vector: Vector3Debug): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function serializeRoomDebugState(debug: RoomDebugState) {
  return JSON.parse(JSON.stringify(debug)) as RoomDebugState;
}
