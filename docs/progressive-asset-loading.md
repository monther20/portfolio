# Progressive asset-loading optimization

## Goal

Make rapid movement between portfolio sections remain smooth on slower devices and connections without loading every journey asset during the initial room experience.

The implementation keeps the existing Next.js, React Three Fiber, Drei, Three.js, staged journey, camera bounds, and section-navigation architecture. It does not introduce a second scene or replace the journey system.

## Investigation and root causes

The investigation used the `gpt-6-astra` model for a read-only architecture audit, followed by local asset inspection, TypeScript/tests/builds, Chrome CPU profiling, shader instrumentation, delayed-network tests, and GPU-backed browser screenshots.

### Large artwork groups

The main later-section image groups were:

- Skills: 16 sketch/paint textures, with several painted files around 230–254KB and decoded dimensions near 880×1790.
- Projects: four 1024×2048 project images. Their compressed files are moderate, but each image expands substantially during decode and GPU upload.
- Journey: three milestone images totalling about 914KB.
- Contact: large mail and GitHub sign images.
- Corridor/window: profile, web/mobile artwork, table, picture frame, and window illustrations.

Compressed transfer size was only part of the cost. The original targeted images represent about 47.1 million pixels, approximately 179.7MiB as plain RGBA or 239.6MiB including a full mip chain.

### Heavy 3D resources

`public/models/cabinet-3.meshopt.glb` is only about 386KB over the network, but it contains five embedded 1024×1024 images. Loading and parsing the GLB is therefore not the complete cost; the embedded maps also require decoding and GPU upload.

The paper-airplane model is small, but it is part of the window/flight gate and must use the same Drei cache as the mounted actor to avoid duplicate parsed models.

### Door-opening shader stall

CPU profiling showed that loading files was not the only cause of the visible freeze. Corridor lights were mounted only after the door opened. Adding four point lights changed the shader configuration for existing standard room materials and forced many programs to recompile.

One profile attributed approximately 1.44 seconds to `getProgramInfoLog` during door opening.

### First-visible shader variants

Objects hidden by fog use transparent materials while distant, then restore their original opaque/depth-writing state near the camera. The first visible transition created additional shader variants. Instrumentation found repeated approximately 145–160ms shader stalls around the cabinet and Contact section while the camera was moving.

### Existing staged loading

The journey already mounted scenes in order and prevented the camera from entering an uncommitted section. This was retained. The important change was redefining a stage baseline as:

- lightweight preview textures are available;
- required model resources are available;
- baseline GPU uploads are prepared; and
- imminent shader variants are prepared.

Full-resolution artwork is now an optional quality promotion and no longer blocks stage readiness.

## Implementation

### 1. Generated lightweight previews

Added 36 preview WebPs under:

```text
public/textures/previews/
```

The folder mirrors the existing texture categories, such as:

```text
public/textures/previews/skills/
public/textures/previews/projects/
public/textures/previews/journey/milestones/
public/textures/previews/corridor/
public/textures/previews/contact/
```

Preview rules:

- maximum long edge: 256px;
- original aspect ratio retained;
- alpha/transparency retained;
- WebP output;
- no inactive LinkedIn artwork is included;
- total preview size: 201,092 bytes, approximately 196.4KiB.

The corresponding originals total 4,616,478 bytes, approximately 4.40MiB.

### 2. Added an asset manifest

Created:

```text
src/components/scene/progressiveAssetManifest.ts
```

Each descriptor contains:

- original URL;
- preview URL;
- original width and height;
- owning portfolio section; and
- owning journey load stage.

The original dimensions are authoritative for geometry. A texture promotion therefore never changes plane dimensions, hit areas, UV layout, wrapped-frame dimensions, or project-paper subdivisions.

This is especially important for pairs whose sketch and painted images do not share the same dimensions, such as the Three.js skill artwork.

### 3. Added a shared, bounded original-texture queue

Created:

```text
src/components/scene/progressiveTextureLoading.ts
```

Behavior:

- one shared task per original URL;
- no duplicate decoded `THREE.Texture` for progressive originals;
- maximum two concurrent original-image loads;
- maximum one concurrent load when Save-Data is enabled or the connection reports 2G;
- destination intent has priority over ordinary lookahead work;
- queued speculative work pauses while the document is hidden;
- image decode is awaited where supported;
- failed originals remain non-fatal because the preview stays visible.

Only assets in a requested stage or an explicitly indicated destination are queued. The complete journey is not loaded during the initial room view.

