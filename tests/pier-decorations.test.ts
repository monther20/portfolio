import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BEACH, JOURNEY } from "../src/components/scene/journeyConfig";
import { boardwalkPostRows, lastBoardwalkPosts } from "../src/components/scene/sections/beach/boardwalkLayout";
import { PIER_DECORATION, pierDecorationLayout, pierDecorationMotion } from "../src/components/scene/sections/beach/pierDecorationLayout";
import { createPierDecorations, pierDecorationNoRaycast } from "../src/components/scene/sections/beach/pierDecorationModel";
import { createPierDecorationPalette, pierSurfaceShade } from "../src/components/scene/sections/beach/pierDecorationMaterials";

const profiles = [
  { name: "reference desktop", width: 1440, height: 1000, fov: 30 },
  { name: "wide", width: 1920, height: 1080, fov: 30 },
  { name: "phone", width: 390, height: 844, fov: 43 },
  { name: "small phone", width: 360, height: 800, fov: 43 },
  { name: "tablet", width: 768, height: 1024, fov: 37 },
  { name: "short landscape", width: 844, height: 390, fov: 38 },
];
const make = () => {
  const layout = pierDecorationLayout(1.44, 30);
  return createPierDecorations(layout.rodReach, layout.hookReach);
};

function geometries(model: ReturnType<typeof make>) {
  const result: THREE.BufferGeometry[] = [];
  for (const root of [model.rod, model.hook]) root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) result.push(object.geometry);
  });
  return result;
}

test("decorations attach to the existing final posts without changing pier spacing", () => {
  const rows = boardwalkPostRows();
  assert.equal(rows.zPositions.length, 8);
  assert.deepEqual(rows.sides, [-1.27, 1.9699999999999998]);
  const post = lastBoardwalkPosts();
  assert.ok(Math.abs(post.z - (-246.845)) < 1e-9);
  assert.equal(post.topY, -2.205);
  for (const profile of profiles) {
    const layout = pierDecorationLayout(profile.width / profile.height, profile.fov);
    assert.equal(layout.rodPosition[0], post.leftX - 0.105);
    assert.equal(layout.hookPosition[0], post.rightX - 0.105);
    assert.equal(layout.rodPosition[1], post.topY);
    assert.ok(Math.abs(layout.hookPosition[2] - post.z) <= 0.121);
    assert.ok(layout.rodPosition[2] < JOURNEY.farBound);
  }
  assert.equal(pierDecorationLayout(1.44, 30).rodReach, PIER_DECORATION.rodReach);
});

test("desktop rod tip and hanging letter match the reference composition", () => {
  const layout = pierDecorationLayout(1.44, 30);
  const camera = new THREE.PerspectiveCamera(30, 1.44, 0.1, 200);
  camera.position.set(0, JOURNEY.beachY, JOURNEY.farBound);
  camera.updateMatrixWorld();
  const tip = new THREE.Vector3(...layout.rodPosition).add(new THREE.Vector3(layout.rodReach, PIER_DECORATION.rodHeight, 0)).project(camera);
  assert.ok(Math.abs((tip.x + 1) * 720 - 103) < 5);
  assert.ok(Math.abs((1 - tip.y) * 500 - 433) < 5);
  const letter = new THREE.Vector3(...layout.rodPosition).add(new THREE.Vector3(layout.rodReach, PIER_DECORATION.rodHeight - PIER_DECORATION.lineLength - 0.068, 0)).project(camera);
  assert.ok(Math.abs((letter.x + 1) * 720 - 103) < 5);
  assert.ok(Math.abs((1 - letter.y) * 500 - 587) < 5);
});

