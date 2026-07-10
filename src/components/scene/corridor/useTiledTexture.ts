"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

/**
 * Load a texture and return a tiled clone (`rx × ry` repeats), ready for the
 * corridor's unlit surfaces. Cloning keeps the shared loader-cache texture
 * untouched for other consumers of the same URL.
 */
export function useTiledTexture(url: string, rx: number, ry: number): THREE.Texture {
  const source = useLoader(THREE.TextureLoader, url);

  const tiled = useMemo(() => {
    const texture = source.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(rx, ry);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [source, rx, ry]);

  useEffect(() => () => tiled.dispose(), [tiled]);

  return tiled;
}
