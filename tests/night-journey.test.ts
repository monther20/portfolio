import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Matrix4, Vector3 } from "three";
import {
  JOURNEY,
  landingProgressAt,
} from "../src/components/scene/journeyConfig";
import {
  CORRIDOR_LAMPS,
  CORRIDOR_LAMP_DEPTHS,
  NIGHT_LIGHT_COUNT,
  NIGHT_STARS,
  createLanternUniforms,
} from "../src/components/scene/dayNight/config";

test("corridor lights reuse dark slots without overlapping assignment fades", () => {
  for (
    let index = CORRIDOR_LAMPS.lightPoolSize;
    index < CORRIDOR_LAMP_DEPTHS.length;
    index++
  ) {
    assert.ok(
      CORRIDOR_LAMP_DEPTHS[index] -
        CORRIDOR_LAMP_DEPTHS[index - CORRIDOR_LAMPS.lightPoolSize] >
        CORRIDOR_LAMPS.fadeFar * 2,
    );
  }
  const uniforms = createLanternUniforms();
  assert.equal(NIGHT_LIGHT_COUNT, 2 + CORRIDOR_LAMPS.lightPoolSize);
  assert.equal(uniforms.lanternPositions.value.length, NIGHT_LIGHT_COUNT);
  assert.equal(uniforms.lanternIntensities.value.length, NIGHT_LIGHT_COUNT);
  assert.ok(uniforms.lanternIntensities.value.every((value) => value === 0));
});

test("direct contact navigation never creates a NaN landing-curve parameter", () => {
  assert.equal(landingProgressAt(JOURNEY.farBound, JOURNEY.farBound), 1);
  assert.equal(landingProgressAt(JOURNEY.farBound + 1, JOURNEY.farBound), 0);
  assert.equal(landingProgressAt(JOURNEY.landingTriggerZ), 0);
  assert.equal(landingProgressAt(JOURNEY.farBound), 1);
  for (let z = JOURNEY.landingTriggerZ; z >= JOURNEY.farBound; z -= 0.1) {
    const amount = landingProgressAt(z);
    assert.ok(Number.isFinite(amount) && amount >= 0 && amount <= 1);
  }
});

test("star field stays inexpensive on mobile", () => {
  assert.ok(NIGHT_STARS.lowCount < NIGHT_STARS.count);
  assert.ok(NIGHT_STARS.count < 1000);
  assert.ok(NIGHT_STARS.opacity < 1);
});

for (const type of ["sconce", "pendant"] as const) {
  test(`generated ${type} GLB has valid embedded pencil art and a source inside its glass`, () => {
    const bytes = readFileSync(`public/models/pencil-corridor-${type}.glb`);
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length < 100_000);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) as {
      nodes: { name: string; matrix?: number[]; mesh?: number }[];
      meshes: { primitives: { attributes: { POSITION: number } }[] }[];
      accessors: { min: number[]; max: number[] }[];
      images: { mimeType: string; bufferView: number }[];
      bufferViews: { byteOffset?: number; byteLength: number }[];
      buffers: { byteLength: number }[];
    };
    const source = gltf.nodes.find((node) => node.name === "Light_Source")!;
    const glass = gltf.nodes.find((node) => node.name === "Glass_Panels")!;
    assert.ok(source && glass);
    const bounds =
      gltf.accessors[
        gltf.meshes[glass.mesh!].primitives[0].attributes.POSITION
      ];
    const sourceMatrix = source.matrix ? new Matrix4().fromArray(source.matrix) : new Matrix4();
    const glassMatrix = glass.matrix ? new Matrix4().fromArray(glass.matrix) : new Matrix4();
    const centerInGlass = new Vector3().applyMatrix4(sourceMatrix).applyMatrix4(glassMatrix.invert());
    centerInGlass.toArray().forEach((value, axis) => {
      assert.ok(value >= bounds.min[axis] && value <= bounds.max[axis]);
    });
    assert.equal(gltf.images[0].mimeType, "image/png");
    const view = gltf.bufferViews[gltf.images[0].bufferView];
    const imageStart = 28 + jsonLength + (view.byteOffset ?? 0);
    assert.deepEqual(
      [...bytes.subarray(imageStart, imageStart + 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    for (const view of gltf.bufferViews)
      assert.ok(
        (view.byteOffset ?? 0) + view.byteLength <= gltf.buffers[0].byteLength,
      );
  });
}
