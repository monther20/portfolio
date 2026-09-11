# Colored-pencil fantasy door

A real, closed 3D door reconstructed from the supplied reference sheet. The front has blue/green, yellow/orange, and red/purple panels; the back is wooden. The grain, sketch contours, and small studs are sampled from the reference into a single texture atlas.

## Use these files

- **fantasy-door.glb** — the complete web asset, including its texture and animations. Copy this file into your site's `public/models/` folder.
- **react/FantasyDoor.tsx** — a React Three Fiber component with click-to-open/close and support for a controlled `open` prop.
- **source/fantasy-door.obj** and **fantasy-door.mtl** — editable geometry with quads, UVs, and named component groups. Keep the `textures` folder beside `source` when importing.
- **source/build_door.py** — reproducible geometry builder and exporter. Uses Python, NumPy, and Pillow. With the included atlas, no original reference file is needed to rebuild the GLB.
- **source/mesh-source.json** — welded geometry, per-face UVs, and group names.
- **source/create_blender_scene.py** — optional helper to build a packed `.blend` file with the editable geometry and two actions. The helper was syntax-checked; Blender itself was unavailable in the build environment. You can import the GLB directly into Blender instead.
- **textures/door-pencil-atlas.png** — lossless editable atlas. The GLB embeds its optimized JPEG version.
- **previews/** — actual renders of the exported GLB, including the open pose and a wireframe view.
- **validation.json**, **gltf-validation.json**, **render-validation.json** — geometry, glTF, and Three.js validation results.

## Runtime budget

| Item | Value |
|---|---:|
| Triangles | 980 |
| Materials | 1 |
| Mesh primitives | 1 |
| Draw calls | 1 per color pass |
| Texture | One 1024 × 1024 RGB atlas |
| Approximate texture memory | 5.33 MiB as RGBA8 with mipmaps |
| Animation clips | 2, 1.2 seconds each |
| Rig | One animated node; no skeleton |
| Additional decoder | None |

The exact file size and vertex counts are recorded in `validation.json`. The wireframe preview adds a debug overlay, which is not part of the GLB.

The front receives most of the atlas space. The back and hardware use lower texel density. JPEG reduces download size, but is not GPU texture compression. No 2K/4K texture, normal map, displacement, outline pass, duplicated outline shell, or individual stud meshes are used.

## Dimensions and orientation

| Property | Value |
|---|---|
| Leaf width × height × thickness | 1.04 × 2.05 × 0.13 metres |
| Front | +Z |
| Up | +Y |
| Bottom | Y = 0 |
| Animated node | `DoorHinge` |
| Pivot | (0, 0, 0), on the left hinge axis |
| Leaf left edge | Approximately X = 0.033 m, beside the hinge barrel |
| Open pose | +90° about Y, swinging toward −Z |
| Hinge centers | Y = 0.355 m and 1.735 m |

The reference contains no measured dimensions, so the metre scale is an assumption and the proportions are traced estimates. Uniformly scale the whole asset to fit your scene.

The heavy outside wooden border is part of the moving door leaf. The image does not show a separate fixed wall jamb, so none is included. The back-view drawing repeats the hinges on its left; a real door seen from behind reverses sides. This model keeps one mechanically consistent left hinge axis, so the hinges appear on the right when viewing the back.

## Appearance

The material uses `KHR_materials_unlit` to preserve the original illustration's baked shading and colors. It needs no scene lights and has no glossy highlights. Its fallback parameters are metallic 0 and roughness 1. Use ordinary sRGB output and avoid applying an aggressive global tone mapper if you want the reference colors to remain close.

The door has real thickness, raised panel lips, recessed panel faces on both sides, subtly uneven construction, and closed low-poly hardware. Fine outlines, wood strokes, and studs are texture details. Tiny studs intentionally remain flat when viewed at grazing angles. Surface samples hidden by the original handle and hinges are reconstructed from adjacent parts of the same reference.

The atlas is intended for a door displayed roughly several hundred pixels tall. Very close inspection will expose the source image's resolution, especially on the back and hardware; the included detail preview shows this honestly.

## React Three Fiber

Install the normal project dependencies if they are not already present:

```bash
npm install three @react-three/fiber @react-three/drei
```

Copy `react/FantasyDoor.tsx` into your components folder and `fantasy-door.glb` to `public/models/fantasy-door.glb`.

```tsx
'use client';

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FantasyDoor } from './FantasyDoor';

export default function DoorExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'Close door' : 'Open door'}
      </button>
      <Canvas
        frameloop="demand"
        flat
        camera={{ position: [-2.2, 0.2, 3.5], fov: 34 }}
        style={{ height: 600 }}
      >
        <Suspense fallback={null}>
          <FantasyDoor
            position={[-0.537, -1.025, 0]}
            open={open}
            onOpenChange={setOpen}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
```

The example centers the door in its Canvas; adjust the wrapper position for your existing portfolio. Clicking the mesh or the HTML button toggles the door. The HTML button also provides keyboard access.

The component animates the existing hinge transform with a small damped rotation. This allows reversing midway without a snap. It invalidates frames only while the door moves and works with `frameloop="demand"`. Multiple copies share the cached geometry and texture while keeping separate hinge transforms. Do not run an AnimationMixer on the same hinge while this component controls it.

## Included animation clips

- `Door_Open`: closed → 90° open in 1.2 seconds.
- `Door_Close`: 90° open → closed in 1.2 seconds.

Both clips target only `DoorHinge.quaternion`. They contain 25 sampled smoothstep rotation keys each, with no translation, scaling, bones, or morph targets. Play a clip once and clamp it at its last frame. For direct Three.js use:

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('/models/fantasy-door.glb');
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
const open = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Door_Open'));
open.setLoop(THREE.LoopOnce, 1);
open.clampWhenFinished = true;
open.play();

// In your existing render loop: mixer.update(deltaSeconds).
// Stop the previous clip before playing Door_Close from the fully open pose.
```

## Edit or rebuild

Import the GLB in Blender with File → Import → glTF 2.0, or import the OBJ for the original quad faces and component groups. GLB import performs the Y-up to Blender Z-up conversion; its hinge axis becomes Blender Z.

To rebuild from the included texture:

```bash
python -m pip install numpy pillow
python source/build_door.py
```

To rebake from the original 1448 × 1086 reference sheet:

```bash
python source/build_door.py --reference "/absolute/path/reference.png"
```

To create the optional native Blender file:

```bash
blender --background --python source/create_blender_scene.py
```

The Blender helper creates a dedicated collection, packs the lossless texture, and saves `fantasy-door.blend` beside the GLB. It does not delete existing scene objects. Use the already validated GLB for the website; editing or re-exporting may change its draw-call and vertex counts.

## Verification

The final GLB was loaded and rendered in Three.js, and checked with the Khronos glTF Validator. The validation reports contain the exact results. Source topology has zero boundary edges, zero non-manifold edges, and zero degenerate triangles. The leaf, two hinges, and handle are four closed components merged into one runtime mesh. The pivot stays fixed during opening and closing.

Format references: [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [Three.js GLTFLoader](https://threejs.org/docs/#GLTFLoader).
