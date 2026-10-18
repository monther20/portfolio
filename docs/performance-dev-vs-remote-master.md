# Performance comparison: dev versus remote master

Reviewed on **16 October 2026** against the freshly fetched remote `master`.

`dev` makes later sections usable with smaller previews, prepares GPU resources
before travel, and reduces invisible artwork rendering. It also adds animated
room content and moves corridor lighting into startup, so the entrance has more
asset work than `master`. There is no verified single percentage by which the
entire branch is faster.

## 1. Exact comparison and evidence

| Item | Revision or state |
| --- | --- |
| Repository | `https://github.com/monther20/portfolio.git` |
| Remote baseline | `origin/master` at `ae2233728dd722185f1589179dcc5663c0722f19` |
| Remote baseline commit | `Merge pull request #18 from monther20/dev`, 23 September 2026 |
| Local branch | `dev` |
| Committed dev revision | `6bcf5d3418215a3285c9c1b70c9b85980236dd6a` |
| Local dev commit | `feat: polish portfolio journey and add animated room details`, 16 October 2026 |
| Remote dev tracking revision at review | `b9c487bbb642ee600b0941cf77dcdae811d83e26` |
| Additional comparison scope | Current uncommitted performance changes, including new files |

The baseline was refreshed using:

```sh
git fetch origin master:refs/remotes/origin/master
git diff origin/master
git log --oneline origin/master..HEAD
git status --short
```

This compares the two endpoint trees directly. It is not a comparison with a
possibly stale local `master`, and it does not use a merge-base-only diff.
Untracked implementation files were inspected separately because `git diff`
does not include them.

Evidence is separated below:

- **Verified source/asset comparison:** remote master versus the current checkout.
- **Previously recorded profiling:** earlier implementation notes, explicitly attributed.
- **Measured recent dev pass:** committed dev plus the same diagnostic probe versus
  the latest optimized dev working tree. These samples do **not** benchmark master.

The main committed work beyond master is `b9c487b` (`perf: add progressive asset
loading`). Commit `6bcf5d3` adds room details and their animation controls alongside
portfolio improvements. `a79b86e` changes keyboard controls; it is a functional
fix, without a demonstrated rendering-speed gain.

## 2. Performance features already present on master

These were verified against the remote tree and must not be counted as new dev
optimizations:

| Existing feature | Comparison result |
| --- | --- |
| Seven ordered journey stages, scene lazy loading, Suspense/error boundaries, safe camera bounds | Already present; dev extends preparation and scheduling |
| Requesting the next stage 48 world units ahead | Existing threshold retained |
| Avatar wave atlas, UV animation, and entrance texture preupload | `AnimatedAvatar.tsx` is unchanged |
| Phone/tablet/desktop quality tiers, DPR limits, phone pixel budget, reduced motion | `ResponsiveExperience.tsx` is unchanged |
| Artwork mipmaps, hardware-bounded filtering, and idempotent texture configuration | `artworkTexture.ts` is unchanged |
| Compressed cabinet, furniture, door, and lantern models | Existing runtime model files retained |
| Lower-tier omission of HDR and expensive night effects | Existing day/night lighting behavior retained |
| Journey progress throttling and shared interaction events | Existing mechanisms reused |

`package.json` and `bun.lock` have no changes relative to master. This comparison
does not include an engine/library upgrade or a proven JavaScript-bundle reduction.

## 3. New committed loading and resource scheduling

### 3.1 Lightweight artwork baselines

On master, the targeted artwork loads at full resolution before its component
finishes suspending. Dev adds **36 previews**, with a maximum long edge of 256 px.
The preview establishes readiness; the original downloads, decodes, uploads, and
promotes independently afterward.

Verified file-byte inventory:

| Stage | Images | Master originals | Dev previews |
| --- | ---: | ---: | ---: |
| Far corridor | 7 | 776,226 B | 39,560 B |
| Window | 3 | 328,968 B | 10,530 B |
| Journey | 3 | 913,708 B | 27,812 B |
| Skills | 16 | 1,739,892 B | 86,128 B |
| Projects | 5 | 570,742 B | 19,078 B |
| Contact | 2 | 286,942 B | 17,984 B |
| **Total** | **36** | **4,616,478 B** | **201,092 B** |

