import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BEACH,
  JOURNEY,
  cameraYAt,
} from "../src/components/scene/journeyConfig";
import { fogOpacityForDepth } from "../src/components/scene/fogVisibility";
import {
  createPaperBoatGeometry,
  paperBoatNoRaycast,
} from "../src/components/scene/sections/beach/paperBoatGeometry";
import {
  clonePaperBoatTexture,
  createPaperBoatMaterials,
} from "../src/components/scene/sections/beach/paperBoatMaterials";
import {
  PAPER_BOATS,
  PAPER_BOAT_LIGHTING,
  PAPER_BOAT_MOTION,
  createPaperBoatSettings,
  paperBoatForView,
  paperBoatHalfWidth,
  paperBoatPosition,
  writePaperBoatPose,
} from "../src/components/scene/sections/beach/paperBoatConfig";

const profiles = [
  { name: "desktop", width: 1440, height: 1000, fov: 30 },
  { name: "wide", width: 1920, height: 1080, fov: 30 },
  { name: "portrait phone", width: 390, height: 844, fov: 43 },
  { name: "small phone", width: 360, height: 800, fov: 43 },
  { name: "tablet", width: 768, height: 1024, fov: 37 },
  { name: "short landscape", width: 844, height: 390, fov: 38 },
];

test("folded paper has finite attributes, flat unit normals, UVs and two complete material groups", () => {
  const geometry = createPaperBoatGeometry();
  try {
    const { paper, pencil } = geometry;
    const position = paper.getAttribute("position");
    const normal = paper.getAttribute("normal");
    const uv = paper.getAttribute("uv");
    assert.equal(paper.index, null);
    assert.ok(position.count / 3 < 100);
    assert.ok(pencil.getAttribute("position").count / 2 < 100);
    for (const attribute of [
      ...Object.values(paper.attributes),
      ...Object.values(pencil.attributes),
    ]) {
      assert.ok([...attribute.array].every(Number.isFinite));
    }
    assert.equal(uv.count, position.count);
    assert.ok([...uv.array].every((value) => value >= 0 && value <= 1));
    assert.deepEqual(
      paper.groups.map((g) => g.materialIndex),
      [0, 1],
    );
    assert.equal(paper.groups[0].start, 0);
    assert.equal(paper.groups[0].count, paper.groups[1].start);
    assert.equal(paper.groups[0].count + paper.groups[1].count, position.count);
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(position, i + 1).sub(a);
      c.fromBufferAttribute(position, i + 2).sub(a);
      assert.ok(b.cross(c).length() > 1e-6, `non-degenerate triangle ${i / 3}`);
      for (let j = 0; j < 3; j++) {
        a.fromBufferAttribute(normal, i + j);
        assert.ok(Math.abs(a.length() - 1) < 1e-6);
        assert.ok(a.distanceTo(c.fromBufferAttribute(normal, i)) < 1e-6);
      }
    }
    assert.ok(
      paper.boundingBox && paper.boundingSphere && pencil.boundingSphere,
    );
    assert.ok(paper.boundingBox.min.y < 0 && paper.boundingBox.max.y > 0.65);
  } finally {
    geometry.dispose();
  }
});

test("paper folds and authored graphite are deterministic, with no zero-length strokes", () => {
  const first = createPaperBoatGeometry(),
    second = createPaperBoatGeometry();
  try {
    for (const key of ["paper", "pencil"] as const) {
      assert.deepEqual(
        first[key].getAttribute("position").array,
        second[key].getAttribute("position").array,
      );
    }
    const p = first.pencil.getAttribute("position");
    for (let i = 0; i < p.count; i += 2) {
      assert.ok(
        new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .distanceTo(new THREE.Vector3().fromBufferAttribute(p, i + 1)) >
          0.001,
      );
    }
  } finally {
    first.dispose();
    second.dispose();
  }
});

