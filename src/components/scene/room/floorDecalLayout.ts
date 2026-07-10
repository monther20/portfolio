import type * as THREE from "three";

import type {
  FloorDecalCategoryDebug,
  FloorDecalGroupDebug,
  FloorDecalItemDebug,
  FloorDecalsDebug,
  FloorDecalTextureKey,
} from "../roomDebug/types";

// aspect ratios: rock-1 401x157, rock_and_herp 412x160, herp 490x262
export const ROCK1_ASPECT = 401 / 157; // ~2.55
export const ROCKH_ASPECT = 412 / 160; // ~2.575
export const HERP_ASPECT = 490 / 262; // ~1.87
export const TABLE_ASPECT = 1536 / 1024; // 1.5
export const CHAIR_ASPECT = 1254 / 1254; // 1.0

export type FloorDecalSpec = {
  id: string;
  tex: THREE.Texture;
  pos: [number, number, number];
  s: number;
  a: number;
  ro?: number;
};

type DecalTextures = Record<FloorDecalTextureKey, THREE.Texture>;
type FloorDecalPlacement = Omit<FloorDecalSpec, "tex"> & {
  textureKey: FloorDecalTextureKey;
};

const FLOOR_DECAL_RENDER_SEQUENCE = [
  "stone-01",
  "herp-01",
  "stone-02",
  "herp-02",
  "stone-03",
  "stone-04",
  "stone-05",
  "stone-06",
  "stone-07",
  "stone-08",
  "stone-09",
  "herp-03",
  "herp-04",
  "herp-05",
  "stone-10",
  "stone-11",
  "stone-12",
  "stone-13",
  "stone-14",
  "stone-15",
  "stone-16",
  "herp-06",
  "herp-07",
  "herp-08",
  "table-01",
  "chair-01",
];

const floorDecalRenderOrder = new Map(
  FLOOR_DECAL_RENDER_SEQUENCE.map((id, index) => [id, index]),
);

const applyDecalGroups = (
  item: FloorDecalItemDebug,
  categoryGroup: FloorDecalGroupDebug,
  allGroup: FloorDecalGroupDebug,
): FloorDecalPlacement | null => {
  if (!allGroup.visible || !categoryGroup.visible || !item.visible) return null;

  return {
    id: item.id,
    textureKey: item.textureKey,
    pos: [
      item.position.x + categoryGroup.position.x + allGroup.position.x,
      item.position.y + categoryGroup.position.y + allGroup.position.y,
      item.position.z + categoryGroup.position.z + allGroup.position.z,
    ],
    s: item.scale * categoryGroup.scale * allGroup.scale,
    a: item.aspect,
    ro: item.renderOrder,
  };
};

const buildCategoryDecals = (
  category: FloorDecalCategoryDebug,
  allGroup: FloorDecalGroupDebug,
  textures: DecalTextures,
): FloorDecalSpec[] =>
  category.items.flatMap((item) => {
    const spec = applyDecalGroups(item, category.group, allGroup);
    if (!spec) return [];

    const { textureKey, ...placement } = spec;
    return [{ ...placement, tex: textures[textureKey] }];
  });

/** The hand-placed scatter of rocks/plants plus the table & chair decals. */
export function buildFloorDecals(
  textures: DecalTextures,
  debug: FloorDecalsDebug,
): FloorDecalSpec[] {
  return [
    ...buildCategoryDecals(debug.stones, debug.all, textures),
    ...buildCategoryDecals(debug.herps, debug.all, textures),
    ...buildCategoryDecals(debug.table, debug.all, textures),
    ...buildCategoryDecals(debug.chair, debug.all, textures),
  ].sort(
    (a, b) =>
      (floorDecalRenderOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (floorDecalRenderOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
