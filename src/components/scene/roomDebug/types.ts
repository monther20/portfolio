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

type LightDebug = {
  visible: boolean;
  color: string;
  dayIntensity: number;
};

type MaterialDebug = {
  color: string;
  roughness: number;
  metalness: number;
  bumpScale?: number;
  wireframe: boolean;
};

export type FloorDecalTextureKey = "rock1" | "rockHerp" | "herp";

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
};

type InteriorDetailsDebug = {
  floorDecals: FloorDecalsDebug;
};

export type RoomDebugState = {
  scene: {
    dayBackgroundColor: string;
    dayFogColor: string;
    fogNear: number;
    fogFar: number;
  };
  environment: {
    studioHdri: {
      visible: boolean;
      environmentIntensity: number;
    };
  };
  lights: {
    interiorAmbient: LightDebug;
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
  };
  interiorDetails: InteriorDetailsDebug;
  materials: {
    floor: MaterialDebug;
    stonePath: MaterialDebug;
    exteriorWall: MaterialDebug;
    doorFrame: MaterialDebug;
    doorPanel: MaterialDebug;
  };
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

export function vector3Tuple(vector: Vector3Debug): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function rotationTuple(vector: Vector3Debug): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function scaleTuple(vector: Vector3Debug): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}
