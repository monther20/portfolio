# Vintage pencil lantern — technical report

Created from the supplied front, back, left, right, top, bottom, and perspective sketch. The reconstruction retains the ornamental plate, projecting arm, alternating chain links, suspension loop, eight-sided roof, tapered octagonal glazing, arched window bars, stepped lower housing, and spherical finial. Physical dimensions and details that are ambiguous in the drawing are estimated; this is a visual reconstruction, not a dimensionally certified manufacturing model.

## Measured export

| Metric | Delivered result |
|---|---:|
| Triangles, complete asset | **4,170** |
| Exported vertices, including UV/color/normal seams | **5,493** |
| Logical meshes / primitives | **8 / 8** |
| Materials | **3** |
| Texture images | **1** embedded atlas |
| Texture resolution | **1024 × 1024** |
| Texture encoding | Optimized indexed PNG with preserved alpha ramp |
| PNG size | **121,451 bytes** / 118.6 KiB |
| Standard GLB size | **272,388 bytes** / 266.0 KiB |
| Meshopt GLB size | **215,712 bytes** / 210.7 KiB |
| Draw calls with supplied controls, OFF / ON | **7 / 8** |
| Submitted triangles with supplied controls, OFF / ON | **3,954 / 4,170** |
| Estimated GPU vertex/index buffers | **137.4 KiB**, excluding driver overhead |
| Estimated GPU atlas memory with mipmaps | **5.33 MiB** as RGBA8 |
| Skins / animations / morph targets | **0 / 0 / 0** |

The compressed variant keeps the same geometry, UVs, colors, materials, and pivots. It uses lossless Meshopt encoding and reordered buffers, with no additional position quantization or simplification. It requires `EXT_meshopt_compression`; the standard GLB needs no geometry decoder. Both use `KHR_materials_unlit` for the pencil exterior.

## Object structure

| Exact node name | Vertices | Triangles | Material |
|---|---:|---:|---|
| `Wall_Mounting_Plate` | 282 | 184 | Pencil_Paper |
| `Chain_and_Hanging_Hardware` | 2,688 | 2,312 | Pencil_Paper |
| `Faceted_Roof` | 264 | 134 | Pencil_Paper |
| `Main_Lantern_Frame` | 1,000 | 752 | Pencil_Paper |
| `Glass_Panels` | 32 | 16 | Glass_Sketch |
| `Lower_Housing` | 496 | 252 | Pencil_Paper |
| `Bottom_Spherical_Finial` | 275 | 304 | Pencil_Paper |
| `Interior_Emissive_Light` | 456 | 216 | Interior_Emission |
| **Total** | **5,493** | **4,170** | **3 materials** |

The root is `Vintage_Pencil_Lantern`. Each component has a local pivot appropriate to its position or attachment. The glass and light are independent meshes and materials. Small hardware pieces are consolidated into one hardware mesh. The standard export uses identity rotations/scales and explicit local translations for these pivots.

Coordinates: **+Y up, +Z away from the wall**, units interpreted as metres. Estimated bounds: width **0.37325 m**, height **1.02115 m**, depth **0.43362 m**. Wall contact plane: **Z = −0.247 m**. Scale the root uniformly to your chosen installation size; for example, `scale={0.6}` gives an overall height of about 61 cm.

## Pencil appearance and topology

The atlas contains uneven graphite outlines, offset retracing, construction strokes, paper grain, and local cross-hatching. This revision adds smooth random wobble along each stroke, varying pencil pressure and thickness, occasional pen lifts, and irregular hatching angles and spacing. The fixed random seed bakes these changes into the texture, keeping the marks stable during interaction. The large exterior surfaces use an unlit material with gentle baked facet shading. This keeps the paper/graphite appearance stable under changing website lighting and avoids photorealistic metal reflections. Narrow structural faces carry stronger baked graphite tones so chain loops and window bars remain legible.

No pencil strokes are modeled as geometry. The roof and body have eight principal sides; the chain uses open low-resolution tube loops; arches use small polygonal sweeps. There are no subdivision modifiers, dense bevel stacks, hidden internal layers, or outline-shell meshes. This is a render asset: glass panels are single-sided thin surfaces, and contacting trim sections omit buried caps. It is not intended for 3D printing.

