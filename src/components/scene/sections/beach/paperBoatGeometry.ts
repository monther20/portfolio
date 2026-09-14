import * as THREE from "three";

type Point = readonly [number, number, number];

/** A thin, open paper hull, not a solid toy boat. Long axis is local X. */
export function createPaperBoatGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const strokes: number[] = [];
  const paper = new THREE.BufferGeometry();
  const pencil = new THREE.BufferGeometry();
  // Counter-clockwise when seen from above (normal points up).
  const rim: Point[] = [
    [-1.12, 0.28, 0],
    [-0.5, 0.23, 0.4],
    [0.5, 0.23, 0.4],
    [1.12, 0.28, 0],
    [0.5, 0.23, -0.4],
    [-0.5, 0.23, -0.4],
  ];
  const keel: Point[] = [
    [-0.7, -0.095, 0],
    [-0.38, -0.095, 0.18],
    [0.38, -0.095, 0.18],
    [0.7, -0.095, 0],
    [0.38, -0.095, -0.18],
    [-0.38, -0.095, -0.18],
  ];
  const innerRim = rim.map(
    ([x, y, z]): Point => [x * 0.985, y - 0.008, z * 0.975],
  );
  const innerKeel = keel.map(
    ([x, y, z]): Point => [x * 0.98, y + 0.018, z * 0.95],
  );
  const triangle = (a: Point, b: Point, c: Point, shade: number) => {
    for (const p of [a, b, c]) {
      positions.push(...p);
      // Planar paper coordinates with a vertical contribution on folded faces.
      uvs.push((p[0] + 1.2) / 2.4, (p[2] + p[1] * 0.8 + 0.6) / 1.8);
      colors.push(shade, shade, shade);
    }
  };
  const quad = (a: Point, b: Point, c: Point, d: Point, shade: number) => {
    triangle(a, b, c, shade);
    triangle(a, c, d, shade);
  };
  const line = (a: Point, b: Point) => strokes.push(...a, ...b);
  const mix = (a: Point, b: Point, t: number): Point => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];

  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    // Outward faces and underside. Modest authored values retain folds even
    // in the existing ambient-only day lighting, without an environment map.
    quad(rim[i], keel[i], keel[j], rim[j], i % 2 ? 0.89 : 0.97);
    triangle([0, -0.095, 0], keel[j], keel[i], 0.85);
    quad(rim[i], rim[j], innerRim[j], innerRim[i], 1);
    // Contours and actual folds only: never outline triangulation diagonals.
    const midpoint = mix(rim[i], rim[j], 0.5);
    const imperfectMid: Point = [midpoint[0], midpoint[1] + 0.002, midpoint[2]];
    line(rim[i], imperfectMid);
    line(imperfectMid, rim[j]);
    line(rim[i], keel[i]);
    line(keel[i], keel[j]);
    // Sparse parallel graphite hatching on the outside of each hull panel.
    for (let h = 0; h < 4; h++) {
      const t = 0.22 + h * 0.105;
      line(
        mix(mix(rim[i], rim[j], t), mix(keel[i], keel[j], t), 0.16),
        mix(
          mix(rim[i], rim[j], t + 0.07),
          mix(keel[i], keel[j], t + 0.07),
          0.43,
        ),
      );
    }
  }
  paper.addGroup(0, positions.length / 3, 0);
  const innerStart = positions.length / 3;
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    quad(innerRim[i], innerRim[j], innerKeel[j], innerKeel[i], 0.98);
    triangle([0, -0.077, 0], innerKeel[i], innerKeel[j], 0.91);
  }

  // The raised diamond fold is the recognizable origami-paper centre. Its
  // four sloped panels leave an open pocket on either side inside the hull.
  const fold: Point[] = [
    [-0.66, -0.072, 0],
    [0, -0.072, 0.18],
    [0.66, -0.072, 0],
    [0, -0.072, -0.18],
  ];
  const tip: Point = [0.035, 0.7, 0];
  for (let i = 0; i < fold.length; i++) {
    const a = fold[i];
    const b = fold[(i + 1) % fold.length];
    triangle(a, b, tip, i % 2 ? 0.88 : 1);
    line(a, tip);
    line(a, b);
    for (let h = 0; h < 3; h++) {
      line(
        mix(a, tip, 0.24 + h * 0.075),
        mix(mix(a, b, 0.2), tip, 0.2 + h * 0.075),
      );
    }
  }
  paper.addGroup(innerStart, positions.length / 3 - innerStart, 1);
  paper.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  paper.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  paper.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  paper.computeVertexNormals(); // Non-indexed: intentional flat paper folds.
  paper.computeBoundingBox();
  paper.computeBoundingSphere();
  pencil.setAttribute("position", new THREE.Float32BufferAttribute(strokes, 3));
  pencil.computeBoundingBox();
  pencil.computeBoundingSphere();

  return {
    paper,
    pencil,
    dispose() {
      paper.dispose();
      pencil.dispose();
    },
  };
}

/** Also assigned to LineSegments: Drei Html occlusion raycasts recursively. */
export const paperBoatNoRaycast: THREE.Object3D["raycast"] = () => {};
