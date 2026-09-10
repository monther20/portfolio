import { useEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createLanternControls } from './lantern-controls.js';

/** Place inside <Canvas>. Supports multiple independent lantern instances.
 * Example: <Lantern on={lightOn} position={[0, 0, 0]} scale={0.6} />
 * Copy vintage-pencil-lantern.glb to your app's public directory.
 * Optional compact URL: /vintage-pencil-lantern.meshopt.glb
 */
export function Lantern({
  on = false,
  intensity = 1,
  url = '/vintage-pencil-lantern.glb',
  spillLight = false,
  ...props
}) {
  const gltf = useLoader(GLTFLoader, url, loader => loader.setMeshoptDecoder(MeshoptDecoder));
  const instance = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const invalidate = useThree(state => state.invalidate);

  useEffect(() => {
    const controls = createLanternControls(instance, { spillLight });
    instance.userData.lanternControls = controls;
    invalidate();
    return () => {
      controls.dispose();
      delete instance.userData.lanternControls;
    };
  }, [instance, spillLight, invalidate]);

  useEffect(() => {
    instance.userData.lanternControls?.setLight(on, intensity);
    invalidate();
  }, [instance, on, intensity, invalidate, spillLight]);

  // Geometry/textures belong to the useLoader cache; dispose only cloned controls.
  return <primitive object={instance} dispose={null} {...props} />;
}
