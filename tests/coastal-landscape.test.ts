import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BEACH, JOURNEY, cameraYAt } from "../src/components/scene/journeyConfig";
import { NIGHT_CONFIG } from "../src/components/scene/dayNight/config";
import { createCoastalDetailStrokes } from "../src/components/scene/sections/beach/coastalDetails";
import {
  COAST_LAYERS,
  SEA_HORIZON_Z,
  SEA_SIZE,
  coastLayerLayout,
  coastVisibility,
  createCoastalLandscape,
  ridgeHeightAt,
} from "../src/components/scene/sections/beach/coastalLandscapeModel";

const profiles = [
  { name: "desktop", width: 1440, height: 1000, fov: 30 },
  { name: "wide", width: 1920, height: 1080, fov: 30 },
  { name: "phone", width: 390, height: 844, fov: 43 },
  { name: "small phone", width: 320, height: 740, fov: 43 },
  { name: "tablet", width: 820, height: 1180, fov: 37 },
  { name: "landscape", width: 844, height: 390, fov: 38 },
];

test("coast is tied to the sea edge and gently appears only on the beach approach", () => {
  assert.equal(SEA_HORIZON_Z, BEACH.seaZ - SEA_SIZE.depth / 2);
  assert.equal(coastVisibility(JOURNEY.corridorStart), 0);
  assert.equal(coastVisibility(JOURNEY.journeyAnchorZ), 0);
  assert.equal(coastVisibility(JOURNEY.projectsAnchorZ), 0);
  assert.equal(coastVisibility(JOURNEY.descentStartZ), 0);
  assert.ok(coastVisibility(JOURNEY.descentStartZ - 7) > 0);
  assert.ok(coastVisibility(JOURNEY.descentStartZ - 7) < 1);
  assert.equal(coastVisibility(JOURNEY.beachZ), 1);
  assert.equal(coastVisibility(JOURNEY.farBound), 1);
});

for (const profile of profiles) {
  test(`${profile.name} coastline spans the sea, keeps a central valley, and leaves the upper sky clear`, () => {
    const camera = new THREE.PerspectiveCamera(profile.fov, profile.width / profile.height, 0.1, 770);
    for (const z of [JOURNEY.beachZ, JOURNEY.farBound]) {
      camera.position.set(0, cameraYAt(z), z);
      camera.updateMatrixWorld();
      const seaEdge = new THREE.Vector3(0, BEACH.seaY, SEA_HORIZON_Z).project(camera);
      COAST_LAYERS.forEach((layer, index) => {
        const layout = coastLayerLayout(index, profile.fov, camera.aspect);
        assert.ok(layout.z <= JOURNEY.farBound - 60, "land stays far beyond the contact boats and controls");
        const base = new THREE.Vector3(0, layout.baseY, layout.z).project(camera);
        assert.ok(base.y <= seaEdge.y, "no gap between sea edge and mountain foot");
        for (const side of [-1, 1]) {
          const edge = new THREE.Vector3(side * layout.halfWidth * 3, layout.baseY, layout.z).project(camera);
          assert.ok(Math.abs(edge.x) > 1.3, "long shoulders cover the approach, not just the final screenshot");
        }
        let highest = -Infinity;
        for (let x = -1; x <= 1; x += 0.025) {
          const height = ridgeHeightAt(layer.profile, x);
          const peak = new THREE.Vector3(x * layout.halfWidth, layout.baseY + height * layout.height, layout.z).project(camera);
          assert.ok(peak.y < 0.18, "distant mountains leave the upper sky open");
          highest = Math.max(highest, peak.y);
        }
        // Low saddles may dip behind the water on approach; the peaks must not.
        assert.ok(highest > seaEdge.y, `${layer.name} must rise above the water`);
        assert.ok(ridgeHeightAt(layer.profile, 0) < ridgeHeightAt(layer.profile, -0.65));
        assert.ok(ridgeHeightAt(layer.profile, 0) < ridgeHeightAt(layer.profile, 0.65));
      });
    }
  });
}

test("coastal pencil geometry is deterministic, inexpensive and has valid nondegenerate triangles", () => {
  const coast = createCoastalLandscape(), repeat = createCoastalLandscape();
  try {
    let bytes = 0, triangles = 0;
    coast.layers.forEach((layer, i) => {
      for (const key of ["mesh", "lines"] as const) {
        const geometry = layer[key].geometry;
        for (const [name, attribute] of Object.entries(geometry.attributes)) {
          assert.ok([...attribute.array].every(Number.isFinite));
          assert.deepEqual(attribute.array, repeat.layers[i][key].geometry.getAttribute(name).array);
          bytes += attribute.array.byteLength;
        }
      }
      const geometry = layer.mesh.geometry, indices = geometry.index!, positions = geometry.getAttribute("position");
      triangles += indices.count / 3;
      for (let n = 0; n < indices.count; n += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(n));
        const b = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(n + 1));
        const c = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(n + 2));
        assert.ok(b.sub(a).cross(c.sub(a)).z > 0, "front-facing, nonzero triangles");
      }
    });
    assert.ok(bytes < 200_000);
    assert.ok(triangles <= 3000);
    assert.equal(coast.group.children.length, 3);
  } finally { coast.dispose(); repeat.dispose(); }
});

