import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCorridorFixturePalette } from "../src/components/scene/corridor/corridorFixturePalette";

function createMaterials() {
  return [
    new THREE.MeshStandardMaterial({ name: "Pencil_Metalwork", color: "#c7c8c5", map: new THREE.Texture(), roughness: 1 }),
    new THREE.MeshStandardMaterial({ name: "Sketch_Glass", color: "#d8d2bc", map: new THREE.Texture(), transparent: true, opacity: 0.76 }),
    new THREE.LineBasicMaterial({ name: "Graphite_Contours", color: "#545861" }),
    new THREE.MeshStandardMaterial({ name: "Warm_Light_Source", color: "#77746e", transparent: true, opacity: 0 }),
  ];
}

function appearance(materials: ReturnType<typeof createMaterials>) {
  return materials.map((material) => ({
    // Interpolation at 1 can differ from a direct copy by machine epsilon.
    color: material.color.toArray().map((channel) => Number(channel.toFixed(12))),
    opacity: material.opacity,
  }));
}

test("daytime corridor fixtures use white paper, lighter graphite and neutral glass without lighting the bulb", () => {
  const materials = createMaterials();
  const maps = materials.map((material) => material.map);
  const bulb = materials[3].clone();
  const apply = createCorridorFixturePalette(materials);
  apply(0);
  assert.equal(materials[0].color.getHexString(), "ffffff");
  assert.equal(materials[1].color.getHexString(), "ffffff");
  assert.equal(materials[1].opacity, 0.5);
  assert.equal(materials[2].color.getHexString(), "9a9a9a");
  assert.ok(materials[3].color.equals(bulb.color));
  assert.equal(materials[3].opacity, 0);
  materials.forEach((material, index) => {
    assert.equal(material.map, maps[index]);
    if (material instanceof THREE.MeshStandardMaterial) {
      assert.equal(material.emissive.getHexString(), "000000");
    }
  });
});

test("night appearance is preserved, repeated toggles do not drift, and cached materials stay untouched", () => {
  const cached = createMaterials();
  const original = appearance(cached);
  const local = cached.map((material) => material.clone());
  const apply = createCorridorFixturePalette(local);
  apply(0.4);
  const halfway = appearance(local);
  for (let i = 0; i < 5; i++) {
    apply(0);
    apply(1);
    assert.deepEqual(appearance(local), original);
    apply(0.4);
    assert.deepEqual(appearance(local), halfway);
  }
  assert.deepEqual(appearance(cached), original);
});
