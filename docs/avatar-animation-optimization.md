# Avatar animation optimization

## Summary

The corridor avatar previously used 33 separate `640 × 640` WebP files. The avatar component started loading 32 of those files only after the door opened, decoded every image separately, and progressively uploaded every frame as an independent WebGL texture. Even though the compressed files were individually small, the request burst, image decoding, React state update, and many GPU uploads happened during the entrance transition and could produce a visible hitch.

The implementation now uses one cropped WebP texture atlas, warms that texture while the initial entrance loader is visible, and animates by changing UV coordinates. No avatar network request, decode, or first GPU upload is started by opening the door.

## Before and after

| Measurement | Before | After | Change |
| --- | ---: | ---: | ---: |
| Public avatar files | 33 | 1 | 32 fewer files/requests |
| Compressed transfer size | 691.6 KiB (708,248 B) | 333.5 KiB (341,484 B) | 51.8% smaller |
| Animation frames used on standard/high quality | 33 | 17 sampled frames | Every second source frame retained |
| Base playback rate | 28 fps | 14 fps | Same animation duration |
| Approximate decoded RGBA texture allocation | 51.6 MiB | 14.5 MiB | About 72% smaller |
| Texture switches during playback | One texture per frame | None | One texture remains bound |
| Avatar work at door opening | Request/decode/upload begins | Already warmed | Removed from entrance transition |

The decoded-memory figures are the uncompressed RGBA pixel counts (`width × height × 4`) and do not include browser/driver bookkeeping. Mipmaps are disabled in both the old and new implementations.

## Asset conversion

### Source layout

The deleted source sequence was:

```text
public/textures/corridor/avatar_anim_warp/001.webp
...
public/textures/corridor/avatar_anim_warp/033.webp
```

All source images were `640 × 640` RGBA WebP files. Their visible alpha bounds shared the following union rectangle:

```text
left: 201 px
 top:   4 px
right: 527 px
bottom: 638 px
 size: 326 × 634 px
```

Most of each source image was therefore transparent padding. The atlas stores only this shared crop while the renderer restores the crop's original position in world space.

### Frame sampling and timing

The atlas keeps source frames `001, 003, 005, …, 033`, for 17 frames total. The original ping-pong loop used 33 frames and therefore had 64 playback steps:

```text
64 steps / 28 fps = 2.286 seconds
```

The sampled ping-pong loop has 32 playback steps:

```text
32 steps / 14 fps = 2.286 seconds
```

This halves frame storage without accelerating or shortening the wave. `responsive.motionScale` is still applied, and a reduced-motion value of zero still holds the animation on its first frame.

### Atlas packing

The generated asset is:

```text
public/textures/corridor/avatar-wave-atlas.webp
```

Its packing configuration is defined by `AVATAR_SPRITE_SHEET` in `src/components/scene/assetPaths.ts`:

| Property | Value |
| --- | ---: |
| Atlas dimensions | `1980 × 1914` |
| Grid | 6 columns × 3 rows |
| Stored frame dimensions | `326 × 634` |
| Gutter | 2 px on every side |
| Cell dimensions | `330 × 638` |
| Stored frames | 17 |
| Encoding | RGBA WebP, quality 82 |

The two-pixel gutters contain extruded edge pixels. This prevents linear filtering from sampling an adjacent animation frame at a cell boundary. The final unused grid cell remains transparent.

The 33 original files were removed after the atlas was verified, so they are no longer copied into the deployment output.

## Runtime implementation

### Central atlas metadata

`src/components/scene/assetPaths.ts` no longer generates an array of 33 frame URLs. It exports one `AVATAR_SPRITE_SHEET` object containing:

- the atlas URL;
- frame count and base frame rate;
- atlas, cell, and stored-frame dimensions;
- gutter size;
- original source dimensions; and
- crop origin.

Keeping the image geometry and playback metadata together avoids scattering hard-coded UV values through the component.

### One texture and UV-based animation

`src/components/scene/AnimatedAvatar.tsx` now calls `useLoader` once for the atlas. `setAvatarFrame` computes the selected frame's UV rectangle:

```text
column = frameIndex % columns
row    = floor(frameIndex / columns)

repeat.x = frameWidth / atlasWidth
repeat.y = frameHeight / atlasHeight

offset.x = (column × cellWidth + gutter) / atlasWidth
offset.y = 1 - (row × cellHeight + gutter + frameHeight) / atlasHeight
```