test("small natural details are deterministic, sparse and attached to their own mountain layer", () => {
  COAST_LAYERS.forEach((layer, index) => {
    const heightAt = (x: number) => ridgeHeightAt(layer.profile, x);
    const details = createCoastalDetailStrokes(index, heightAt);
    assert.deepEqual(details, createCoastalDetailStrokes(index, heightAt));
    assert.ok(details.length < 350, "details stay within the existing six-draw coastline budget");
    const trees = new Set(details.filter((stroke) => stroke.kind === "pine").map((stroke) => stroke.anchorX));
    assert.equal(trees.size, index === 0 ? 0 : 16, "leave distant peaks bare, with four small nearer groves");
    for (const detail of details) {
      assert.ok(detail.strength > 0 && detail.strength <= 0.65);
      for (const [x, y] of [detail.from, detail.to]) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
        assert.ok(Math.abs(x) > 0.2 && Math.abs(x) < 1.1, "preserve the quiet central valley");
        assert.ok(y > 0);
        if (detail.kind !== "pine") assert.ok(y <= heightAt(x), "rock/strata marks never escape into the sky");
      }
      if (detail.kind === "pine") {
        assert.equal(typeof detail.anchorX, "number");
        assert.ok(detail.from[1] >= heightAt(detail.anchorX!) - 0.013);
      }
    }
  });
});

test("tiny conifers retain their proportions on desktop/phone without bringing the mountains closer", () => {
  const coast = createCoastalLandscape();
  try {
    for (const profile of profiles) {
      coast.layout(profile.fov, profile.width / profile.height);
      for (const index of [1, 2]) {
        const layer = COAST_LAYERS[index];
        const root = coast.layers[index].root;
        const detailWidth = coast.layers[index].pencil.uniforms.detailWidth.value;
        assert.equal(root.position.z, layer.z);
        assert.ok(root.position.z <= JOURNEY.farBound - 60);
        const details = createCoastalDetailStrokes(index, (x) => ridgeHeightAt(layer.profile, x));
        const anchors = new Set(details.filter((stroke) => stroke.kind === "pine").map((stroke) => stroke.anchorX!));
        for (const anchor of anchors) {
          const points = details.filter((stroke) => stroke.anchorX === anchor).flatMap((stroke) => [stroke.from, stroke.to]);
          const xs = points.map(([x]) => (x - anchor) * detailWidth * root.scale.x);
          const ys = points.map(([, y]) => y * root.scale.y);
          const height = Math.max(...ys) - Math.min(...ys);
          const width = Math.max(...xs) - Math.min(...xs);
          assert.ok(width / height > 0.35 && width / height < 0.65, "trees must not flatten/widen with the landscape");
          const pixels = height * profile.height / (2 * (JOURNEY.farBound - layer.z) * Math.tan(THREE.MathUtils.degToRad(profile.fov / 2)));
          assert.ok(pixels > 1 && pixels < 13, "only distant, thumbnail-sized detail");
        }
      }
    }
  } finally { coast.dispose(); }
});

test("day/night interpolation restores exact neutral paper, does not affect visibility and is instance-owned", () => {
  const coast = createCoastalLandscape(), other = createCoastalLandscape();
  try {
    coast.applyNight(0); other.applyNight(0);
    coast.setVisibility(0.45);
    const snapshot = () => coast.layers.map(({ material, pencil }) => [material.uniforms.paper.value.toArray(), material.uniforms.ink.value.toArray(), pencil.uniforms.ink.value.toArray()]);
    const day = snapshot();
    for (const amount of [1, 0.4, 0.9, 0, 0.6, 1, 0]) coast.applyNight(amount);
    assert.deepEqual(snapshot(), day);
    coast.layers.forEach(({ material }, i) => {
      assert.equal(material.uniforms.opacity.value, 0.45);
      assert.equal(material.uniforms.paper.value.getHexString(), COAST_LAYERS[i].day.slice(1));
      assert.equal(material.uniforms.paper.value.r, material.uniforms.paper.value.g);
      assert.equal(material.uniforms.paper.value.g, material.uniforms.paper.value.b);
    });
    coast.applyNight(1);
    const luminance = (color: THREE.Color) => 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    const nightSkyLuminance = luminance(new THREE.Color(NIGHT_CONFIG.background));
    coast.layers.forEach(({ material, pencil }, i) => {
      assert.equal(material.uniforms.paper.value.getHexString(), COAST_LAYERS[i].night.slice(1));
      assert.equal(other.layers[i].material.uniforms.paper.value.getHexString(), COAST_LAYERS[i].day.slice(1));
      assert.ok(luminance(material.uniforms.paper.value) < nightSkyLuminance, "night ridges are silhouettes darker than the sky");
      assert.ok(luminance(pencil.uniforms.ink.value) <= nightSkyLuminance, "night graphite never reads as illuminated mountain lights");
    });
    coast.setVisibility(0);
    assert.equal(coast.group.visible, false);
    assert.ok(coast.layers.every(({ material, pencil }) => material.uniforms.opacity.value === 0 && pencil.uniforms.opacity.value === 0));
  } finally { coast.dispose(); other.dispose(); }
});

test("backdrop ignores contact rays, preserves depth testing and disposes each owned resource once", () => {
  const coast = createCoastalLandscape();
  const hits: THREE.Intersection[] = [];
  const counts: number[] = [];
  for (const { mesh, lines, material, pencil } of coast.layers) {
    mesh.raycast(new THREE.Raycaster(), hits);
    lines.raycast(new THREE.Raycaster(), hits);
    for (const mat of [material, pencil]) {
      assert.equal(mat.depthTest, true);
      assert.equal(mat.depthWrite, false);
      assert.equal(mat.transparent, true);
      assert.equal(mat.fog, false);
      assert.equal(mat.lights, false);
    }
    for (const resource of [mesh.geometry, lines.geometry, material, pencil]) {
      const index = counts.push(0) - 1;
      resource.addEventListener("dispose", () => counts[index]++);
    }
    assert.ok(mesh.renderOrder > -48 && lines.renderOrder < 0);
  }
  assert.deepEqual(hits, []);
  coast.dispose(); coast.dispose();
  assert.ok(counts.every((count) => count === 1));
});