for (const profile of profiles) {
  test(`letter and lantern stay inside the final ${profile.name} viewport through their breeze`, () => {
    const layout = pierDecorationLayout(profile.width / profile.height, profile.fov);
    const model = createPierDecorations(layout.rodReach, layout.hookReach);
    const camera = new THREE.PerspectiveCamera(profile.fov, profile.width / profile.height, 0.1, 200);
    camera.position.set(0, JOURNEY.beachY, JOURNEY.farBound);
    camera.updateMatrixWorld();
    model.rod.position.fromArray(layout.rodPosition);
    model.hook.position.fromArray(layout.hookPosition);
    try {
      const letter = model.rod.getObjectByName("Pier Hanging Envelope")!;
      const lantern = model.hook.getObjectByName("Pier Candle Lantern")!;
      for (let time = 0; time < 20; time += 0.5) {
        model.animate(time, 1);
        model.rod.updateMatrixWorld(true);
        model.hook.updateMatrixWorld(true);
        for (const root of [letter, lantern]) root.traverse((object) => {
          if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
          const positions = object.geometry.getAttribute("position");
          for (let i = 0; i < positions.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
            assert.ok(Math.abs(p.x) < 0.97 && Math.abs(p.y) < 0.97, `${object.name}: ${p.toArray()}`);
            assert.ok(p.z > -1 && p.z < 1);
          }
        });
      }
      // Contact/mail landing lane remains unobstructed by the hardware.
      assert.ok(layout.rodPosition[0] < BEACH.landing[0] - 1);
      assert.ok(layout.hookPosition[0] > BEACH.landing[0] + 1);
    } finally { model.dispose(); }
  });
}

