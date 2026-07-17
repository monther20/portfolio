"use client";

import WrappedImageMesh from "../WrappedImageMesh";

const C = "/textures/corridor";

/** A thin frame mesh whose original drawing wraps continuously around its sides. */
export default function CorridorPictureFrame({ name }: { name: string }) {
  return (
    <WrappedImageMesh
      name={name}
      sketch={`${C}/ramkanazdjecieduza.webp`}
      painted={`${C}/ramkanazdjecieduza_painted.webp`}
      width={3.78}
      height={1.89}
      depth={0.045}
      position={[0, 0, 0.105]}
      horizontalBorderUv={0.075}
      verticalBorderUv={0.14}
      revealNear={7}
      revealFar={15}
    />
  );
}