The targeted lightweight baseline is **95.64% smaller** by file bytes. This is
not a 95.64% reduction in the entire website or its entrance payload. Flight
clouds are not in this preview manifest. The largest preview is 20,322 B.

All 36 corresponding originals are byte-identical to remote master. All manifest
dimensions match the actual images. Geometry uses the final image dimensions,
so preview promotion preserves artwork size, framing, and hit targets.

The originals contain 47,115,395 pixels; previews contain 1,364,736. Estimated
RGBA data falls from 179.73 MiB to 5.21 MiB for this baseline, or approximately
239.64 MiB to 6.94 MiB with full mip chains. These are pixel-based estimates,
not measured GPU memory or a permanent total-memory reduction.

**Tradeoffs:** originals still load for final quality. If every targeted original
loads, previews add 201,092 B of file payload and 36 resources rather than remove
the original transfer. Both resolutions can remain cached/resident. The artwork
shaders now blend preview/original sketch and paint samplers: up to four texture
samples instead of the previous two on their front artwork path. This favors
loading responsiveness and is not an unconditional steady-state GPU saving.

Sources: [manifest](../src/components/scene/progressiveAssetManifest.ts),
[artwork loading](../src/components/scene/ProgressiveArtwork.tsx),
[PaintSprite](../src/components/scene/PaintSprite.tsx),
[WrappedImageMesh](../src/components/scene/WrappedImageMesh.tsx), and
[ProjectPaperMesh](../src/components/scene/sections/ProjectPaperMesh.tsx).

### 3.2 Bounded original downloads and navigation priorities

| Change from master | Current behavior and purpose |
| --- | --- |
| Shared original-texture scheduler | One cached promise per source; priority followed by FIFO order avoids duplicate original loading |
| Bounded concurrency | Normally two original loads; one when `saveData` is enabled or the connection reports `2g` |
| Explicit image decoding | Attempts `image.decode()` before resolving the original texture |
| Hidden-page scheduling | Pauses new original requests while the document is hidden; resumes when visible |
| Destination intent prefetch | Hover, keyboard focus, pointer-down, and click preload destination previews; destinations beyond About also preload cabinet/airplane models |
| Concurrent discovery of requested stages | Discovers requested code chunks and previews together, avoiding discovery waiting on preceding Suspense commits; actual mounting stays ordered |
| Direct-jump priority | Pauses queued originals while preview/model baselines prepare, then prioritizes the clicked destination's originals |
| Cancellation and lock cleanup | Manual input, canceled navigation, interaction locking, disabling, and cleanup resume/reset optional scheduling appropriately |

Preloading uses the same scalar R3F texture keys and Drei GLTF cache as mounted
components. It does not intentionally create a second decoded model or preview.
Already active original requests are allowed to finish; pausing does not abort
them. Failed original requests leave the preview visible, without automatic retry.

Sources: [download scheduler](../src/components/scene/progressiveTextureLoading.ts),
[JourneyScene](../src/components/scene/JourneyScene.tsx),
[section navigation](../src/components/scene/JourneySectionNav.tsx), and
[camera manager](../src/components/scene/ScrollCameraManager.tsx).

### 3.3 GPU uploads and stage readiness

Master's readiness signal waited for two animation frames after Suspense completed.
Dev expands readiness to include registered baseline GPU preparations and shader
setup before opening the existing safe travel bound.

| New preparation | Behavior |
| --- | --- |
| Cached texture preparation | Per-renderer/per-texture promises deduplicate `gl.initTexture()` work |
| Serialized upload scheduling | Separate serialized chains handle imminent baseline textures and optional originals |
| Idle scheduling | Uses `requestIdleCallback` with a 500 ms timeout, or a 32 ms timer fallback |
| Motion quiet period | Optional original uploads wait until three seconds after the latest journey interaction |
| Continued-motion reporting | Active navigation/inertia renews interaction activity every 0.5 seconds so optional uploads stay deferred during travel |
| Stage-local preparation registry | Readiness waits for registered preview uploads, cabinet maps, and project reverse-paper texture preparation |
| Cabinet texture deduplication | Unique embedded maps are collected by identity and prepared individually before visibility |

Baseline preparations bypass the interaction quiet period so a destination can
become usable. The two chains serialize their own work; the implementation does
not guarantee exactly one upload globally per animation frame. Continuous motion
can keep the artwork at preview quality longer. This schedules unavoidable work;
it does not eliminate all decode/upload costs or provide memory eviction.

