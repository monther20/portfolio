# Illustrated day/night experience

Click/tap **either entrance lantern or any corridor fixture** to toggle the whole portfolio. Keyboard users can focus the 3D view and press **N**. Dragging does not toggle, and typing in the contact form does not trigger the shortcut.

The chosen mode now **persists through the door, corridor, journey, skills, projects and contact**. Camera transitions only temporarily lock the toggle; they do not reset time of day. Returning to day removes stars/emission, restores the original palette, and releases the bloom composer.

## Tuning

Artistic settings live in `src/components/scene/dayNight/config.ts`:

| Setting | Purpose |
| --- | --- |
| `NIGHT_CONFIG.background`, `fog` | Blue-gray atmosphere; original fog distances are unchanged |
| `ambient`, `hemisphere`, `directional` | Cool fill and pencil-line readability |
| `environmentIntensity`, `exposure` | HDR fill and linear exposure |
| `lanternColor`, `lanternIntensity`, `lanternDistance`, `lanternDecay` | Entrance light color/power and common illustrated falloff |
| Glass/source emissive settings | Entrance lantern emission, preserving the atlas |
| `unlitTint` | Separate door, corridor, timber, sea and illustration palettes |
| `CORRIDOR_LAMPS` | Corridor intensity, emission, mounting height and camera-distance fading |
| `CORRIDOR_LAMP_DEPTHS` | Eight fixture depths measured from the corridor entrance |
| `NIGHT_STARS` | Star count, opacity, size and cool/ivory colors |
| `NIGHT_ART` | Readable handwritten text and illuminated contact-paper settings |
| `glowOpacity`, `LANTERN_GLOW`, `NIGHT_BLOOM` | Entrance wall washes and selective bloom |
| `DAY_NIGHT_TRANSITION` | Two-second GSAP transition; near-instant with reduced motion |

Keep `DAY_CONFIG` unchanged to preserve the original daytime lighting. New corridor fixtures remain visible but switched off by day; stars are completely hidden.

## Generated corridor models

- `public/models/pencil-corridor-sconce.glb` — six wall-mounted instances.
- `public/models/pencil-corridor-pendant.glb` — two hanging instances.

Each asset is approximately **63 KB**, with faceted geometry, graphite contour lines and an embedded **128×128 pencil-hatching atlas**. Both contain named `Glass_Panels` and `Light_Source` meshes. Lights are anchored to those source transforms, including the wall bracket orientation and pendant drop.

Recreate both assets deterministically with:

```sh
node scripts/generate-corridor-lights.mjs
```

No Blender, external textures or runtime model generation is required. The script merges geometry by material to keep draw calls low.

## Implementation

- `DayNightProvider.tsx`: typed shared state, one GSAP clock and a registry for late-mounted emissive meshes. Original endpoints are retained; there is no accumulated color multiplication.
- `DayNightLighting.tsx`: environment, fog, fill and renderer exposure. Exposure is maintained across Canvas/page re-renders. Day retains `NoToneMapping`; mobile night uses `LinearToneMapping`, while the HDR composer applies equivalent linear exposure.
- `Lantern.tsx`: original hero models/materials, two bulb-positioned PointLights and small procedural wall washes.
- `corridor/CorridorLights.tsx`: eight GLB fixtures share **four shadowless light slots**. Slot assignments are farther apart than their camera-fade ranges, so lights change position only while dark. These real lights also supply world positions/intensities to the unlit corridor shaders.
- `unlitNightMaterial.ts` / `useNightMaterials.ts`: extend existing basic-material shaders without replacing textures. Troika text retains depth/fog and becomes soft chalk at night, including glyphs that finish loading after a transition.
- `PaintSprite.tsx`, `WrappedImageMesh.tsx`, `ProjectPaperMesh.tsx`: retain paint wipes, UVs, bending and interaction while applying a restrained night palette.
- `PaperAirplaneActor.tsx`: owns cloned materials and uses its pencil atlas as a small emission mask. The opened contact sheet receives extra readable fill rather than a dark CSS overlay.
- `NightSky.tsx`: one seeded point-cloud draw call, above the horizon. It fades in beyond the corridor and continues over the contact sea. Reduced-motion mode removes twinkling.
- `NightPostProcessing.tsx`: lazy, explicitly disposed selective bloom; only registered glass/source meshes participate. Stars, white paper, walls and colored panels are excluded.
- `globals.css`: only existing navigation/hint colors change; no filter or overlay is applied to the canvas.

The original camera paths, scene placements and interactions remain intact. A discovered direct-contact/reduced-motion navigation edge case was fixed in `landingProgressAt`: starting a landing at the end bound no longer produces a `0/0` curve parameter.

## Performance and validation

No shadow maps. The hero uses two point lights; the corridor adds four reusable slots rather than one light per fixture. Stars use 640 points normally and 280 on low-tier devices. Phones omit postprocessing completely. Bloom uses half-resolution mip blur, no MSAA/normal/SSAO passes, and releases its render targets on returning to day.

Browser checks covered all five navigation stops on desktop and touch-mobile, switching day/night at each, night persistence through entry, contact form opening/typing/closing, and star visibility. No browser/shader errors. Desktop GPU texture counts dropped by all 14 composer textures after each return to day; mobile incurred no additional night render targets. Tests used a GPU-backed Chromium desktop and mobile emulation, not a physical handset benchmark.

The original hero's day and restored-day views were also previously verified pixel-for-pixel against its pre-feature reference.

Validation commands:

```sh
bun test tests/day-night.test.ts tests/night-journey.test.ts
bunx tsc --noEmit --incremental false
bun run build
```
