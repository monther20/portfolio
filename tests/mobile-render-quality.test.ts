import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildResponsiveExperienceProfile } from "../src/components/ResponsiveExperience";
import { configureArtworkTexture } from "../src/components/scene/artworkTexture";

const phone = {
  width: 390,
  height: 844,
  devicePixelRatio: 3,
  coarsePointer: true,
  reducedMotion: false,
  hardwareConcurrency: 4,
  deviceMemory: 4,
};

test("retina phones retain sharp rendering independently of low-tier effects", () => {
  for (const hardwareConcurrency of [2, 4, 8]) {
    const profile = buildResponsiveExperienceProfile({ ...phone, hardwareConcurrency });
    assert.equal(profile.maxDpr, 2);
    assert.equal(profile.qualityTier, "low");
    assert.equal(profile.parallaxScale, 0);
    assert.equal(profile.projectFocusDistance, 3.45);
    assert.equal(profile.cameraFov, 43);
  }
});

test("phone resolution respects native density instead of always supersampling", () => {
  for (const devicePixelRatio of [1, 1.25, 1.5, 2, 3, 4]) {
    const profile = buildResponsiveExperienceProfile({ ...phone, devicePixelRatio });
    assert.equal(profile.maxDpr, Math.min(2, devicePixelRatio));
  }
});

test("rotating a phone preserves its pixel budget and sharpness", () => {
  const portrait = buildResponsiveExperienceProfile(phone);
  const landscape = buildResponsiveExperienceProfile({ ...phone, width: phone.height, height: phone.width });
  assert.equal(landscape.layout, "short-landscape");
  assert.equal(landscape.isPhone, true);
  assert.equal(landscape.maxDpr, portrait.maxDpr);
});

test("unusually large phone viewports stay within a two-million-pixel budget", () => {
  for (const [width, height] of [[590, 1200], [1200, 590]]) {
    const profile = buildResponsiveExperienceProfile({ ...phone, width, height });
    assert.equal(profile.isPhone, true);
    assert.ok(profile.maxDpr > 1.15 && profile.maxDpr < 2);
    assert.ok(width * height * profile.maxDpr ** 2 <= 2_000_000 + 1e-6);
  }
});

test("desktop and tablet budgets remain unchanged", () => {
  const desktop = { ...phone, width: 1920, height: 1080, coarsePointer: false, hardwareConcurrency: 8, deviceMemory: 8 };
  assert.equal(buildResponsiveExperienceProfile(desktop).maxDpr, 1.75);
  assert.equal(buildResponsiveExperienceProfile({ ...desktop, width: 1280 }).maxDpr, 1.4);
  assert.equal(buildResponsiveExperienceProfile({ ...desktop, deviceMemory: 4 }).maxDpr, 1.15);
  assert.equal(buildResponsiveExperienceProfile({ ...desktop, width: 820, height: 1180, coarsePointer: true }).maxDpr, 1.4);
});

test("artwork uses hardware-bounded anisotropy with stable mipmapped filtering", () => {
  for (const [supported, expected] of [[0, 1], [1, 1], [2, 2], [4, 4], [16, 8]]) {
    const texture = new THREE.Texture();
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    configureArtworkTexture(texture, supported);
    assert.equal(texture.anisotropy, expected);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(texture.magFilter, THREE.LinearFilter);
    assert.equal(texture.generateMipmaps, true);
    texture.dispose();
  }
});

test("shared artwork is not reuploaded and GLTF UV orientation is preserved", () => {
  const texture = new THREE.Texture();
  texture.flipY = false; // GLTF textures use the opposite Y convention.
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  texture.offset.set(0.2, 0.1);
  const originalSource = texture.source;
  configureArtworkTexture(texture, 16);
  const version = texture.version;
  const sourceVersion = texture.source.version;
  configureArtworkTexture(texture, 16);
  assert.equal(texture.version, version);
  assert.equal(texture.source.version, sourceVersion);
  assert.equal(texture.source, originalSource);
  assert.equal(texture.flipY, false);
  assert.equal(texture.wrapS, THREE.RepeatWrapping);
  assert.deepEqual(texture.repeat.toArray(), [2, 3]);
  assert.deepEqual(texture.offset.toArray(), [0.2, 0.1]);
  texture.dispose();
});
