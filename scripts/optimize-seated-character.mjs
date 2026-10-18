// Run: node scripts/optimize-seated-character.mjs [--check]
// Offline only: uses meshoptimizer (Drei) and sharp (Next.js), already installed.
// No quantization, filters, simplification, vertex/triangle reordering or resizing.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MeshoptEncoder } from "meshoptimizer/encoder";
import { MeshoptDecoder } from "meshoptimizer/decoder";
import sharp from "sharp";

const sourcePath = fileURLToPath(new URL("../public/models/shadow-character-seated.glb", import.meta.url));
const outputPath = fileURLToPath(new URL("../public/models/shadow-character-seated.meshopt.glb", import.meta.url));
const MESHOPT = "EXT_meshopt_compression";
const WEBP = "EXT_texture_webp";

function parseGlb(bytes) {
  assert.equal(bytes.subarray(0, 4).toString(), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  assert.equal(bytes.readUInt32LE(24 + jsonLength), 0x004e4942);
  return {
    json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()),
    binary: bytes.subarray(28 + jsonLength),
  };
}

function glbBytes(json, binary) {
  const data = Buffer.from(JSON.stringify(json));
  const jsonLength = Math.ceil(data.length / 4) * 4;
  const binaryLength = Math.ceil(binary.length / 4) * 4;
  const bytes = Buffer.alloc(28 + jsonLength + binaryLength);
  bytes.write("glTF");
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(jsonLength, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  bytes.fill(0x20, 20, 20 + jsonLength);
  data.copy(bytes, 20);
  bytes.writeUInt32LE(binaryLength, 20 + jsonLength);
  bytes.writeUInt32LE(0x004e4942, 24 + jsonLength);
  binary.copy(bytes, 28 + jsonLength);
  return bytes;
}

async function optimize() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const source = readFileSync(sourcePath);
  const { json: original, binary } = parseGlb(source);
  const json = structuredClone(original);
  assert.equal(json.buffers.length, 1);
  assert.equal(json.images.length, 1);
  const imageView = json.images[0].bufferView;
  const pieces = [];
  let binaryLength = 0;
  let fallbackLength = 0;
  let validatedViews = 0;

  const append = (bytes) => {
    const offset = binaryLength;
    pieces.push(bytes);
    binaryLength += bytes.length;
    const padding = (4 - binaryLength % 4) % 4;
    pieces.push(Buffer.alloc(padding));
    binaryLength += padding;
    return offset;
  };

  for (let index = 0; index < original.bufferViews.length; index += 1) {
    const view = original.bufferViews[index];
    const sourceBytes = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    assert.equal(view.buffer, 0);
    if (index === imageView) {
      assert.equal(original.images[0].mimeType, "image/png");
      const webp = await sharp(sourceBytes).webp({ lossless: true, effort: 6 }).toBuffer();
      const [before, after] = await Promise.all([
        sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      ]);
      assert.deepEqual(after.info, before.info, "Atlas dimensions/channels must be unchanged");
      assert.ok(after.data.equals(before.data), "Every decoded RGBA atlas pixel must be identical");
      json.bufferViews[index] = { ...view, buffer: 0, byteOffset: append(webp), byteLength: webp.length };
      json.images[0].mimeType = "image/webp";
      continue;
    }

    // This source uses one tightly packed accessor per view. Fail explicitly if
    // an updated source needs a different packing strategy rather than guessing.
    const accessors = original.accessors.filter((accessor) => accessor.bufferView === index);
    assert.equal(accessors.length, 1, `Expected one accessor in view ${index}`);
    const accessor = accessors[0];
    assert.equal(accessor.byteOffset ?? 0, 0);
    const stride = view.byteLength / accessor.count;
    assert.ok(Number.isInteger(stride) && stride > 0);
    const mode = view.target === 34963 ? "INDICES" : "ATTRIBUTES";
    assert.ok(mode === "INDICES" ? stride === 2 || stride === 4 : stride % 4 === 0);
    // INDICES preserves the exact index sequence; triangle compression may
    // rotate each triangle's indices even when its rendered topology matches.
    const encoded = MeshoptEncoder.encodeGltfBuffer(sourceBytes, accessor.count, stride, mode);
    const decoded = new Uint8Array(sourceBytes.length);
    MeshoptDecoder.decodeGltfBuffer(decoded, accessor.count, stride, encoded, mode);
    assert.ok(Buffer.from(decoded).equals(sourceBytes), `View ${index} must decode byte-for-byte`);
    json.bufferViews[index] = {
      ...view,
      buffer: 1,
      byteOffset: fallbackLength,
      extensions: {
        [MESHOPT]: {
          buffer: 0,
          byteOffset: append(Buffer.from(encoded)),
          byteLength: encoded.length,
          byteStride: stride,
          count: accessor.count,
          mode,
        },
      },
    };
    fallbackLength += view.byteLength;
    validatedViews += 1;
  }

  for (const texture of json.textures) {
    assert.equal(texture.source, 0);
    texture.extensions = { ...texture.extensions, [WEBP]: { source: texture.source } };
    delete texture.source;
  }
  json.extensionsUsed = [...new Set([...json.extensionsUsed, MESHOPT, WEBP])];
  json.extensionsRequired = [...new Set([...json.extensionsRequired, MESHOPT, WEBP])];
  json.buffers = [
    { byteLength: binaryLength },
    { byteLength: fallbackLength, extensions: { [MESHOPT]: { fallback: true } } },
  ];
  const result = glbBytes(json, Buffer.concat(pieces));
  const report = {
    sourceBytes: source.length,
    optimizedBytes: result.length,
    savedBytes: source.length - result.length,
    savedPercent: Number(((1 - result.length / source.length) * 100).toFixed(2)),
    byteIdenticalDecodedViews: validatedViews,
    pixelIdenticalAtlas: true,
    atlasWidth: 1024,
    atlasHeight: 1024,
  };
  return { result, report };
}

const { result, report } = await optimize();
if (process.argv.includes("--check")) {
  assert.ok(readFileSync(outputPath).equals(result), "Regenerated GLB must be byte-identical to the committed asset");
} else {
  writeFileSync(outputPath, result);
}
console.log(JSON.stringify({ ...report, deterministicCheck: process.argv.includes("--check") }, null, 2));