### 4. Added preview-first texture handling and GPU upload scheduling

Created:

```text
src/components/scene/ProgressiveArtwork.tsx
```

`useProgressiveArtwork()` performs the following:

1. Loads the preview through the normal R3F loader/Suspense baseline.
2. Requests the original through the shared queue after the component commits.
3. Configures colour space, mipmaps, filtering, and bounded anisotropy.
4. Uploads decoded originals one at a time during idle opportunities.
5. Delays optional high-resolution uploads while navigation or inertial movement is active.
6. Publishes the original only after its GPU preparation finishes.

Preview and imminent model texture preparation can register with the active stage through:

```text
src/components/scene/journeyStagePreparation.ts
```

This lets the existing safe camera bound wait for required baseline GPU work without waiting for optional high-resolution artwork.

### 5. Crossfaded quality without replacing scene objects

Updated:

```text
src/components/scene/PaintSprite.tsx
src/components/scene/WrappedImageMesh.tsx
src/components/scene/sections/ProjectPaperMesh.tsx
```

The shaders now contain preview and original samplers plus a separate quality blend.

Important properties:

- mesh, geometry, material, position, hit targets, and interaction state remain mounted;
- preview and original textures crossfade in place;
- quality promotion does not restart the existing pencil-to-painted reveal;
- project bending, flutter, focus, day/night tint, fog, depth behavior, and hover state remain intact;
- reduced-motion users receive an immediate promotion after preparation;
- an original-load failure leaves the preview interactive and visible.

### 6. Predictive section and model preloading

Updated:

```text
src/components/scene/JourneySectionNav.tsx
src/components/scene/JourneyScene.tsx
```

Preloading now reacts to:

- pointer hover;
- keyboard focus;
- touch/pointer down;
- section click; and
- the existing camera-position stage lookahead.

Navigation intent prioritizes destination images immediately. Journey-stage module imports are also discovered concurrently instead of waiting for each earlier Suspense stage to finish before discovering the next chunk.

Cabinet and airplane GLBs use `useGLTF.preload()`, which shares Drei's exact parsed-result cache with the mounted components. This avoids a parallel GLTF loader and duplicate parsing/downloads.

No low-quality duplicate GLB was added. Swapping entire models would duplicate geometry/state and could interrupt airplane animation. The implementation instead preloads the existing optimized models and prepares their expensive maps.

### 7. Prepared stages before camera travel

Updated:

```text
src/components/scene/JourneyAssetStage.tsx
src/components/scene/ScrollCameraManager.tsx
```

A stage now:

1. commits its lightweight baseline;
2. waits for registered baseline texture/model-map preparation;
3. compiles shaders asynchronously;
4. prepares Three.js program uniform/attribute inspection one program per frame;
5. compiles both distant transparent and near opaque fog-fade variants; and
6. opens the existing safe camera bound only after that work is ready.

Optional original-artwork uploads remain paused for the full queued navigation and inertial movement, not only for the initiating click.

This intentionally performs unavoidable shader preparation while the camera is stationary behind an existing safe bound rather than freezing an active flight animation.

### 8. Stabilized the door-opening light count

Updated:

```text
src/components/scene/CorridorScene.tsx
src/components/scene/corridor/CorridorDetails.tsx
```

`CorridorLights` now mounts inside the entrance loading boundary instead of being introduced at door-open time. This adds only the two small generated fixture GLBs to entrance-critical loading, while keeping the point-light count stable before interaction.

A follow-up profile reduced the measured door-opening `getProgramInfoLog` hotspot from approximately 1.44 seconds to approximately 59ms, about a 96% reduction for that measured shader-blocking hotspot.

### 9. Warmed cabinet maps and removed redundant texture invalidation

Updated:

```text
src/components/scene/corridor/CorridorCabinet.tsx
src/components/scene/ExteriorRoof.tsx
```

The cabinet's unique embedded texture maps are deduplicated by object identity and prepared individually before the cabinet becomes visible.

`ExteriorRoof` no longer sets `needsUpdate = true` on every React render. Its source and owned clone are configured idempotently, and the owned clone is disposed on cleanup.

## Loading behavior after the change

### Initial room

- Does not load every journey preview or original.
- Loads the entrance assets, avatar atlas, and corridor fixtures required to keep door-opening shaders stable.

### Opening the door

- Mounts the first requested journey baseline using small previews.
- Starts only that stage's originals through the bounded queue.
- Does not wait for original artwork before making the section usable.

### Normal scrolling