Sources: [ProgressiveArtwork](../src/components/scene/ProgressiveArtwork.tsx),
[preparation context](../src/components/scene/journeyStagePreparation.ts),
[JourneyAssetStage](../src/components/scene/JourneyAssetStage.tsx), and
[CorridorCabinet](../src/components/scene/corridor/CorridorCabinet.tsx).

### 3.4 Shader and driver preparation before movement

Dev adds `compileAsync()` for a mounted stage, including alternate fog-related
transparent/opaque and depth-writing material states where needed. Temporary
material changes are restored immediately after initiating compilation.

It then prepares newly encountered shader programs' uniform and attribute
inspection one program per animation frame. Settling frames follow before the
stage becomes ready. This moves first-use driver work behind the safe camera
bound rather than leaving it for the first visible traveling frame. Preparation
failures are tolerated so navigation does not remain permanently locked.

The work is prepaid rather than removed. A queued section jump may wait longer
while stationary, and `compileAsync()` does not guarantee that all driver work
is nonblocking on every browser/GPU.

Source: [JourneyAssetStage](../src/components/scene/JourneyAssetStage.tsx).

### 3.5 Corridor lights and roof texture lifetime

The existing corridor lights now mount with the entrance shell rather than
deferred corridor details. Keeping the four-point-light pool present prevents
opening the door from changing the standard-material lighting configuration and
triggering shader recompilation. These are the same eight fixtures and existing
light pool, not eight newly added point lights.

This moves two fixture-model requests totaling **126,912 B**, fixture creation,
and some light processing into startup. It improves transition scheduling at
the cost of additional entrance work.

`ExteriorRoof` previously marked its brick texture `needsUpdate` on every React
render. Dev configures it in a layout effect and invalidates only when the color
space/filter configuration differs. The owned top-extension clone is disposed
on cleanup. Its anisotropy remains 16; this change does not lower visual quality.

Sources: [CorridorScene](../src/components/scene/CorridorScene.tsx),
[CorridorDetails](../src/components/scene/corridor/CorridorDetails.tsx), and
[ExteriorRoof](../src/components/scene/ExteriorRoof.tsx).

## 4. New room features: animation savings and added costs

Compared with master, dev adds a seated character, chessboard, and reversible
room-detail camera view. These are product additions, not payload optimizations.

The old always-updating furniture animation hook is replaced by one controlled
update path for the chair and character mixers. Updates stop for reduced-motion
users, hidden documents, and when the seated proxy sphere is outside the camera
frustum. Delta is capped at 0.05 seconds. Mixers are stopped/uncached and attached
clones detached on cleanup; shared GLTF geometry/materials stay cache-owned.

The board uses at most 8x hardware-supported anisotropy instead of raising phone
DPR or enabling shadow maps. The new additions have their own Suspense/error
boundary, so they do not block the existing furniture/door boundary, although
their requests still consume entrance-time bandwidth and decoding work.

New content adds **14,636 triangles**: 14,592 in the seated character and 44 in
the board. The character also has a 21-joint skin, a three-channel idle clip, and
an additional animation mixer. Offscreen guards reduce unnecessary animation
work; they do not make the new visible content free.

Verified model/image request inventory for the entrance:

| Endpoint state | Low-tier file bytes | Medium/high with HDR |
| --- | ---: | ---: |
| Remote master | 1,645,140 B | 3,158,269 B |
| Committed dev, before latest compression | 2,801,164 B | 4,314,293 B |
| Current dev including pending compression | 2,382,584 B | 3,895,713 B |

Current dev therefore adds **737,444 B** versus master's entrance inventory:
545,452 B character + 65,080 B board + 126,912 B fixtures moved earlier. This is
a code-derived inventory of requested model/image file bytes, excluding JS,
fonts, HTTP compression, headers, cache behavior, and request timing. It is not
an entrance-ready dependency list or a measured network/load-time benchmark.

Source: [RoomFurniture](../src/components/scene/room/RoomFurniture.tsx).

## 5. Latest performance pass: currently uncommitted

These changes are in the current working tree beyond committed `dev` HEAD.
Checking out or deploying only `6bcf5d3` will not include them.

### 5.1 Lossless seated-character compression

The runtime URL switches from `shadow-character-seated.glb` to
`shadow-character-seated.meshopt.glb`:

