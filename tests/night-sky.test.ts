import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { CORRIDOR, JOURNEY, cameraYAt } from "../src/components/scene/journeyConfig";
import { NIGHT_STARS } from "../src/components/scene/dayNight/config";
import {
  METEOR_PATHS,
  METEOR_PERIOD,
  NIGHT_SKY_DEPTH,
  meteorSample,
  nightSkyLayout,
  nightSkyOpacity,
} from "../src/components/scene/dayNight/nightSkyLayout";
import {
  createMeteorMaterial,
  createMoonMaterial,
  createNightStarGeometry,
  createNightStarMaterial,
} from "../src/components/scene/dayNight/nightSkyModel";

const profiles = [
  { name: "desktop", width: 1440, height: 1000, fov: 30 },
  { name: "wide", width: 1920, height: 1080, fov: 30 },
  { name: "phone", width: 390, height: 844, fov: 43 },
  { name: "small phone", width: 320, height: 740, fov: 43 },
  { name: "tablet", width: 820, height: 1180, fov: 37 },
  { name: "short landscape", width: 844, height: 390, fov: 38 },
];

test("richer stars are seeded, finite, bounded and still use a tiny point buffer", () => {
  const geometry = createNightStarGeometry(NIGHT_STARS.count);
  const repeat = createNightStarGeometry(NIGHT_STARS.count);
  const low = createNightStarGeometry(NIGHT_STARS.lowCount);
  try {
    assert.ok(NIGHT_STARS.count > 640 && NIGHT_STARS.count < 1000);
    assert.ok(NIGHT_STARS.lowCount > 280 && NIGHT_STARS.lowCount < 600);
    let bytes = 0;
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      assert.deepEqual(attribute.array, repeat.getAttribute(name).array);
      assert.ok([...attribute.array].every(Number.isFinite));
      assert.deepEqual(low.getAttribute(name).array, attribute.array.slice(0, NIGHT_STARS.lowCount * attribute.itemSize));
      bytes += attribute.array.byteLength;
    }
    assert.ok(bytes < 40_000);
    const position = geometry.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const point = new Vector3().fromBufferAttribute(position, index);
      assert.ok(Math.abs(point.length() - NIGHT_STARS.radius) < 0.00002);
      assert.ok(point.y > -NIGHT_STARS.radius * 0.075);
    }
    const glints = [...geometry.getAttribute("glint").array].filter(Boolean).length;
    assert.ok(glints > 50 && glints < 150, "glints remain the minority of the fine dust");
  } finally {
    geometry.dispose(); repeat.dispose(); low.dispose();
  }
});

for (const profile of profiles) {
  test(`moon stays in the upper sky and stars fill the ${profile.name} journey/contact view`, () => {
    const aspect = profile.width / profile.height;
    const camera = new PerspectiveCamera(profile.fov, aspect, 0.1, 500);
    const layout = nightSkyLayout(profile.fov, aspect);
    const geometry = createNightStarGeometry(profile.width < 600 ? NIGHT_STARS.lowCount : NIGHT_STARS.count);
    try {
      for (const z of [JOURNEY.journeyAnchorZ, JOURNEY.skillsAnchorZ, JOURNEY.projectsAnchorZ, JOURNEY.farBound]) {
        camera.position.set(0, cameraYAt(z), z);
        for (const bank of [-0.105, 0, 0.105]) {
          camera.rotation.set(0.056, 0.018, bank);
          camera.updateMatrixWorld();
          // Include the full transparent halo quad, not just the crescent.
          for (const x of [-1, 1]) for (const y of [-1, 1]) {
            const corner = new Vector3(layout.moonX + x * layout.moonSize, layout.moonY + y * layout.moonSize, -NIGHT_SKY_DEPTH)
              .add(camera.position).project(camera);
            assert.ok(Math.abs(corner.x) < 1 && corner.y > 0.05 && corner.y < 1, `${profile.name}: ${corner.toArray()}`);
          }
        }
        camera.rotation.set(0, 0, 0);
        camera.updateMatrixWorld();
        let upperStars = 0, horizonStars = 0;
        const positions = geometry.getAttribute("position");
        for (let index = 0; index < positions.count; index++) {
          const star = new Vector3().fromBufferAttribute(positions, index).add(camera.position).project(camera);
          if (Math.abs(star.x) >= 1 || star.z >= 1) continue;
          if (star.y > 0 && star.y < 1) upperStars++;
          if (star.y > -0.4 && star.y <= 0.05) horizonStars++;
        }
        const lowTier = profile.width < 600;
        assert.ok(upperStars >= (lowTier ? 25 : 60), `${profile.name}: only ${upperStars} stars in the upper sky`);
        assert.ok(horizonStars >= (lowTier ? 15 : 40), `${profile.name}: only ${horizonStars} stars near the sea horizon`);
        assert.equal(nightSkyOpacity(z, 1), 1);
      }
    } finally { geometry.dispose(); }
  });
}