- The existing 48-world-unit lookahead requests the next stage.
- Preview, model, GPU, and shader preparation happen before the camera reaches its safe bound.
- Full-resolution promotion happens later without replacing geometry.

### Direct section navigation

- Hover/focus/touch starts destination artwork and model preloading.
- Required code chunks are discovered together.
- Ordered stage safety remains intact.
- The camera starts only after baseline GPU/shader work is ready.
- Original artwork can still be pending; the destination renders with previews.

## Files added

```text
public/textures/previews/**
src/components/scene/ProgressiveArtwork.tsx
src/components/scene/journeyStagePreparation.ts
src/components/scene/progressiveAssetManifest.ts
src/components/scene/progressiveTextureLoading.ts
tests/progressive-assets.test.ts
```

## Files updated

```text
src/components/scene/CorridorScene.tsx
src/components/scene/ExteriorRoof.tsx
src/components/scene/JourneyAssetStage.tsx
src/components/scene/JourneyScene.tsx
src/components/scene/JourneySectionNav.tsx
src/components/scene/PaintSprite.tsx
src/components/scene/ScrollCameraManager.tsx
src/components/scene/WrappedImageMesh.tsx
src/components/scene/corridor/CorridorCabinet.tsx
src/components/scene/corridor/CorridorDetails.tsx
src/components/scene/sections/ProjectPaperMesh.tsx
```

## Automated validation

Commands:

```sh
./node_modules/.bin/tsc --noEmit --incremental false --pretty false
bun test
bun run build
```

Results:

- TypeScript: passed.
- Tests: 89 passed, 0 failed.
- Next.js 16 production build and static generation: passed.
- `git diff --check`: passed.

The new asset tests verify:

- unique source and preview URLs;
- every source and preview file exists;
- per-preview size is at most 24KiB;
- combined previews remain under 256KiB;
- inactive assets are not in the active manifest; and
- canonical painted geometry dimensions remain stable.

## GPU-backed browser validation

A production build was tested in native-GPU headless Chrome at 1440×900. Progressive originals were artificially delayed by eight seconds, then the portfolio was opened and navigated directly to Contact.

Observed behavior:

- Contact was reached while its original sign textures were still delayed.
- All 36 active previews rendered successfully.
- The preview and final screenshots had identical geometry and framing.
- No browser console or page errors occurred.
- No frame over 50ms was observed while the camera was moving.
- Measured p95 frame interval was approximately 6.2ms in that run.
- Remaining long shader preparation occurred while the camera was stationary behind the stage bound.
- The inactive LinkedIn texture was not requested.

These measurements are an instrumented local scenario, not a guarantee for every phone, browser, GPU, or network.

## Adding another progressive asset

1. Generate a matching WebP preview with a maximum 256px long edge under `public/textures/previews/`, preserving the texture-category path.
2. Add the original URL, dimensions, section, and stage to `progressiveAssetManifest.ts`.
3. Render it through `PaintSprite`, `WrappedImageMesh`, `ProjectPaperMesh`, or `useProgressiveArtwork()`.
4. Keep geometry dimensions based on descriptor metadata, not whichever texture finishes first.
5. Run TypeScript, tests, build, and a throttled visual check.

# How much faster is the portfolio?

There is no honest single overall percentage because total speed depends on the visitor's network, CPU, GPU, viewport, cache state, and chosen navigation path. The measured improvements for the optimized paths are:

- **Targeted baseline network payload:** 4,616,478 bytes of originals versus 201,092 bytes of previews, a **95.6% reduction** before optional quality promotion.
- **Targeted baseline decoded/mipmapped pixel data:** approximately 239.6MiB for the originals versus approximately 6.94MiB for the previews, a **97.1% reduction** in the lightweight baseline.
- **Measured door-opening shader hotspot:** approximately 1.44s reduced to approximately 59ms, about a **96% reduction** for that specific blocking operation.
- **Fast-navigation test:** earlier profiling found approximately 145–160ms first-visible stalls while the camera moved; the final delayed-original test observed **no frame over 50ms during camera movement**, with a p95 frame interval of approximately **6.2ms**.

The originals still eventually provide full visual quality, so the largest gain is not permanently deleting their cost. The gain comes from replacing a large burst of network, decode, upload, and shader work with a roughly 200KiB preview baseline, bounded background promotion, and preparation before movement. In practice, this changes rapid navigation from visible mid-flight freezes into either uninterrupted preview rendering or brief preparation while the camera is still safely stationary.
