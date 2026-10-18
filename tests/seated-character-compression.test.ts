import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MeshoptDecoder } from "meshoptimizer/decoder";

type Compression = {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  byteStride: number;
  count: number;
  mode: string;
  filter?: string;
};
type BufferView = {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  extensions?: { EXT_meshopt_compression?: Compression };
};

function model(name: string) {
  const bytes = readFileSync(join(process.cwd(), "public/models", name));
  assert.equal(bytes.subarray(0, 4).toString(), "glTF");
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()) as {
    bufferViews: BufferView[];
    accessors: object[];
    images: { bufferView: number; mimeType: string }[];
    textures: { extensions: { EXT_texture_webp: { source: number } } }[];
    extensionsUsed: string[];
    extensionsRequired: string[];
    [key: string]: unknown;
  };
  return { bytes, json, binary: bytes.subarray(28 + jsonLength) };
}

const source = model("shadow-character-seated.glb");
const optimized = model("shadow-character-seated.meshopt.glb");

test("compressed character retains every position, UV, normal, skin weight and animation byte", async () => {
  await MeshoptDecoder.ready;
  assert.equal(optimized.json.bufferViews.length, source.json.bufferViews.length);
  assert.deepEqual(optimized.json.accessors, source.json.accessors);
  const imageViews = new Set(source.json.images.map((image) => image.bufferView));
  let checked = 0;
  for (let index = 0; index < source.json.bufferViews.length; index += 1) {
    if (imageViews.has(index)) continue;
    const view = source.json.bufferViews[index];
    const compression = optimized.json.bufferViews[index].extensions?.EXT_meshopt_compression;
    assert.ok(compression, `View ${index} must be compressed`);
    assert.equal(compression.buffer, 0);
    assert.equal(compression.filter, undefined, "No lossy filters");
    const encoded = optimized.binary.subarray(compression.byteOffset, compression.byteOffset + compression.byteLength);
    const decoded = new Uint8Array(compression.count * compression.byteStride);
    MeshoptDecoder.decodeGltfBuffer(decoded, compression.count, compression.byteStride, encoded, compression.mode);
    const original = source.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    assert.ok(Buffer.from(decoded).equals(original), `Decoded view ${index} differs`);
    checked += 1;
  }
  assert.equal(checked, 11);
});

test("compressed character preserves authored hierarchy, materials, skeleton and clip definitions", () => {
  for (const key of ["asset", "scene", "scenes", "nodes", "meshes", "skins", "materials", "animations", "samplers"]) {
    assert.deepEqual(optimized.json[key], source.json[key], `${key} must remain unchanged`);
  }
  assert.deepEqual(optimized.json.extensionsRequired, ["KHR_materials_unlit", "EXT_meshopt_compression", "EXT_texture_webp"]);
  assert.deepEqual(optimized.json.textures[0].extensions.EXT_texture_webp, { source: 0 });
});

test("the atlas uses full-resolution lossless WebP and the whole asset saves at least 40 percent", () => {
  assert.equal(optimized.json.images[0].mimeType, "image/webp");
  const view = optimized.json.bufferViews[optimized.json.images[0].bufferView];
  assert.equal(view.buffer, 0);
  const image = optimized.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  assert.equal(image.subarray(0, 4).toString(), "RIFF");
  assert.equal(image.subarray(8, 12).toString(), "WEBP");
  assert.equal(image.subarray(12, 16).toString(), "VP8L", "VP8L is the lossless WebP codec");
  assert.equal(image[20], 0x2f);
  const dimensions = image.readUInt32LE(21);
  assert.equal((dimensions & 0x3fff) + 1, 1024);
  assert.equal(((dimensions >>> 14) & 0x3fff) + 1, 1024);
  assert.ok(optimized.bytes.length < source.bytes.length * 0.6);
});
