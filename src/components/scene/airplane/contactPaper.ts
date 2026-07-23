import * as THREE from "three";

/** Shared geometry and scene-object names for the airplane-to-letter fold. */
export const CONTACT_PAPER = {
  width: 1.7,
  height: 2.3,
  foldedRotationX: -Math.PI / 2,
  openRotationX: -Math.PI / 2 + 0.38,
  names: {
    morph: "Contact Paper Origami Morph",
    finished: "Contact Paper Finished Sheet",
  },
} as const;

/**
 * A textured sheet with matching vertex layouts for three poses:
 * paper-airplane silhouette → partially opened kite → flat letter.
 * Morphing one continuous surface prevents a square sheet from appearing
 * underneath the triangular airplane at the beginning of the unfold.
 */
export function createContactPaperMorphGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(
    CONTACT_PAPER.width,
    CONTACT_PAPER.height,
    8,
    10,
  );
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uvs = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const folded = new Float32Array(positions.count * 3);
  const openedKite = new Float32Array(positions.count * 3);
  const flat = new Float32Array(positions.count * 3);

  for (let index = 0; index < positions.count; index += 1) {
    const u = uvs.getX(index);
    const v = uvs.getY(index);

    flat[index * 3] = positions.getX(index);
    flat[index * 3 + 1] = positions.getY(index);
    flat[index * 3 + 2] = 0;

    // Match the existing airplane: a narrow tail, broad wing shoulders and a
    // pointed nose. The small center ridge retains its folded-paper volume.
    const shoulder = 0.22;
    const foldedWidth =
      v < shoulder
        ? THREE.MathUtils.lerp(0.2, 0.816, v / shoulder)
        : THREE.MathUtils.lerp(
            0.816,
            0.025,
            (v - shoulder) / (1 - shoulder),
          );
    folded[index * 3] = (u - 0.5) * foldedWidth;
    folded[index * 3 + 1] = -0.272 + v * 0.782;
    folded[index * 3 + 2] =
      0.052 * (1 - Math.abs(u * 2 - 1)) * Math.sin(Math.PI * v);

    // The first opening beat spreads the triangular dart into a creased kite;
    // the second beat relaxes this pose into the rectangular message sheet.
    const kiteEnvelope = 0.32 + 0.68 * (1 - Math.abs(v * 2 - 1));
    openedKite[index * 3] = (u - 0.5) * 1.32 * kiteEnvelope;
    openedKite[index * 3 + 1] = -0.62 + v * 1.48;
    openedKite[index * 3 + 2] =
      0.085 * (1 - Math.abs(u * 2 - 1)) * Math.sin(Math.PI * v);
  }

  positions.copyArray(folded);
  positions.needsUpdate = true;
  geometry.morphAttributes.position = [
    new THREE.BufferAttribute(openedKite, 3),
    new THREE.BufferAttribute(flat, 3),
  ];
  geometry.morphTargetsRelative = false;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