UVs are explicitly authored per surface. Symmetric roof facets, panes, posts, and trim deliberately share stacked atlas islands to maximize texel reuse. The plate has its own silhouette-mapped island. UVs stay within the atlas with gutters and linear/mipmap sampling. Intentional stacking makes this unsuitable for a unique baked lightmap without a second UV set. No normal maps are required. The palette reduces download size; GPU texture memory is still approximately that of an RGBA image.

## Light states

| Control | OFF | ON, default intensity |
|---|---|---|
| Glass | Dark neutral translucent wash; graphite visible | Warm translucent wash; graphite still visible |
| Glass emission | 0 | sRGB `#ffae50`, multiplier 1.35 |
| Interior emission | 0 | sRGB `#ffd59c`, multiplier 3.0 |
| Interior opacity / visibility | 0 / hidden by helper | 1 / visible |
| Nearby scene illumination | None | Optional shadow-free point light |

The atlas preserves a smooth alpha gradient across each pane and higher alpha for pencil strokes. The same atlas is used for the emission maps, so dark marks do not become bright solid lines. The interior emitter is a simple elongated light element, not a detailed bulb assembly.

Call `createLanternControls(root).setLight(true/false)`, or use the `on` prop in `Lantern.jsx`. The GLB defaults to OFF. If controlling materials manually, also set `Interior_Emission.opacity = 1` when turning it on; emissive intensity alone will not override zero opacity. Material extras record the intended ON/OFF values.

The soft glow is an emissive glass wash and an illuminated interior source. Bloom or atmospheric light scattering is not baked into the GLB. To cast light onto nearby walls, use `createLanternControls(root, { spillLight: true })`. Bloom is optional and omitted from the preview to keep both rendering cost and pencil contrast predictable.

## Recommended Three.js / R3F settings

- Load with `GLTFLoader`. Set `MeshoptDecoder` before loading the `.meshopt.glb` variant.
- Use `renderer.outputColorSpace = SRGBColorSpace` and `NoToneMapping` to match the supplied preview. `GLTFLoader` handles the color textures; do not apply an extra manual gamma conversion.
- Preserve the unlit pencil material and `COLOR_0` vertex colors when editing or re-exporting.
- Keep glass `transparent = true`, `depthWrite = false`, and `side = FrontSide`. The outward-facing panes provide one inexpensive glass pass and avoid accumulated rear-pane tint. Avoid replacing this with physical transmission unless its extra rendering cost is acceptable.
- Render the interior before glass: the supplied helper uses render orders 1 and 2. For several overlapping transparent objects, review sorting in the target scene.
- Start with DPR capped at **1.5** on mobile and **2** on desktop; atlas anisotropy **2–4**. The preview uses a cap of 2 and anisotropy 4.
- Use modest ambient/hemisphere light for the non-emissive glass/socket appearance. No environment map or shadow map is needed for this illustrated asset.
- In R3F, use `frameloop="demand"` when the rest of the page is static. The included component invalidates after light-state changes.

## Verification

The standard GLB passes the Khronos glTF Validator with **zero errors and zero warnings**. The compressed file has zero errors/warnings plus one informational notice that the validator does not inspect `EXT_meshopt_compression` payloads. Its payload was decoded through glTF Transform and rendered through Three.js with MeshoptDecoder.

The actual exported model was inspected from front, side, back, top, and perspective views. OFF and ON states were exercised in Chromium with Three.js **r180**, including the compressed variant: no browser JavaScript errors; one texture; seven/eight render calls as reported above. Screenshots are actual model renders, not generated concept images. This is a functional rendering check using software WebGL, not an FPS benchmark for a specific phone or GPU. The R3F adapter is included as integration source; the browser checks exercise the shared controller and GLTFLoader directly.

Official implementation references: [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [color management](https://threejs.org/manual/en/color-management.html), [MeshStandardMaterial emission](https://threejs.org/docs/pages/MeshStandardMaterial.html), and [material transparency/depth settings](https://threejs.org/docs/pages/Material.html).
