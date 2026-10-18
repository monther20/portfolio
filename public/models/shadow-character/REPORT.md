# Shadow character — asset report

A real, fully volumetric, skinned glTF 2.0 character based on the supplied Daddy-Long-Legs cover silhouette. The cover lettering, illustration background and other figures are excluded. The graphite atlas is generated from layered pencil-like strokes; the reference image is not projected onto the mesh.

## Delivered files

- `shadow-character.glb`: standalone runtime asset with embedded texture, skeleton and Idle animation.
- `source/shadow-character.gltf`, `.bin`, and `graphite-atlas.png`: editable, uncompressed source. Keep these three files together and import the `.gltf` into a glTF-capable 3D editor. Blender was unavailable in the creation environment, so no `.blend` is supplied.
- `source/build_character.py`: deterministic parametric geometry, atlas, rig and export source. Edit the profile control points to change proportions. Requires Python, NumPy, SciPy and Pillow; run `python source/build_character.py` from the package directory.
- `source/validate_render.py`: GLB readback, structural checks and CPU preview renderer. Run after the build script.
- `source/component-map.json`: vertex ranges identifying all 24 editable component shells in the combined mesh.
- `previews/`: front, strict side, three-quarter, rear, graphite close-up and a presentation sheet. These are actual rasterizations of the reopened GLB, not generated concept images.
- `metrics.json` and `validation.json`: machine-readable measurements and completed checks.

## Runtime specification

| Property | Exported value |
|---|---|
| Format | glTF 2.0 binary, self-contained GLB |
| File size | 964,188 bytes / 0.96 MB / 0.92 MiB |
| Triangles | 14,592 |
| Vertices | 7,769, including UV seam duplication |
| Meshes / primitives | 1 skinned mesh / 1 primitive |
| Materials | 1: `Graphite_Unlit` |
| Draw calls | One main material pass per instance; additional renderer passes are separate |
| Textures | One embedded 1024 × 1024 RGB PNG atlas |
| Material extension | `KHR_materials_unlit` |
| Opacity | OPAQUE; no alpha blending or cutouts |
| Fallback PBR values | Metallic 0, roughness 1 |
| Skeleton | 21 joints; up to two nonzero weights per vertex |
| Animation | `Idle`, 8 seconds, seamless loop |
| Root | `ShadowCharacter_ROOT` |
| Units / up / front | Meters / +Y / +Z |
| Rest dimensions, X × Y × Z | 1.136815 × 3.611160 × 0.267978 m |
| Rest bounds, minimum XYZ | −0.569234, 0, −0.114324 m |
| Rest bounds, maximum XYZ | +0.567581, 3.611160, +0.153653 m |
| Ground / root placement | Soles at Y=0; root at ground level, centered horizontally between ankle pivots |
| Presentation objects in GLB | None; no cameras, lights, floor or background |

The exaggerated 3.61 m authoring height is intentional. Uniform scale `0.5` produces a roughly 1.806 m character without changing its unusual proportions. The front preview looks toward −Z from the character's +Z side; its head turns toward +X, matching the profile direction in the reference front silhouette.

## Surface and contour treatment

The surface uses dense dark graphite, lengthwise limb strokes, crossed strokes on the torso, head and hat, uneven stroke pressure and sparse lighter paper-like specks. Every component has a unique UV chart. Chart padding and matched wrap edges reduce visible seams. The broad hat brim is mapped by surface distance to avoid stretching the stroke pattern over its top.

The material is unlit and opaque. Apparent paper gaps are lighter texels, not holes or transparency. There are no normal maps, reflective highlights or directional lighting baked into the image. UVs deform with the skin, so the graphite remains attached during animation. Strong external tone mapping or color grading can still change the final appearance; compare against the neutral previews when integrating.

Controlled low-amplitude shape variation is part of the geometry: curved limbs, asymmetrical hands and feet, an uneven brim and a slightly crooked crown. There is no thick outline shell and no secondary floating contour-stroke system. No custom shader is included or required. A view-dependent secondary pencil-outline effect would be a separate, optional website enhancement and is not represented in these previews.

## Rig and editing

The rig contains hips, spine, chest, neck/head and paired shoulder, upper-arm, forearm, hand, thigh, shin, foot and toe joints. It is a lightweight FK deformation skeleton, with no IK controls, facial rig, finger joints, humanoid-retargeting metadata or seated animation. Hat components follow the head; individual fingers follow the corresponding hand.

Idle moves the chest, neck, head and arms by small amounts. Hips, legs and feet remain static, and its first and final poses match. It does not translate the root.

The combined mesh contains 24 closed, overlapping component shells, including hands, digits and hat components. It is not a single boolean-unified sculpting surface. This keeps the silhouette and UV charts clean for a shadow asset. The rig provides the joints needed to author future seated poses, but large hip, shoulder, knee and wrist bends still require a pose-specific deformation review. Extreme poses and seated poses have not been certified.

In an editor, stop or remove Idle before posing. Inspect the imported bone axes before rotating joints: glTF joint bind rotations are identity, and an editor may display/reorient bone handles according to its import settings.

## Integration notes

Load the GLB with the application's normal glTF loader. Preserve its imported unlit material, UVs, skeleton and embedded texture. Select the animation by its exact name, `Idle`. Do not replace its material with a plain black material, which would discard the pencil work.

For multiple independently animated copies in Three.js, use a skeleton-aware clone and a separate animation mixer for each instance. Use uniform scaling at the scene/root level. The asset contains no Draco, Meshopt or KTX2 dependency. Keep camera clipping and texture minification appropriate to its very thin hands and limbs; any subpixel silhouette can alias when rendered too small.

## Validation performed

The final GLB was reopened from disk, its embedded image decoded, and its exported triangles rendered from front, side, rear, three-quarter and close-up views. The previews were visually inspected after revising shoulder connections, side-view depth separation and hat-brim UVs.

Numerical checks passed for GLB chunk lengths; index ranges; finite vertex data; unit normals; UV bounds; joint indices; normalized skin weights; identity bind skin matrices; outward shell winding; and consistent edge orientation. After welding only coincident UV seam vertices, the mesh has zero open boundary edges, zero nonmanifold edges and zero degenerate triangles. The separate shells intentionally overlap.

The eight-second loop was sampled at one-second intervals. Maximum measured motion of vertices near the soles was approximately 0.00000000353 m (floating-point noise), and start/end loop positions matched within tolerance.

Validation used a custom CPU glTF reader and unlit rasterizer. Blender, Khronos glTF Validator and a Three.js/WebGL runtime were not available for independent testing. Application-specific rendering and aggressive seated-pose deformation therefore remain integration checks; the file is not claimed to have passed those unavailable tests.
