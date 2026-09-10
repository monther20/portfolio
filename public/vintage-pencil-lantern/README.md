# Vintage pencil lantern

An eight-sided wall lantern reconstructed from the supplied multi-view pencil drawing. The revised pencil atlas adds wobbly, pressure-varied strokes, short breaks, and offset retracing. The GLB contains the pencil appearance; no outline plugin, custom shader, or postprocessing is required.

## Files

| File | Purpose |
|---|---|
| `vintage-pencil-lantern.glb` | Self-contained model; load with a normal Three.js GLTFLoader. |
| `vintage-pencil-lantern.meshopt.glb` | Smaller, losslessly compressed geometry; requires MeshoptDecoder. |
| `preview.html` | Local interactive preview with light toggle, front/side views, orbit, zoom, and wireframe. |
| `lantern-controls.js` | Independent glass and interior light controls. |
| `Lantern.jsx` | React Three Fiber component with independent cloned materials per instance. |
| `technical-report.md` | Measured geometry, materials, UVs, settings, and limitations. |
| `pencil-atlas.png` | Editable atlas; already embedded in both GLBs. |
| `source/` | Deterministic geometry/texture generator and optional compression script. |
| `preview/` | Screenshots rendered from the actual GLB and browser check results. |
| `vendor/` | Three.js r180 and Meshopt decoder for the local preview, with licenses. |

## Open the preview

Extract the ZIP, open a terminal in this folder, and run:

```sh
python -m http.server 8000
```

Open **http://localhost:8000/preview.html**. Use `preview.html?meshopt` to inspect the compressed model. Serve over HTTP; browsers generally block model loading from `file://`.

## Three.js

Copy the GLB and `lantern-controls.js` into your application. Import Three.js through your existing bundler:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createLanternControls } from './lantern-controls.js';

const { scene: lantern } = await new GLTFLoader().loadAsync('/vintage-pencil-lantern.glb');
scene.add(lantern);
const lamp = createLanternControls(lantern);

lamp.setLight(true);       // warm glass and illuminated interior
lamp.setLight(false);      // dark translucent glass
lamp.setLight(true, 0.65); // optional brightness multiplier
```

For the compressed model, configure the loader before loading:

```js
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene: lantern } = await loader.loadAsync('/vintage-pencil-lantern.meshopt.glb');
```

`lamp.glass` and `lamp.interior` expose the two named meshes. `lamp.dispose()` releases the controller's cloned materials; it does not dispose shared geometry or textures. `spillLight: true` adds an optional, shadow-free Three.js point light to illuminate nearby scene surfaces.

## React Three Fiber

Copy `Lantern.jsx` and `lantern-controls.js` together, and place the GLB in your public folder:

```jsx
import { Canvas } from '@react-three/fiber';
import { NoToneMapping } from 'three';
import { Lantern } from './Lantern.jsx';

<Canvas
  frameloop="demand"
  dpr={[1, 1.5]}
  camera={{ position: [1.2, 0.8, 2.2] }}
  gl={{ antialias: true, toneMapping: NoToneMapping }}
>
  <hemisphereLight args={['#ffffff', '#999999', 1.6]} />
  <Lantern on={lightOn} position={[0, -0.5, 0]} />
</Canvas>
```

The component calls `invalidate()` after light changes, so it works with demand rendering. Use your scene's existing camera/orbit controls as needed. It uses no animations, physics, or bones.

## Rebuild

```sh
python -m pip install -r source/requirements.txt
python source/build_lantern.py
cd source
npm install
npm run compress
```

The model's physical scale is an estimate because the reference has no measurements. Rebuilding recreates the GLB and atlas; use the shipped report for the delivered version's measured counts.