test("three boats clear fixed pier edges, plank variation, posts and the airplane lane", () => {
  assert.equal(PAPER_BOATS.length, 3);
  assert.equal(new Set(PAPER_BOATS.map((b) => b.phase)).size, 3);
  const left = BEACH.boardwalk.x - BEACH.boardwalk.width / 2;
  const right = BEACH.boardwalk.x + BEACH.boardwalk.width / 2;
  for (const boat of PAPER_BOATS) {
    const halfWidth = paperBoatHalfWidth(boat);
    assert.ok(
      boat.x < left
        ? boat.x + halfWidth < left - 0.15
        : boat.x - halfWidth > right + 0.15,
    );
    assert.ok(Math.abs(boat.x - BEACH.landing[0]) - halfWidth > 1.5);
    for (const profile of profiles) {
      const placed = paperBoatForView(
        boat,
        profile.width / profile.height,
        profile.fov,
      );
      const position = paperBoatPosition(
        placed,
        profile.width / profile.height,
        profile.fov,
      );
      const extent = paperBoatHalfWidth(placed);
      assert.ok(
        position[0] < left
          ? position[0] + extent < left - 0.15
          : position[0] - extent > right + 0.15,
        "responsive boats remain outside the fixed pier",
      );
      assert.equal(position[1], BEACH.seaY);
      assert.ok(position[2] <= boat.z);
      assert.ok(position[2] < BEACH.boardwalk.endZ - 5 - 1.72);
    }
  }
});

for (const profile of profiles) {
  test(`full boat geometry fits the final ${profile.name} contact camera (CPU projection only)`, () => {
    const geometry = createPaperBoatGeometry();
    try {
      const camera = new THREE.PerspectiveCamera(
        profile.fov,
        profile.width / profile.height,
        0.1,
        200,
      );
      camera.position.set(0, cameraYAt(JOURNEY.farBound), JOURNEY.farBound);
      camera.updateMatrixWorld();
      for (const original of PAPER_BOATS) {
        const boat = paperBoatForView(original, camera.aspect, profile.fov);
        const root = new THREE.Group();
        root.position.fromArray(
          paperBoatPosition(boat, camera.aspect, profile.fov),
        );
        const drift = new THREE.Group();
        root.add(drift);
        const body = new THREE.Object3D();
        body.scale.setScalar(boat.scale);
        drift.add(body);
        const pose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
        for (let t = 0; t < 50; t += 0.5) {
          writePaperBoatPose(pose, t, boat.phase, 1);
          drift.position.set(pose.x * boat.scale, 0, pose.z * boat.scale);
          drift.rotation.y = boat.heading + pose.yaw;
          body.position.y = pose.y * boat.scale;
          body.rotation.set(pose.pitch, 0, pose.roll);
          root.updateMatrixWorld(true);
          const positions = geometry.paper.getAttribute("position");
          let lowestPoint = Infinity;
          for (let i = 0; i < positions.count; i++) {
            const world = new THREE.Vector3()
              .fromBufferAttribute(positions, i)
              .applyMatrix4(body.matrixWorld);
            lowestPoint = Math.min(lowestPoint, world.y);
            const edge = BEACH.boardwalk.x + (boat.x < BEACH.boardwalk.x ? -1 : 1) * BEACH.boardwalk.width / 2;
            assert.ok(boat.x < edge ? world.x < edge - 0.15 : world.x > edge + 0.15,
              `${boat.id}: animated hull must clear the pier`);
            const ndc = world.project(camera);
            assert.ok(
              Math.abs(ndc.x) < 0.97 && Math.abs(ndc.y) < 0.97,
              `${boat.id}: ${ndc.toArray()}`,
            );
            assert.ok(ndc.z > -1 && ndc.z < 1);
          }
          assert.ok(
            lowestPoint < BEACH.seaY,
            "even the smallest hull stays in the water throughout its bob",
          );
        }
        assert.ok(
          fogOpacityForDepth(
            camera.position.z - root.position.z,
            new THREE.Fog("white", 5, 45),
          ) > 0.5,
        );
      }
    } finally {
      geometry.dispose();
    }
  });
}