test("night sky is absent during daylight/inside the corridor and reverses without drift", () => {
  for (const z of [JOURNEY.corridorStart, CORRIDOR.endWallZ + 4, JOURNEY.journeyAnchorZ, JOURNEY.farBound]) {
    assert.equal(nightSkyOpacity(z, 0), 0);
  }
  assert.equal(nightSkyOpacity(CORRIDOR.endWallZ + 4, 1), 0);
  assert.ok(nightSkyOpacity(CORRIDOR.endWallZ, 1) > 0);
  assert.ok(nightSkyOpacity(CORRIDOR.endWallZ, 1) < 1);
  for (const amount of [1, 0.6, 0, 0.4, 1, 0]) {
    assert.equal(nightSkyOpacity(JOURNEY.farBound, amount), amount);
  }
});

test("meteors are occasional, deterministic, softly faded and absent with reduced motion", () => {
  let activeSamples = 0;
  for (let t = 0; t < METEOR_PERIOD; t += 0.025) {
    let active = 0;
    METEOR_PATHS.forEach((path, index) => {
      const sample = meteorSample(index, t);
      assert.deepEqual(sample, meteorSample(index, t));
      assert.ok(Object.values(sample).every(Number.isFinite));
      assert.ok(sample.opacity >= 0 && sample.opacity <= 1);
      assert.ok(Math.abs(sample.x) < 0.95 && sample.y > 0.3 && sample.y < 0.95);
      assert.equal(meteorSample(index, t, true).opacity, 0);
      assert.ok(Math.abs(sample.opacity - meteorSample(index, t + METEOR_PERIOD).opacity) < 1e-12);
      if (sample.opacity > 0) active++;
      for (const boundary of [path.delay, path.delay + path.duration]) {
        assert.equal(meteorSample(index, boundary).opacity, 0);
        assert.ok(meteorSample(index, boundary + 0.0001).opacity < 0.001);
        assert.ok(meteorSample(index, boundary - 0.0001).opacity < 0.001);
      }
    });
    assert.ok(active <= 1, "at most one quiet trail in view, not a meteor shower");
    if (active) activeSamples++;
  }
  assert.ok(activeSamples > 100 && activeSamples < 160);
});

test("sky materials own their uniforms, do not write depth, and need no fog, lighting or textures", () => {
  for (const create of [createNightStarMaterial, createMoonMaterial, createMeteorMaterial]) {
    const material = create(), other = create();
    try {
      assert.equal(material.uniforms.opacity.value, 0);
      material.uniforms.opacity.value = 0.7;
      assert.equal(other.uniforms.opacity.value, 0);
      assert.equal(material.transparent, true);
      assert.equal(material.depthWrite, false);
      assert.equal(material.depthTest, true);
      assert.equal(material.toneMapped, false);
      assert.equal(material.fog, false);
      assert.equal(material.lights, false);
      assert.ok(!material.fragmentShader.includes("sampler2D"));
    } finally { material.dispose(); other.dispose(); }
  }
});