| Asset state | File bytes |
| --- | ---: |
| Original seated export added on dev | 964,032 B |
| Current lossless Meshopt/WebP variant | 545,452 B |
| Saving within dev | **418,580 B / 43.42%** |

All 11 decoded geometry, UV, skin, and animation buffers retain identical bytes.
The full-resolution 1024 x 1024 atlas retains identical decoded RGBA pixels.
Hierarchy, materials, clip definitions, topology, and vertex ordering are
preserved. Compatibility was checked with Drei's actual Meshopt decoder, and
the required GLTF extensions are already used by other portfolio models.

The original export is retained. A deterministic generator verifies buffer and
pixel parity with `node scripts/optimize-seated-character.mjs --check`. This is
a saving relative to dev's new uncompressed character; master has no character
download to reduce.

Sources: [asset URLs](../src/components/scene/assetPaths.ts),
[generator](../scripts/optimize-seated-character.mjs), and
[compression tests](../tests/seated-character-compression.test.ts).

### 5.2 Fully fogged artwork draw culling

Previously, fully fog-hidden sprites could still submit draw calls and let the
fragment shader discard their pixels. `PaintSprite` now skips drawing only when
the entire transformed bounding sphere is beyond the existing fog curtain.
Bounds include enlarged touch targets, live parent scaling, camera banking,
and nonuniform scale/shear.

A shared scene `onBeforeRender` callback checks visibility after final world and
camera transforms but before render-list construction. This avoids checking a
sprite before a later Float/parting callback moves it. Reveal, float, parting,
quality, and hover updates continue; traveling backward restores visibility.
The callback preserves its predecessor and cleans up when the last target leaves.

The optimization reduces GPU submissions without unmounting scenes or evicting
textures. It applies to registered `PaintSprite` targets, not all scene geometry.

Sources: [fog bounds/registry](../src/components/scene/fogVisibility.ts),
[PaintSprite](../src/components/scene/PaintSprite.tsx), and
[bounds/lifecycle tests](../tests/artwork-fog-culling.test.ts).

### 5.3 Earlier fog discard in artwork shaders

`PaintSprite`, `WrappedImageMesh`, and `ProjectPaperMesh` now evaluate the same fog
alpha/discard threshold before sampling textures. Fully fogged fragments can
exit before doing artwork fetches and blending. Fog thresholds, visible colors,
paper deformation, reveal behavior, and project interactions are retained.

### 5.4 Opt-in diagnostics

`PerformanceProbe` is enabled with `?perf=1`. It exposes a hidden JSON output
updated every second for a rolling six-second window: frame intervals,
synchronous renderer time, draw calls, triangles, long tasks, resource timings,
and renderer resource counts. It sends no data to a service and cleans up its
wrapper, observers, timer, and DOM output.

Ordinary URLs perform the lightweight enable check without mounting the active
probe or its per-frame recording. Its bundled code is an instrumentation cost,
not a loading optimization. CPU render time is not GPU execution time or total
application CPU; resource counts are not memory-byte measurements.

Sources: [probe](../src/components/scene/PerformanceProbe.tsx) and
[page integration](../src/app/page.tsx).

## 6. Measurements and their limits

### 6.1 Historical progressive-loading measurements

[The existing progressive-loading report](progressive-asset-loading.md) records
a door-opening `getProgramInfoLog` hotspot falling from approximately 1.44 s to
59 ms after light-count stabilization. It also records a delayed-original
navigation test with about 6.2 ms p95 frame intervals and no moving frame over
50 ms in that scenario.

These are previously recorded local profiles, not a new benchmark of fetched
master during this comparison. They support the scheduling rationale; they do
not establish universal FPS or whole-site speed gains.

### 6.2 Recent measured dev pass: not master versus dev

The latest production samples compare dev at `6bcf5d3` with the current optimized
working tree, both instrumented with the same probe. They ran on the same Windows
laptop/RTX 3050 Ti in the in-app Chromium browser at DPR 1, using 1440 x 900
desktop and 390 x 844 phone-sized viewports. Fresh localhost origins were used
for cold loading; matching settled section stops were used for rendering.

| Loading metric | Dev before latest pass | Current optimized dev |
| --- | ---: | ---: |
| Character HTTP encoded body | 696,190 B | 468,939 B |
| Entrance resource encoded bodies | 4,465,378 B | 4,238,495 B |
| Entrance controls ready, single cold sample | 3.362 s | 3.220 s |

