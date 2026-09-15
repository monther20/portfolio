// Deterministic, low-poly pencil fixtures. Run: node scripts/generate-corridor-lights.mjs
// No Blender, external images or runtime generation needed; the PNG is embedded.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// GLTFExporter only needs FileReader for its binary buffer in Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, crc]);
}
function pencilAtlas() {
  const size = 128;
  const rows = Buffer.alloc(size * (size * 3 + 1));
  let seed = 7331;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = (seed >>> 24) / 255;
      const hatch = (x + y * 0.65 + Math.sin(y * 0.14) * 1.2) % 23;
      const shade = Math.round(242 - grain * 14 - (hatch < 1.1 ? 46 : 0));
      const at = y * (size * 3 + 1) + 1 + x * 3;
      rows[at] = rows[at + 1] = rows[at + 2] = shade;
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function fixture(pendant) {
  const root = new THREE.Group();
  root.name = pendant ? "Pencil_Corridor_Pendant" : "Pencil_Corridor_Sconce";
  root.userData = {
    units: "metres",
    frontAxis: "+Z",
    mountingOrigin: pendant ? "ceiling" : "wall",
    lightSource: "Light_Source",
  };
  const frame = new THREE.MeshStandardMaterial({
    name: "Pencil_Metalwork",
    color: "#c7c8c5",
    roughness: 1,
    metalness: 0,
  });
  const glass = new THREE.MeshStandardMaterial({
    name: "Sketch_Glass",
    color: "#d8d2bc",
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.76,
    side: THREE.DoubleSide,
  });
  const bulb = new THREE.MeshStandardMaterial({
    name: "Warm_Light_Source",
    color: "#77746e",
    roughness: 1,
    transparent: true,
    opacity: 0,
  });
  const ink = new THREE.LineBasicMaterial({
    name: "Graphite_Contours",
    color: "#545861",
  });
  const solids = [],
    outlines = [];
  function part(geometry, position, rotation = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    outlines.push(new THREE.EdgesGeometry(geometry, 28));
    solids.push(geometry.index ? geometry.toNonIndexed() : geometry);
  }
  function rod(a, b, radius = 0.009) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b);
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      start.distanceTo(end),
      5,
    );
    const rotation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.clone().sub(start).normalize(),
    );
    geometry.applyMatrix4(
      new THREE.Matrix4().compose(
        start.add(end).multiplyScalar(0.5),
        rotation,
        new THREE.Vector3(1, 1, 1),
      ),
    );
    solids.push(geometry.toNonIndexed());
  }
  const z = pendant ? 0 : 0.32;
  const y = pendant ? -0.71 : 0.02;
  const sides = pendant ? 8 : 6;
  const topR = pendant ? 0.18 : 0.16;
  const bottomR = pendant ? 0.145 : 0.12;
  if (pendant) {
    part(new THREE.CylinderGeometry(0.15, 0.12, 0.055, 12), [0, -0.02, 0]);
    rod([0, -0.035, 0], [0, -0.4, 0], 0.012);
  } else {
    part(
      new THREE.CylinderGeometry(0.17, 0.17, 0.045, 12),
      [0, 0.21, 0.02],
      [Math.PI / 2, 0, 0],
    );
    const curve = new THREE.CatmullRomCurve3(
      [
        [0, 0.15, 0.04],
        [0, 0.12, 0.15],
        [0, 0.23, 0.32],
        [0, 0.39, 0.32],
      ].map((p) => new THREE.Vector3(...p)),
    );
    part(new THREE.TubeGeometry(curve, 8, 0.019, 5, false), [0, 0, 0]);
  }
  part(new THREE.ConeGeometry(topR + 0.07, 0.14, sides), [0, y + 0.28, z]);
  part(new THREE.CylinderGeometry(topR + 0.025, topR + 0.025, 0.025, sides), [
    0,
    y + 0.205,
    z,
  ]);
  part(
    new THREE.CylinderGeometry(bottomR + 0.025, bottomR + 0.025, 0.035, sides),
    [0, y - 0.2, z],
  );
  part(new THREE.CylinderGeometry(bottomR, 0.045, 0.11, sides), [
    0,
    y - 0.27,
    z,
  ]);
  part(new THREE.SphereGeometry(0.025, 8, 5), [0, y - 0.34, z]);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    rod(
      [Math.sin(a) * bottomR, y - 0.2, z + Math.cos(a) * bottomR],
      [Math.sin(a) * topR, y + 0.2, z + Math.cos(a) * topR],
    );
  }
  const shell = new THREE.Mesh(mergeGeometries(solids), frame);
  shell.name = "Pencil_Frame";
  root.add(shell);
  const lines = new THREE.LineSegments(mergeGeometries(outlines), ink);
  lines.name = "Graphite_Lines";
  root.add(lines);
  const panes = new THREE.Mesh(
    new THREE.CylinderGeometry(
      topR - 0.005,
      bottomR - 0.005,
      0.38,
      sides,
      1,
      true,
    ),
    glass,
  );
  panes.name = "Glass_Panels";
  panes.position.set(0, y, z);
  root.add(panes);
  const source = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), bulb);
  source.name = "Light_Source";
  source.position.set(0, y - 0.025, z);
  source.scale.y = 1.7;
  root.add(source);
  return root;
}

function embedAtlas(buffer, png) {
  const original = Buffer.from(buffer);
  const jsonLength = original.readUInt32LE(12);
  const json = JSON.parse(original.toString("utf8", 20, 20 + jsonLength));
  const binary = original.subarray(28 + jsonLength);
  const imageOffset = Math.ceil(binary.length / 4) * 4;
  const joined = Buffer.alloc(Math.ceil((imageOffset + png.length) / 4) * 4);
  binary.copy(joined);
  png.copy(joined, imageOffset);
  json.bufferViews ??= [];
  const view = json.bufferViews.length;
  json.bufferViews.push({
    buffer: 0,
    byteOffset: imageOffset,
    byteLength: png.length,
  });
  json.images = [
    { name: "Pencil_Hatching_128", mimeType: "image/png", bufferView: view },
  ];
  json.samplers = [
    { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
  ];
  json.textures = [{ sampler: 0, source: 0 }];
  for (const material of json.materials)
    if (["Pencil_Metalwork", "Sketch_Glass"].includes(material.name)) {
      material.pbrMetallicRoughness.baseColorTexture = { index: 0 };
      if (material.name === "Sketch_Glass")
        material.emissiveTexture = { index: 0 };
    }
  json.buffers[0].byteLength = joined.length;
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
  text.copy(padded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + joined.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(joined.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, padded, binHeader, joined]);
}

mkdirSync("public/models", { recursive: true });
for (const pendant of [false, true]) {
  const scene = fixture(pendant);
  const exporter = new GLTFExporter();
  const binary = await exporter.parseAsync(scene, { binary: true });
  const glb = embedAtlas(binary, pencilAtlas());
  const file = `public/models/pencil-corridor-${pendant ? "pendant" : "sconce"}.glb`;
  writeFileSync(file, glb);
  console.log(`${file}: ${glb.length.toLocaleString()} bytes`);
}