test("portrait boats occupy separate screen pockets outside the contact signs and shore silhouettes", () => {
  const geometry = createPaperBoatGeometry();
  try {
    for (const profile of profiles.filter((p) => p.name.includes("phone"))) {
      const camera = new THREE.PerspectiveCamera(
        profile.fov,
        profile.width / profile.height,
        0.1,
        200,
      );
      camera.position.set(0, JOURNEY.beachY, JOURNEY.farBound);
      camera.updateMatrixWorld();
      for (const original of PAPER_BOATS) {
        const boat = paperBoatForView(original, camera.aspect, profile.fov);
        const root = new THREE.Object3D();
        root.position.fromArray(
          paperBoatPosition(boat, camera.aspect, profile.fov),
        );
        root.rotation.y = boat.heading;
        root.scale.setScalar(boat.scale);
        root.updateMatrixWorld();
        const p = geometry.paper.getAttribute("position");
        for (let i = 0; i < p.count; i++) {
          const screen = new THREE.Vector3()
            .fromBufferAttribute(p, i)
            .applyMatrix4(root.matrixWorld)
            .project(camera);
          const x = (screen.x + 1) / 2,
            y = (1 - screen.y) / 2;
          // Regression bounds from the neutral contact framing, not a claim
          // that CPU projection can validate alpha-textured scene occlusion.
          if (boat.id === "near-left")
            assert.ok(x < 0.22 && y > 0.69 && y < 0.77);
          if (boat.id === "far-left")
            assert.ok(x < 0.23 && y > 0.6 && y < 0.645);
          if (boat.id === "right")
            assert.ok(x > 0.84 && y > 0.65 && y < 0.705);
        }
      }
    }
  } finally {
    geometry.dispose();
  }
});

test("motion is deterministic, bounded, linearly scaled, and resets exactly under reduced motion", () => {
  const full = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    low = { ...full },
    repeated = { ...full };
  for (const boat of PAPER_BOATS) {
    for (let t = 0; t < 100; t += 0.17) {
      writePaperBoatPose(full, t, boat.phase, 1);
      writePaperBoatPose(low, t, boat.phase, 0.65);
      writePaperBoatPose(repeated, t, boat.phase, 1);
      assert.deepEqual(repeated, full);
      assert.ok(Math.abs(full.x) <= PAPER_BOAT_MOTION.driftX);
      assert.ok(Math.abs(full.z) <= PAPER_BOAT_MOTION.driftZ);
      assert.ok(Math.abs(full.yaw) <= PAPER_BOAT_MOTION.yaw);
      assert.ok(Math.abs(full.y) <= PAPER_BOAT_MOTION.bob);
      assert.ok(Math.abs(full.pitch) <= PAPER_BOAT_MOTION.pitch);
      assert.ok(Math.abs(full.roll) <= PAPER_BOAT_MOTION.roll);
      for (const key of ["x", "y", "z", "pitch", "yaw", "roll"] as const) {
        assert.equal(low[key], full[key] * 0.65);
      }
      writePaperBoatPose(full, t, boat.phase, 0);
      assert.deepEqual(full, { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 });
    }
  }
});

test("current drift stays smooth, nonzero and independently phased without loop jumps", () => {
  const before = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
  const after = { ...before };
  for (const boat of PAPER_BOATS) {
    for (let time = 0; time < 100; time += 0.1) {
      writePaperBoatPose(before, time, boat.phase, 1);
      writePaperBoatPose(after, time + 1 / 60, boat.phase, 1);
      assert.ok(Math.abs(after.x - before.x) < 0.001);
      assert.ok(Math.abs(after.z - before.z) < 0.003);
      assert.ok(Math.abs(after.yaw - before.yaw) < 0.001);
    }
    writePaperBoatPose(before, 0, boat.phase, 1);
    writePaperBoatPose(after, 6, boat.phase, 1);
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 0.15);
  }
  writePaperBoatPose(before, 3, PAPER_BOATS[0].phase, 1);
  writePaperBoatPose(after, 3, PAPER_BOATS[1].phase, 1);
  assert.notEqual(before.z, after.z);
});

function appearance(materials: ReturnType<typeof createPaperBoatMaterials>) {
  return {
    outer: materials.outer.color.toArray(),
    inner: materials.inner.color.toArray(),
    ink: materials.pencil.color.toArray(),
    outerEmission: materials.outer.emissiveIntensity,
    innerEmission: materials.inner.emissiveIntensity,
    waterGlow: materials.wash.uniforms.nightAmount.value,
  };
}

