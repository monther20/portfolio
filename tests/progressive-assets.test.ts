import { test } from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";

import {
  PROGRESSIVE_ARTWORK_ASSETS,
  getProgressiveArtworkAsset,
  progressiveAssetsForSection,
  progressiveAssetsForStage,
} from "../src/components/scene/progressiveAssetManifest";

const publicPath = (url: string) => join(process.cwd(), "public", url);

test("progressive artwork has unique, lightweight previews", () => {
  const sources = new Set<string>();
  const previews = new Set<string>();
  let previewBytes = 0;

  for (const asset of PROGRESSIVE_ARTWORK_ASSETS) {
    assert.ok(!sources.has(asset.src), `duplicate source: ${asset.src}`);
    assert.ok(!previews.has(asset.preview), `duplicate preview: ${asset.preview}`);
    sources.add(asset.src);
    previews.add(asset.preview);

    assert.equal(
      asset.preview,
      asset.src.replace("/textures/", "/textures/previews/"),
    );
    assert.ok(asset.width > 0 && asset.height > 0);

    const sourceSize = statSync(publicPath(asset.src)).size;
    const previewSize = statSync(publicPath(asset.preview)).size;
    previewBytes += previewSize;
    assert.ok(previewSize < sourceSize, asset.preview);
    assert.ok(previewSize <= 24 * 1024, `${asset.preview} is too large`);
    assert.equal(getProgressiveArtworkAsset(asset.src), asset);
  }

  assert.equal(PROGRESSIVE_ARTWORK_ASSETS.length, 36);
  assert.ok(previewBytes <= 256 * 1024);
});

test("only requested journey groups expose progressive work", () => {
  assert.equal(progressiveAssetsForStage("flight").length, 0);
  assert.equal(progressiveAssetsForStage("journey").length, 3);
  assert.equal(progressiveAssetsForStage("skills").length, 16);
  assert.equal(progressiveAssetsForStage("projects").length, 5);
  assert.equal(progressiveAssetsForSection("contact").length, 2);
});

test("canonical dimensions preserve painted project and skill geometry", () => {
  const project = getProgressiveArtworkAsset(
    "/textures/projects/reachlet_painted.webp",
  );
  const threePainted = getProgressiveArtworkAsset(
    "/textures/skills/threejsduzybalon_painted.webp",
  );
  const threeSketch = getProgressiveArtworkAsset(
    "/textures/skills/threejsduzybalon.webp",
  );

  assert.equal(project!.width / project!.height, 0.5);
  assert.equal(threePainted!.width / threePainted!.height, 0.5);
  assert.equal(threeSketch!.width / threeSketch!.height, 1);
});
