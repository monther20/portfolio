import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createRoomDebugState } from "../src/components/scene/roomDebug/state";
import {
  createLanternUniforms,
  DAY_CONFIG,
  NIGHT_CONFIG,
} from "../src/components/scene/dayNight/config";
import { addUnlitNightLighting } from "../src/components/scene/dayNight/unlitNightMaterial";

test("original daytime environment remains the authoritative baseline", () => {
  const room = createRoomDebugState();
  assert.equal(room.scene.dayBackgroundColor, "#ffffff");
  assert.equal(room.scene.dayFogColor, "#ffffff");
  assert.equal(room.lights.interiorAmbient.dayIntensity, 2.5);
  assert.equal(room.environment.studioHdri.environmentIntensity, 0.2);
  assert.equal(DAY_CONFIG.exposure, 1);
  assert.equal(DAY_CONFIG.glassColor, "#bcbcbc");
  assert.equal(DAY_CONFIG.sourceColor, "#505050");
  assert.equal(DAY_CONFIG.lanternIntensity, 0);
  assert.equal(DAY_CONFIG.bloomIntensity, 0);
  assert.ok(NIGHT_CONFIG.exposure < DAY_CONFIG.exposure);
});

test("night uniforms are instance-owned, not shared mutable scene state", () => {
  const first = createLanternUniforms();
  const second = createLanternUniforms();
  first.nightAmount.value = 1;
  first.lanternIntensities.value[0] = 5;
  first.lanternPositions.value[0].set(1, 2, 3);
  assert.equal(second.nightAmount.value, 0);
  assert.equal(second.lanternIntensities.value[0], 0);
  assert.deepEqual(second.lanternPositions.value[0].toArray(), [0, 0, 0]);
});

test("unlit lighting extends the existing shader and never changes the atlas/color", () => {
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    map: new THREE.Texture(),
  });
  const originalMap = material.map;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.existingDoorWipe = { value: 0.75 };
  };
  material.customProgramCacheKey = () => "door-wipe";
  const uniforms = createLanternUniforms();
  addUnlitNightLighting(material, uniforms, "door");
  // Minimal compile-hook fixture; real WebGL compilation is covered in-browser.
  const shader = {
    uniforms: {} as Record<string, THREE.IUniform<unknown>>,
    vertexShader: "#include <common>\n#include <project_vertex>",
    fragmentShader: "#include <common>\n#include <opaque_fragment>",
  } as unknown as Parameters<THREE.Material["onBeforeCompile"]>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  assert.equal(shader.uniforms.existingDoorWipe.value, 0.75);
  assert.equal(shader.uniforms.nightAmount, uniforms.nightAmount);
  assert.match(shader.fragmentShader, /if \(nightAmount > 0.0\)/);
  assert.match(shader.fragmentShader, /lanternIntensities\[i\]/);
  assert.match(material.customProgramCacheKey(), /^door-wipe-/);
  assert.equal(material.map, originalMap);
  assert.equal(material.color.getHexString(), "ffffff");
  material.map?.dispose();
  material.dispose();
});

test("the lantern GLB's named source is at the audited bulb location", () => {
  const bytes = readFileSync(
    "public/models/vintage-pencil-lantern.meshopt.glb",
  );
  const gltf = JSON.parse(
    bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
  ) as {
    nodes: { name: string; translation?: number[]; mesh?: number }[];
    meshes: {
      primitives: { attributes: { POSITION: number }; material: number }[];
    }[];
    accessors: { min: number[]; max: number[] }[];
    materials: { name: string }[];
  };
  const bulb = gltf.nodes.find(
    (node) => node.name === "Interior_Emissive_Light",
  )!;
  const glass = gltf.nodes.find((node) => node.name === "Glass_Panels")!;
  assert.ok(bulb && glass);
  const primitive = gltf.meshes[bulb.mesh!].primitives[0];
  assert.equal(gltf.materials[primitive.material].name, "Interior_Emission");
  assert.equal(
    gltf.materials[gltf.meshes[glass.mesh!].primitives[0].material].name,
    "Glass_Sketch",
  );
  const bounds = gltf.accessors[primitive.attributes.POSITION];
  const center = new THREE.Vector3()
    .fromArray(bounds.min)
    .add(new THREE.Vector3().fromArray(bounds.max))
    .multiplyScalar(0.5);
  center.add(new THREE.Vector3().fromArray(bulb.translation!));
  assert.deepEqual(center.toArray(), [0, 0.276, 0]);
  const room = createRoomDebugState();
  for (const [mesh, expected] of [
    [room.meshes.leftLantern, [-2.85, 1.24, -15.41]],
    [room.meshes.rightLantern, [2.77, 1.25, -15.41]],
  ] as const) {
    const world = center
      .clone()
      .multiply(new THREE.Vector3(mesh.scale.x, mesh.scale.y, mesh.scale.z))
      .add(
        new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z),
      );
    world
      .toArray()
      .forEach((value, axis) =>
        assert.ok(Math.abs(value - expected[axis]) < 1e-10),
      );
  }
});