test("matte day and softly emissive night restore exactly through interrupted/repeated toggles", () => {
  const texture = new THREE.Texture();
  const materials = createPaperBoatMaterials(texture),
    fresh = createPaperBoatMaterials(texture);
  try {
    const day = appearance(materials);
    for (const amount of [1, 0.25, 0.9, 0, 1, 0.6, 0.12, 1, 0]) {
      materials.applyNight(amount);
      fresh.applyNight(amount);
      assert.deepEqual(appearance(materials), appearance(fresh));
    }
    assert.deepEqual(appearance(materials), day);
    assert.equal(materials.inner.emissiveIntensity, 0);
    fresh.applyNight(1); // Same initialization path as a late-mounted subscriber.
    assert.ok(fresh.inner.emissiveIntensity > fresh.outer.emissiveIntensity);
    assert.ok(
      fresh.inner.emissiveIntensity <= 2,
      "restrained emission without depending on bloom",
    );
    for (const surface of materials.surfaces) {
      assert.equal(surface.roughness, 1);
      assert.equal(surface.metalness, 0);
      assert.equal(surface.envMapIntensity, 0);
      assert.equal(surface.emissiveMap, texture);
    }
  } finally {
    materials.dispose();
    fresh.dispose();
    texture.dispose();
  }
});

test("materials are fog-isolated; appearance never overwrites opacity or depth settings", () => {
  const texture = new THREE.Texture();
  const near = createPaperBoatMaterials(texture),
    far = createPaperBoatMaterials(texture);
  try {
    const fade = fogOpacityForDepth(29, new THREE.Fog("white", 5, 45));
    far.outer.opacity = fade;
    far.inner.opacity = fade;
    far.pencil.opacity = 0.72 * fade;
    far.wash.opacity = fade;
    far.outer.transparent = true;
    far.outer.depthWrite = false;
    for (const amount of [1, 0.4, 0]) far.applyNight(amount);
    assert.equal(far.outer.opacity, fade);
    assert.equal(far.inner.opacity, fade);
    assert.equal(far.pencil.opacity, 0.72 * fade);
    assert.equal(far.wash.opacity, fade);
    assert.equal(far.wash.uniforms.nightAmount.value, 0);
    assert.equal(far.wash.depthWrite, false);
    assert.equal(far.wash.depthTest, true);
    assert.ok(far.wash.fragmentShader.includes("nightAmount * fade"));
    // useFogFade turns fog on: WebGLRenderer refreshes these uniforms even
    // when the custom fragment shader uses an explicit alpha fade instead.
    assert.ok(far.wash.uniforms.fogColor.value instanceof THREE.Color);
    assert.equal(typeof far.wash.uniforms.fogNear.value, "number");
    assert.equal(typeof far.wash.uniforms.fogFar.value, "number");
    assert.equal(near.wash.opacity, 1);
    assert.equal(far.outer.depthWrite, false);
    assert.equal(near.outer.opacity, 1);
    assert.equal(near.inner.opacity, 1);
    assert.equal(near.pencil.opacity, 0.72);
    assert.equal(fogOpacityForDepth(35, new THREE.Fog("white", 5, 45)), 0);
    assert.equal(fogOpacityForDepth(-1, new THREE.Fog("white", 5, 45)), 0);
  } finally {
    near.dispose();
    far.dispose();
    texture.dispose();
  }
});

test("folds, pencil strokes and water glow are non-raycastable, including recursive Html-style rays", () => {
  const geometry = createPaperBoatGeometry(),
    patch = new THREE.PlaneGeometry(4.2, 3.6),
    texture = new THREE.Texture();
  const materials = createPaperBoatMaterials(texture);
  try {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(geometry.paper, materials.surfaces);
    const lines = new THREE.LineSegments(geometry.pencil, materials.pencil);
    const wash = new THREE.Mesh(patch, materials.wash);
    wash.rotation.x = -Math.PI / 2;
    wash.position.y = 0.012;
    root.add(mesh, lines, wash);
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0.1, 3, 0.1),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(
      ray.intersectObjects(root.children, true).length > 0,
      "control ray really hits the boat",
    );
    mesh.raycast = lines.raycast = wash.raycast = paperBoatNoRaycast;
    for (const origin of [
      [0.1, 3, 0.1],
      [0, 0.2, 3],
      [-3, 0.2, 0],
    ]) {
      ray.set(
        new THREE.Vector3(...origin),
        new THREE.Vector3(...origin).negate().normalize(),
      );
      assert.deepEqual(ray.intersectObject(root, true), []);
    }
  } finally {
    geometry.dispose();
    patch.dispose();
    materials.dispose();
    texture.dispose();
  }
});

