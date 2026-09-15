import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  type Texture,
} from "three";

/** Keep fine artwork readable on tilted/distant surfaces, even on low-tier
 * phones. Retain trilinear mipmaps: disabling them or forcing sharper LODs
 * trades blur for crawling/shimmering text while the camera moves.
 */
export function configureArtworkTexture(texture: Texture, maxAnisotropy: number) {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  if (
    texture.colorSpace === SRGBColorSpace &&
    texture.anisotropy === anisotropy &&
    texture.minFilter === LinearMipmapLinearFilter &&
    texture.magFilter === LinearFilter &&
    texture.generateMipmaps
  ) return;

  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  // Loaded textures can be shared by several materials or both reveal inputs.
  // Only upload again when the sampling configuration actually changes.
  texture.needsUpdate = true;
}