test("authored mesh geometry is deterministic, finite and inexpensive; no extra lights", () => {
  const first = make(), second = make();
  try {
    const a = geometries(first), b = geometries(second);
    assert.equal(a.length, b.length);
    assert.ok(a.length <= 20);
    let triangles = 0;
    a.forEach((geometry, i) => {
      for (const attribute of Object.values(geometry.attributes)) assert.ok([...attribute.array].every(Number.isFinite));
      assert.deepEqual(geometry.getAttribute("position").array, b[i].getAttribute("position").array);
      assert.ok(geometry.boundingSphere);
    });
    for (const root of [first.rod, first.hook]) root.traverse((object) => {
      assert.ok(!(object instanceof THREE.Light));
      if (object instanceof THREE.Mesh) triangles += (object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3;
    });
    assert.ok(triangles < 12_000, `${triangles} triangles`);
  } finally { first.dispose(); second.dispose(); }
});

function paletteSnapshot(model: ReturnType<typeof make>) {
  return model.palettes.flatMap((palette) => palette.materials.map((material) => material.color.toArray()));
}

test("white daylight and a warm lit candle restore exactly, including interrupted toggles and fog", () => {
  const model = make(), fresh = make();
  try {
    model.applyNight(0);
    const day = paletteSnapshot(model);
    assert.equal(model.palettes[0].paper.color.getHexString(), "ffffff");
    assert.equal(model.palettes[1].paper.color.getHexString(), "ffffff");
    assert.equal(model.flame.visible, false);
    assert.equal(model.glow.material.color.getHex(), 0);
    assert.notEqual(model.palettes[0].paper, model.palettes[1].paper);
    model.palettes[1].metal.opacity = 0.3;
    model.palettes[1].metal.transparent = true;
    model.palettes[1].metal.depthWrite = false;
    for (const amount of [1, 0.45, 0, 0.2, 1, 0.6, 0]) {
      model.applyNight(amount);
      fresh.applyNight(amount);
      assert.deepEqual(paletteSnapshot(model), paletteSnapshot(fresh));
      assert.equal(model.palettes[1].metal.opacity, 0.3);
      assert.equal(model.palettes[1].metal.depthWrite, false);
    }
    assert.deepEqual(paletteSnapshot(model), day);
    fresh.applyNight(1);
    assert.equal(fresh.flame.visible, true);
    assert.ok(fresh.flame.material.color.r > 2);
    assert.ok(fresh.glow.material.color.r > fresh.glow.material.color.b);
    assert.equal(fresh.glow.material.depthTest, true);
    assert.equal(fresh.glow.material.depthWrite, false);
  } finally { model.dispose(); fresh.dispose(); }
});

test("rod, grip, envelope, frame and candle use their own neutral matte finishes", () => {
  const model = make();
  try {
    const [rod, lantern] = model.palettes;
    for (const [root, name, material] of [
      [model.rod, "Pier Fishing Rod shaft Surface", rod.shaft],
      [model.rod, "Pier Fishing Rod grip Surface", rod.grip],
      [model.rod, "Pier Fishing Rod metal Surface", rod.metal],
      [model.rod, "Pier Hanging Envelope paper Surface", rod.paper],
      [model.hook, "Pier Curled Lantern Bracket metal Surface", lantern.metal],
      [model.hook, "Pier Candle Lantern metal Surface", lantern.metal],
      [model.hook, "Pier Candle Lantern wax Surface", lantern.wax],
    ] as const) {
      const mesh = root.getObjectByName(name) as THREE.Mesh;
      assert.ok(mesh, name);
      assert.equal(mesh.material, material);
      assert.equal(material.color.r, material.color.g);
      assert.equal(material.color.g, material.color.b);
      assert.ok(material.vertexColors && material.depthTest);
      assert.equal(mesh.geometry.getAttribute("uv").count, mesh.geometry.getAttribute("position").count);
    }
    assert.notEqual(rod.grip.color.getHex(), rod.shaft.color.getHex());
    assert.equal(rod.paper.map, null);
    assert.equal(lantern.wax.map, null);
    assert.equal(lantern.glass.depthWrite, false);
    assert.ok(lantern.glass.opacity > 0 && lantern.glass.opacity < 0.2);
    assert.equal(pierSurfaceShade("paper", 0), 1);
    assert.ok(pierSurfaceShade("metal", 0) < pierSurfaceShade("shaft", 0));
    model.applyNight(1);
    assert.ok(lantern.wax.color.r > lantern.metal.color.r);
    assert.ok(rod.ink.color.r < rod.shaft.color.r);
    assert.ok(lantern.ink.color.r < lantern.metal.color.r);
  } finally { model.dispose(); }
});

test("graphite grain is deterministic, grayscale and mipmapped, with no asset fetch", () => {
  const first = createPierDecorationPalette(), second = createPierDecorationPalette();
  try {
    assert.deepEqual(first.grain.image.data, second.grain.image.data);
    const data = first.grain.image.data;
    assert.ok(data instanceof Uint8Array);
    for (let i = 0; i < data.length; i += 4) {
      assert.equal(data[i], data[i + 1]);
      assert.equal(data[i + 1], data[i + 2]);
      assert.equal(data[i + 3], 255);
      assert.ok(data[i] >= 239);
    }
    assert.equal(first.grain.colorSpace, THREE.SRGBColorSpace);
    assert.equal(first.grain.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(first.grain.generateMipmaps, true);
    for (const material of [first.shaft, first.grip, first.metal]) assert.equal(material.map, first.grain);
  } finally { first.dispose(); second.dispose(); }
});

test("breeze is bounded, reversible and completely still with reduced motion", () => {
  const model = make();
  try {
    for (let time = 0; time < 80; time += 0.13) {
      const motion = pierDecorationMotion(time, 1);
      const reduced = pierDecorationMotion(time, 0);
      assert.ok(Math.abs(motion.letterSwing) <= 0.018 && Math.abs(motion.lanternSwing) <= 0.012);
      assert.ok(motion.flameScale >= 0.965 && motion.flameScale <= 1.035);
      assert.deepEqual(reduced, { letterSwing: 0, lanternSwing: 0, flameScale: 1 });
    }
    model.animate(4, 1);
    assert.notEqual(model.letterSwing.rotation.z, 0);
    model.animate(4, 0);
    assert.equal(model.letterSwing.rotation.z, 0);
    assert.equal(model.lanternSwing.rotation.z, 0);
    assert.equal(model.flame.scale.y, 0.021);
  } finally { model.dispose(); }
});

test("every decorative mesh, glass, stroke and glow ignores contact/form raycasts", () => {
  const model = make();
  try {
    for (const root of [model.rod, model.hook]) {
      root.traverse((object) => assert.equal(object.raycast, pierDecorationNoRaycast));
      root.updateMatrixWorld(true);
    }
    const ray = new THREE.Raycaster(new THREE.Vector3(-0.54, 0.74, 2), new THREE.Vector3(0, 0, -1));
    assert.deepEqual(ray.intersectObjects([model.rod, model.hook], true), []);
  } finally { model.dispose(); }
});

test("all owned geometry, materials and glow texture dispose exactly once", () => {
  const model = make();
  const resources = [...geometries(model), ...model.palettes.flatMap((palette) => palette.materials), ...model.palettes.map((palette) => palette.grain), model.glow.material, model.glow.material.map!];
  assert.equal(new Set(resources).size, resources.length);
  const counts = resources.map(() => 0);
  resources.forEach((resource, index) => resource.addEventListener("dispose", () => counts[index]++));
  model.dispose();
  model.dispose();
  assert.ok(counts.every((count) => count === 1));
});
