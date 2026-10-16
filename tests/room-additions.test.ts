import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const model = (name: string) => {
  const buffer = readFileSync(join(process.cwd(), "public/models", name));
  assert.equal(buffer.subarray(0, 4).toString(), "glTF");
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString()) as {
    nodes: { name?: string; children?: number[]; skin?: number }[];
    scenes: { nodes: number[] }[];
    animations?: {
      name: string;
      channels: { target: { node: number; path: string } }[];
      samplers: { input: number }[];
    }[];
    accessors: { max?: number[]; min?: number[]; count: number; bufferView: number; byteOffset?: number }[];
    meshes: { primitives: { indices: number; attributes: Record<string, number> }[] }[];
    skins?: { joints: number[] }[];
    materials?: { name?: string; extensions?: { KHR_materials_unlit?: object } }[];
    images?: { uri?: string; bufferView?: number }[];
    bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
    extensionsRequired?: string[];
  };
};

test("the original chair supplies one shared rocking pivot and a stationary table", () => {
  const furniture = model("chair-table.meshopt.glb");
  const byName = new Map(furniture.nodes.map((node, index) => [node.name, index]));
  const root = byName.get("Chair_ROOT")!;
  const pivot = byName.get("Chair_Rocking_Pivot")!;
  const chair = byName.get("Chair_Model")!;
  assert.ok(furniture.nodes[root].children?.includes(pivot));
  assert.ok(furniture.nodes[pivot].children?.includes(chair));
  assert.ok(furniture.scenes[0].nodes.includes(byName.get("Table_STATIC")!));
  const rock = furniture.animations?.find((clip) => clip.name === "Chair_Rocking_Loop")!;
  assert.deepEqual(rock.channels.map(({ target }) => [furniture.nodes[target.node].name, target.path]), [
    ["Chair_Rocking_Pivot", "rotation"],
  ]);
});

test("the user's original graphite character remains byte-for-byte unchanged", () => {
  const base = join(process.cwd(), "public/models/shadow-character");
  const expected = readFileSync(join(base, "SHA256.txt"), "utf8").split(/\s+/)[0];
  const actual = createHash("sha256")
    .update(readFileSync(join(base, "shadow-character.glb")))
    .digest("hex");
  assert.equal(actual, expected);
});

test("the seated export preserves the supplied texture, UVs, skin weights and topology", () => {
  const files = [
    "shadow-character/shadow-character.glb",
    "shadow-character-seated.glb",
  ] as const;
  const originals = files.map((name) => {
    const buffer = readFileSync(join(process.cwd(), "public/models", name));
    const json = model(name);
    const binaryOffset = 28 + buffer.readUInt32LE(12);
    const view = (index: number) => {
      const v = json.bufferViews[index];
      return buffer.subarray(binaryOffset + (v.byteOffset ?? 0), binaryOffset + (v.byteOffset ?? 0) + v.byteLength);
    };
    const primitive = json.meshes[0].primitives[0];
    return {
      atlas: view(json.images![0].bufferView!),
      indices: view(json.accessors[primitive.indices].bufferView!),
      uv: view(json.accessors[primitive.attributes.TEXCOORD_0].bufferView!),
      joints: view(json.accessors[primitive.attributes.JOINTS_0].bufferView!),
      weights: view(json.accessors[primitive.attributes.WEIGHTS_0].bufferView!),
    };
  });
  for (const key of ["atlas", "indices", "uv", "joints", "weights"] as const) {
    assert.ok(originals[0][key].equals(originals[1][key]), `${key} must retain the user's original data`);
  }
});

test("the user's 21-bone silhouette is reposed to sit and preserves the atlas and idle", () => {
  const person = model("shadow-character-seated.glb");
  assert.equal(person.meshes.length, 1);
  assert.equal(person.skins?.[0].joints.length, 21);
  assert.equal(person.materials?.[0].name, "Graphite_Unlit");
  assert.ok(person.materials?.[0].extensions?.KHR_materials_unlit);
  assert.equal(person.animations?.length, 1);
  assert.equal(person.animations?.[0].name, "Seated_Idle_8s");
  assert.deepEqual(person.animations?.[0].channels.map(({ target }) =>
    [person.nodes[target.node].name, target.path],
  ), [
    ["Chest", "rotation"],
    ["Neck", "rotation"],
    ["Head", "rotation"],
  ]);
  for (const sampler of person.animations![0].samplers) {
    assert.equal(person.accessors[sampler.input].min?.[0], 0);
    assert.equal(person.accessors[sampler.input].max?.[0], 8);
  }
  const pos = person.accessors[person.meshes[0].primitives[0].indices];
  assert.equal(pos.count / 3, 14592);
  const position = person.accessors[0];
  assert.ok(position.min![1] >= 0 && position.min![1] < 0.01);
  assert.ok(position.max![1] > 1.2 && position.max![1] < 1.31);
  assert.ok(person.nodes.some((node) => node.skin !== undefined));
  assert.ok(person.scenes[0].nodes.some((nodeIndex) => person.nodes[nodeIndex].skin !== undefined));
  assert.ok(!person.nodes.some((node) => node.name?.startsWith("Chair_") || node.name?.startsWith("Table_")));
  assert.deepEqual(person.extensionsRequired, ["KHR_materials_unlit"]);
  assert.ok(person.images?.every((image) => !image.uri));
});

test("both posed forearms reach the wrists without folding backward into hand spikes", () => {
  const filename = "shadow-character-seated.glb";
  const buffer = readFileSync(join(process.cwd(), "public/models", filename));
  const gltf = model(filename);
  const position = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  const view = gltf.bufferViews[position.bufferView];
  const dataStart = 28 + buffer.readUInt32LE(12) + (view.byteOffset ?? 0) + (position.byteOffset ?? 0);
  const stride = view.byteStride ?? 12;
  const components = JSON.parse(readFileSync(join(
    process.cwd(), "public/models/shadow-character/source/component-map.json",
  ), "utf8")) as { name: string; vertexStart: number }[];
  for (const side of ["R", "L"]) {
    const arm = components.find((part) => part.name === `Arm.${side}`)!;
    const center = (ring: number) => {
      const result = [0, 0, 0];
      for (let vertex = 0; vertex < 14; vertex++) {
        const offset = dataStart + (arm.vertexStart + ring * 15 + vertex) * stride;
        for (let axis = 0; axis < 3; axis++) result[axis] += buffer.readFloatLE(offset + axis * 4) / 14;
      }
      return result;
    };
    let previous = center(0);
    for (let ring = 1; ring <= 22; ring++) {
      const next = center(ring);
      assert.ok(next[1] > previous[1], `${side} forearm reversed vertically at ring ${ring}`);
      assert.ok(next[2] > previous[2], `${side} forearm reversed toward the hand at ring ${ring}`);
      previous = next;
    }
  }
});

test("the board is only a static, embedded textured board", () => {
  const board = model("chessboard.glb");
  assert.deepEqual(board.nodes.map((node) => node.name), ["Chessboard_8x8"]);
  assert.equal(board.animations?.length ?? 0, 0);
  assert.equal(board.meshes.length, 1);
  assert.equal(board.meshes[0].primitives.length, 1);
  assert.equal(board.accessors[board.meshes[0].primitives[0].indices].count / 3, 44);
  assert.ok(board.images?.every((image) => !image.uri));
  assert.equal(board.extensionsRequired?.length ?? 0, 0);
});