The Y calculation accounts for the difference between image rows, which start at the top, and Three.js texture UVs, which start at the bottom.

On each animation step, the component updates only `texture.offset` and `texture.repeat`. It no longer:

- swaps `material.map` between textures;
- sets `material.needsUpdate` every frame;
- allocates an array of texture objects;
- waits for a `Promise.all` of frame requests;
- schedules one idle GPU upload per frame; or
- disposes dozens of independently owned textures.

Three.js updates the texture transform uniform during rendering, so changing the UV transform does not re-upload the atlas pixels.

### Preserving the original placement

Cropping transparent pixels would normally stretch or recenter the artwork if the old square plane were reused. The component instead derives a cropped plane from the original source coordinate system:

```text
scale       = requestedWorldHeight / sourceHeight
planeWidth  = croppedFrameWidth  × scale
planeHeight = croppedFrameHeight × scale
planeX      = (cropCenterX - sourceWidth / 2) × scale
planeY      = (sourceHeight / 2 - cropCenterY) × scale
```

For the current `2.7` world-unit avatar height, the mesh remains aligned exactly where the visible pixels were inside the old `640 × 640` plane. The billboard position, fog calculation, name/role depth ordering, and greeter split animation remain unchanged.

### Texture preparation

`prepareAvatarTexture` configures the shared atlas with the same rendering requirements as the original sequence:

- `THREE.SRGBColorSpace`;
- linear minification and magnification filtering;
- no mipmap generation;
- anisotropy capped at 8 and bounded by device support; and
- the first frame's UV transform.

It marks the texture for upload only when one of those pixel/sampler settings actually changes. Reusing the already configured atlas does not force another upload.

### Preloading before entry

`AvatarTexturePreloader`, exported from `AnimatedAvatar.tsx`, loads and prepares the same cached atlas texture. `RoomScene.tsx` mounts this preloader in the entrance scene, inside the existing initial Suspense/loading flow.

Its layout effect calls `gl.initTexture(texture)`, which performs the initial GPU upload before the entrance loader reports the scene ready. When `AnimatedAvatar` later mounts after the door opens, `useLoader` returns the same cached texture and Three.js sees that it is already uploaded.

This intentionally moves one 333.5 KiB request and one atlas upload into the existing loading screen instead of allowing avatar work to compete with the door/camera transition.

## Files changed

| File | Change |
| --- | --- |
| `public/textures/corridor/avatar-wave-atlas.webp` | Added the single 17-frame cropped atlas |
| `public/textures/corridor/avatar_anim_warp/*.webp` | Removed all 33 individual frame files |
| `src/components/scene/assetPaths.ts` | Replaced frame URL generation with atlas metadata |
| `src/components/scene/AnimatedAvatar.tsx` | Replaced multi-texture loading/uploading with UV animation and added the preloader |
| `src/components/scene/RoomScene.tsx` | Mounted the avatar texture preloader in the initial entrance flow |
| `src/components/scene/corridor/CorridorGreeter.tsx` | Uses the atlas's 14 fps base rate with the existing responsive motion scale |

## Validation

The atlas itself was checked before the source frames were deleted:

- dimensions: `1980 × 1914`;
- frame count: 17;
- every retained source frame fit inside the shared alpha crop;
- composited-image comparison against the retained source frames: mean absolute error `0.39` and PSNR `45.81 dB`; and
- no non-transparent source pixel was cropped.

Automated project validation:

```sh
./node_modules/.bin/tsc --noEmit --incremental false --pretty false
bun test
bun run build
```

Results:

- TypeScript: passed;
- tests: 82 passed, 0 failed; and
- Next.js 16 production build/static generation: passed.

A GPU-backed headless Chrome check at `1440 × 900` also verified:

1. the only avatar resource request was `/textures/corridor/avatar-wave-atlas.webp`;
2. that request completed before the door was opened;
3. opening the door caused no additional avatar resource requests;
4. the cropped atlas rendered upright and in the expected position; and
5. UV frame changes animated the hand rather than displaying the full sheet.

## Maintenance notes

If the avatar artwork is replaced or its frames change, regenerate the atlas and update `AVATAR_SPRITE_SHEET` together. The following values must agree with the generated image: atlas dimensions, grid columns, cell dimensions, frame dimensions, gutter, source dimensions, crop origin, frame count, and playback rate.

Do not pass this atlas through `next/image`: it is a WebGL texture loaded by Three.js, not a DOM image. Runtime resizing or image optimization would invalidate its exact UV grid metadata.
