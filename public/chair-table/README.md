# Chair and table — Meshopt asset

- Source: `public/chair & table.glb` (retained unchanged).
- Runtime: `chair-table.meshopt.glb`, loaded through `ROOM_FURNITURE_MODEL_URL` by `RoomFurniture` using Drei's Meshopt-enabled `useGLTF` loader.
- Size: 459,272 → 246,584 bytes (46.3% smaller).
- Existing placement, materials, and all three animation clips are retained. The room continues to play `Chair_Rocking_Loop` and respects reduced motion.

## Regenerate

From the repository root:

```sh
npx --yes @gltf-transform/cli@4.2.1 meshopt "public/chair & table.glb" public/chair-table/chair-table.meshopt.glb
```

The compressor skips UV quantization for coordinates outside [0,1], preserving tiled UVs.

## Validation

`validation.json` covers the original; `validation-meshopt.json` covers the compressed asset. Both have zero errors and warnings. As with the lantern, the validator reports that it cannot validate `EXT_meshopt_compression` (informational); this is not a full verification of compressed geometry. Browser visual inspection remains recommended.