The character's encoded body fell **32.64%**, and entrance resource bodies fell
**5.08%** in these samples. HTTP compression makes these figures different from
raw file-byte savings. One cold timing pair does not establish a statistically
reliable load-time improvement.

| Settled view | Before draw calls | After draw calls | Mean render CPU ms, before -> after |
| --- | ---: | ---: | ---: |
| Desktop About, day | 81 | 50 | 2.49 -> 1.82 |
| Desktop About, night | 106 | 75 | 3.54 -> 2.88 |
| Desktop Journey | 26 | 12 | 1.12 -> 1.00 |
| Desktop Skills | 26 | 20 | 1.17 -> 0.96 |
| Desktop Projects | 10 | 8 | 1.03 -> 0.98 |
| Phone-sized About | 35 | 30 | 1.79 -> 1.53 |
| Phone-sized Journey | 27 | 13 | 1.22 -> 1.06 |
| Phone-sized Projects | 11 | 8 | 1.00 -> 0.95 |
| Phone-sized Contact | 66 | 66 | 1.83 -> 1.65 |

About was sampled again after returning from Contact: 48 calls and 1.95 ms.
Animation/parallax/frustum differences can change counts slightly. Contact's
unchanged draw count means its CPU variation should not be attributed to a
separate optimization. Entrance rendering retained 94 calls and 36,822 triangles
before/after the latest pass; compression preserves geometry rather than reducing
its rendering complexity.

Frame intervals varied without matching renderer CPU/long-task spikes in both
versions, so no FPS percentage is claimed. A phone-sized desktop viewport is
not a physical-phone benchmark. First-travel stalls were not captured in matched
whole-route traces, and no master-versus-dev Lighthouse/Core Web Vitals results
were collected.

Local raw samples and screenshots are in `output/performance/`, which is ignored
by Git. The quantitative asset inventory was independently rechecked against
the fetched master blobs for this report; it is not dependent on those samples.

## 7. Adjacent changes without a demonstrated performance gain

- Global keyboard controls, revised reading angles, compact navigation, entrance
  shortcuts, and the room-detail camera are interaction/framing changes.
- Project-cloud position adjustments affect composition, without an isolated
  speed measurement. The original project and paper-form interactions remain.
- The fixed CV control downloads a 4,349 B PDF on demand; no automatic CV preload
  was added.
- Contact validation rejects invalid input locally and the request aborts after
  20 seconds instead of leaving the UI indefinitely pending. This improves failure
  recovery; it does not establish faster successful delivery or rendering.
- New source/reference models, previews, and authoring files under `public` affect
  repository/deployment size. Their presence does not mean the browser requests
  them. No runtime payload total here includes unused authoring files.

## 8. Validation and reproducibility

The completed implementation pass passed **113 tests across 17 files**, strict
TypeScript, a production build, and `git diff --check`. This includes eight fog
bounds/lifecycle tests and three compression tests. Browser checks covered room
close-up/return, direct Projects entry, project focus/Escape return, travel both
ways, repeated day/night changes, responsive layouts, and opening/typing/closing
the original ground-paper form. No live message was submitted and no new console
errors were observed. These are dev validations, not tests of a freshly built master.

To reproduce a full runtime branch comparison:

1. Build exact master and dev revisions in separate clean directories with the
   same dependency installation, production runtime, browser, device, and viewport.
2. Explicitly include the pending dev files if comparing this report's current
   checkout. A branch-only checkout otherwise excludes Section 5.
3. Use equivalent instrumentation on both versions; master does not contain the
   probe or the same entrance-controls DOM marker, so use a shared semantic
   readiness definition rather than copying that marker unchanged.
4. Use matched cold-cache/network conditions for repeated loading samples and
   matched warm-cache/camera/mode conditions for steady rendering.
5. Separate stationary preparation from travel, collect CPU and GPU evidence,
   and test physical iOS/Android devices for FPS, thermals, and high-DPR behavior.

Asset validation for this report confirmed all 36 master originals are unchanged,
all preview files exist, and all canonical dimensions match. The comparison
introduced this documentation and a narrow Git-ignore exception for it; it did
not modify the portfolio implementation or switch the working branch.
