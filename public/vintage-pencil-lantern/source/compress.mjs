import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const document = await io.read(path.join(base, 'vintage-pencil-lantern.glb'));
await document.transform(reorder({ encoder: MeshoptEncoder, target: 'size' }));
document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
  method: EXTMeshoptCompression.EncoderMethod.QUANTIZE,
});
// No quantize transform: preserve the original positions and logical pivots.
await io.write(path.join(base, 'vintage-pencil-lantern.meshopt.glb'), document);
console.log('Wrote compressed GLB:', fs.statSync(path.join(base, 'vintage-pencil-lantern.meshopt.glb')).size, 'bytes');