test("boat settings isolate each boat and never mutate authored defaults", () => {
  const first = createPaperBoatSettings();
  const second = createPaperBoatSettings();
  first.boats[0].x = -8;
  first.boats[0].lighting.innerEmission = 7;
  first.boats[0].lighting.washColor = "#ff0000";
  assert.equal(second.boats[0].x, PAPER_BOATS[0].x);
  assert.equal(second.boats[0].lighting.innerEmission, PAPER_BOAT_LIGHTING.innerEmission);
  assert.equal(first.boats[1].lighting.innerEmission, PAPER_BOAT_LIGHTING.innerEmission);
  assert.deepEqual(structuredClone(second), createPaperBoatSettings());
});

test("custom light settings preserve fog, day/night behavior and material identity", () => {
  const texture = new THREE.Texture();
  const materials = createPaperBoatMaterials(texture);
  const settings = createPaperBoatSettings().boats[0].lighting;
  const surfaces = [...materials.surfaces];
  try {
    settings.innerColor = "#ff0000";
    settings.outerColor = "#00ff00";
    settings.washColor = "#0000ff";
    settings.innerEmission = 4;
    settings.outerEmission = 2;
    settings.washIntensity = 1.2;
    materials.wash.opacity = 0.3;
    materials.applyNight(0.5, settings);
    assert.equal(materials.inner.emissiveIntensity, 2);
    assert.equal(materials.outer.emissiveIntensity, 1);
    assert.equal(materials.inner.emissive.getHexString(), "ff0000");
    assert.equal(materials.outer.emissive.getHexString(), "00ff00");
    assert.equal(materials.wash.uniforms.glowColor.value.getHexString(), "0000ff");
    assert.equal(materials.wash.uniforms.intensity.value, 1.2);
    assert.equal(materials.wash.opacity, 0.3);
    settings.enabled = false;
    materials.applyNight(1, settings);
    assert.equal(materials.inner.emissiveIntensity, 0);
    assert.equal(materials.outer.emissiveIntensity, 0);
    assert.equal(materials.wash.uniforms.nightAmount.value, 0);
    settings.enabled = true;
    materials.applyNight(1, settings);
    assert.equal(materials.inner.emissiveIntensity, 4);
    materials.applyNight(0, settings);
    assert.equal(materials.inner.emissiveIntensity, 0);
    assert.equal(materials.wash.uniforms.nightAmount.value, 0);
    assert.ok(materials.surfaces.every((surface, index) => surface === surfaces[index]));
  } finally {
    materials.dispose();
    texture.dispose();
  }
});

test("owned resources dispose once without changing or disposing the cached paper texture", () => {
  const source = new THREE.Texture();
  source.repeat.set(0.7, 0.9);
  const original = {
    repeat: source.repeat.toArray(),
    colorSpace: source.colorSpace,
    wrapS: source.wrapS,
    version: source.version,
  };
  let sourceDisposals = 0;
  source.addEventListener("dispose", () => sourceDisposals++);
  const clone = clonePaperBoatTexture(source),
    geometry = createPaperBoatGeometry();
  const materials = PAPER_BOATS.map(() => createPaperBoatMaterials(clone));
  const owned = [
    clone,
    geometry.paper,
    geometry.pencil,
    ...materials.flatMap((m) => [...m.surfaces, m.pencil, m.wash]),
  ];
  const counts = owned.map(() => 0);
  owned.forEach((resource, index) =>
    resource.addEventListener("dispose", () => counts[index]++),
  );
  assert.notEqual(clone, source);
  assert.equal(clone.source, source.source);
  assert.deepEqual(
    {
      repeat: source.repeat.toArray(),
      colorSpace: source.colorSpace,
      wrapS: source.wrapS,
      version: source.version,
    },
    original,
  );
  materials.forEach((m) => m.dispose());
  geometry.dispose();
  clone.dispose();
  assert.ok(counts.every((count) => count === 1));
  assert.equal(sourceDisposals, 0);
  source.dispose();
});
