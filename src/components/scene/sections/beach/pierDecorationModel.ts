import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PIER_DECORATION, pierDecorationMotion } from "./pierDecorationLayout";
import { createPierDecorationPalette as createPalette, pierSurfaceShade, type PierSurface } from "./pierDecorationMaterials";

type Point = readonly [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);

/** Decorative geometry must never intercept contact actions or Html occlusion. */
export const pierDecorationNoRaycast: THREE.Object3D["raycast"] = () => {};

/** Fine physical graphite strokes retain their silhouette on high-DPI screens. */
function contourGeometry(segments: number[]) {
  const positions: number[] = [], indices: number[] = [];
  const radius = 0.0016, sides = 5;
  for (let i = 0; i < segments.length; i += 6) {
    const a = new THREE.Vector3().fromArray(segments, i);
    const b = new THREE.Vector3().fromArray(segments, i + 3);
    const direction = b.clone().sub(a).normalize();
    const axis = Math.abs(direction.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const u = direction.clone().cross(axis).normalize(), w = direction.clone().cross(u);
    const offset = positions.length / 3;
    for (const end of [a, b]) for (let j = 0; j < sides; j++) {
      const angle = j / sides * Math.PI * 2;
      positions.push(...end.clone().addScaledVector(u, Math.cos(angle) * radius).addScaledVector(w, Math.sin(angle) * radius).toArray());
    }
    for (let j = 0; j < sides; j++) {
      const next = (j + 1) % sides;
      indices.push(offset + j, offset + next, offset + j + sides, offset + next, offset + next + sides, offset + j + sides);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Merge small authored pieces: a few draw calls, not a React mesh per stroke. */
class SketchBuilder {
  private surfaces = new Map<PierSurface, THREE.BufferGeometry[]>();
  private strokes: number[] = [];
  private hatching: number[] = [];

  solid(geometry: THREE.BufferGeometry, position: Point = [0, 0, 0], rotation: Point = [0, 0, 0], shade = 1, kind: PierSurface = "metal") {
    const matrix = new THREE.Matrix4().compose(v(position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
    const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    flat.applyMatrix4(matrix);
    const normal = flat.getAttribute("normal"), points = flat.getAttribute("position");
    const color: number[] = [], uv: number[] = [];
    for (let i = 0; i < normal.count; i++) {
      const tint = shade * pierSurfaceShade(kind, normal.getZ(i));
      color.push(tint, tint, tint);
      // Continuous fine grain across merged parts; mipmaps keep it stable at distance.
      uv.push((points.getX(i) + points.getZ(i) * 0.4) * 7, points.getY(i) * 7);
    }
    flat.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    flat.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
    const pieces = this.surfaces.get(kind) ?? [];
    pieces.push(flat);
    this.surfaces.set(kind, pieces);
  }

  line(points: Point[], fine = false, closed = false) {
    const target = fine ? this.hatching : this.strokes;
    for (let i = 1; i < points.length; i++) target.push(...points[i - 1], ...points[i]);
    if (closed && points.length > 2) target.push(...points[points.length - 1], ...points[0]);
  }

  ring(center: Point, rx: number, ry: number, plane: "xy" | "xz" = "xy", fine = false, count = 24) {
    this.line(Array.from({ length: count }, (_, i): Point => {
      const a = i / count * Math.PI * 2;
      return plane === "xy"
        ? [center[0] + Math.cos(a) * rx, center[1] + Math.sin(a) * ry, center[2]]
        : [center[0] + Math.cos(a) * rx, center[1], center[2] + Math.sin(a) * ry];
    }), fine, true);
  }

  curve(curve: THREE.Curve<THREE.Vector3>, radius: number, segments = 30, kind: PierSurface = "metal") {
    this.solid(new THREE.TubeGeometry(curve, segments, radius, 8, false), [0, 0, 0], [0, 0, 0], 1, kind);
    // Explicit silhouette pencil lines; no dense triangulation/automatic wireframe.
    for (const side of [-1, 1]) {
      this.line(Array.from({ length: segments + 1 }, (_, i): Point => {
        const t = i / segments, p = curve.getPoint(t), tangent = curve.getTangent(t);
        const perpendicular = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        p.addScaledVector(perpendicular, side * radius);
        return [p.x, p.y, p.z + radius + 0.001];
      }));
    }
  }

  finish(name: string, palette: ReturnType<typeof createPalette>) {
    const group = new THREE.Group();
    group.name = name;
    for (const [kind, pieces] of this.surfaces) {
      const geometry = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      if (!geometry) throw new Error(`Could not merge ${name} ${kind}`);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, palette[kind]);
      mesh.name = `${name} ${kind} Surface`;
      group.add(mesh);
    }
    if (this.strokes.length) {
      const contours = new THREE.Mesh(contourGeometry(this.strokes), palette.ink);
      contours.name = `${name} Contours`;
      group.add(contours);
    }
    if (this.hatching.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.hatching, 3));
      geometry.computeBoundingSphere();
      const lines = new THREE.LineSegments(geometry, palette.fine);
      lines.name = `${name} Graphite Hatching`;
      group.add(lines);
    }
    return group;
  }
}

function createRod(reach: number, palette: ReturnType<typeof createPalette>) {
  const s = new SketchBuilder();
  const height = PIER_DECORATION.rodHeight;
  const curve = new THREE.CubicBezierCurve3(v([0, 0, 0]), v([reach * 0.28, height * 0.53, 0]), v([reach * 0.86, height * 0.99, 0]), v([reach, height, 0]));
  // Fine, tapering bamboo blank, individually swept rings rather than a thick pipe.
  const segments = 64, radial = 8, positions: number[] = [], indices: number[] = [];
  const pointAt = (t: number, angle: number, extra = 0) => {
    const p = curve.getPoint(t), tangent = curve.getTangent(t);
    const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const radius = THREE.MathUtils.lerp(0.0105, 0.0024, t) + extra;
    p.addScaledVector(side, Math.cos(angle) * radius);
    p.z += Math.sin(angle) * radius;
    return p;
  };
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < radial; j++) positions.push(...pointAt(i / segments, j / radial * Math.PI * 2).toArray());
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + (j + 1) % radial;
    indices.push(a, b, a + radial, b, b + radial, a + radial);
  }
  const blank = new THREE.BufferGeometry();
  blank.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  blank.setIndex(indices);
  blank.computeVertexNormals();
  s.solid(blank, [0, 0, 0], [0, 0, 0], 1, "shaft");
  for (const angle of [0, Math.PI]) s.line(Array.from({ length: segments + 1 }, (_, i) => {
    const p = pointAt(i / segments, angle, 0.0004);
    p.z += 0.012;
    return p.toArray() as Point;
  }));
  s.line(Array.from({ length: 40 }, (_, i) => pointAt(i / 39, Math.PI / 2).toArray() as Point), true);

  // Wrapped grip and ties, with a small shaded spool/reel on the outside.
  s.curve(new THREE.CubicBezierCurve3(curve.getPoint(0), curve.getPoint(0.04), curve.getPoint(0.08), curve.getPoint(0.12)), 0.015, 12, "grip");
  for (let i = 0; i < 15; i++) {
    const t = 0.005 + i * 0.0075, p = curve.getPoint(t);
    s.line([[p.x - 0.013, p.y - 0.006, 0.016], [p.x + 0.013, p.y + 0.003, 0.016]], true);
  }
  const reel = curve.getPoint(0.04).add(v([-0.053, 0.01, 0.018]));
  s.solid(new THREE.BoxGeometry(0.045, 0.009, 0.012), [reel.x + 0.025, reel.y, reel.z]);
  s.solid(new THREE.CylinderGeometry(0.031, 0.031, 0.023, 16), reel.toArray() as Point, [Math.PI / 2, 0, -0.15], 0.9);
  for (const r of [0.031, 0.024, 0.017, 0.01]) s.ring([reel.x, reel.y, reel.z + 0.0125], r, r * 1.13);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    s.line([[reel.x + Math.cos(a) * 0.008, reel.y + Math.sin(a) * 0.01, reel.z + 0.013], [reel.x + Math.cos(a + 0.13) * 0.03, reel.y + Math.sin(a + 0.13) * 0.031, reel.z + 0.013]], true);
  }
  s.line([[reel.x, reel.y, reel.z + 0.015], [reel.x - 0.011, reel.y - 0.011, reel.z + 0.035], [reel.x - 0.019, reel.y - 0.006, reel.z + 0.035]]);
  for (const t of [0.2, 0.4, 0.6, 0.79, 0.93]) {
    const p = curve.getPoint(t);
    s.ring([p.x - 0.004, p.y, 0.012], 0.008, 0.0045);
    s.line([[p.x - 0.008, p.y - 0.004, 0.009], [p.x + 0.008, p.y - 0.002, 0.009]], true);
  }
  return s.finish("Pier Fishing Rod", palette);
}

function createLetter(palette: ReturnType<typeof createPalette>) {
  const s = new SketchBuilder();
  const w = PIER_DECORATION.envelopeWidth / 2, h = PIER_DECORATION.envelopeHeight;
  s.solid(new THREE.BoxGeometry(w * 2, h, 0.004), [0, -h / 2 - 0.014, 0], [0, 0, 0], 1, "paper");
  const a: Point = [-w, -0.014, 0.0025], b: Point = [w, -0.014, 0.0025];
  const c: Point = [w, -h - 0.014, 0.0025], d: Point = [-w, -h - 0.014, 0.0025];
  s.line([a, b, c, d], false, true);
  s.line([a, [0, -h * 0.66, 0.003], b]);
  s.line([d, [-w * 0.24, -h * 0.51, 0.003]], true);
  s.line([c, [w * 0.24, -h * 0.51, 0.003]], true);
  s.line([[-w + 0.006, -0.024, 0.003], [-w + 0.006, -h + 0.004, 0.003]], true);
  s.ring([0, -0.005, 0.003], 0.006, 0.008);
  s.ring([0, 0.004, 0.003], 0.004, 0.006);
  return s.finish("Pier Hanging Envelope", palette);
}

function createHook(reach: number, palette: ReturnType<typeof createPalette>) {
  const s = new SketchBuilder();
  s.solid(new THREE.BoxGeometry(0.012, 0.075, 0.025), [0, 0.004, -0.004]);
  s.line([[-0.006, -0.033, 0.009], [-0.006, 0.041, 0.009], [0.006, 0.041, 0.009], [0.006, -0.033, 0.009]], false, true);
  for (const y of [-0.025, 0.032]) s.ring([0, y, 0.01], 0.002, 0.003);
  const curve = new THREE.CatmullRomCurve3([
    v([0, 0, 0]), v([-0.035, 0.001, 0]), v([reach * 0.5, 0.043, 0]),
    v([reach * 0.82, 0.062, 0]), v([reach - 0.022, 0.04, 0]),
    v([reach - 0.028, 0.012, 0]), v([reach - 0.009, -0.012, 0]),
    v([reach + 0.014, 0.002, 0]), v([reach + 0.007, 0.024, 0]), v([reach - 0.009, 0.023, 0]),
  ]);
  s.curve(curve, 0.0075, 45);
  return s.finish("Pier Curled Lantern Bracket", palette);
}

function createLantern(palette: ReturnType<typeof createPalette>) {
  const s = new SketchBuilder();
  // Hanging eye, softly rounded cap, six-bar glass cage and bevelled lower rim.
  s.solid(new THREE.TorusGeometry(0.022, 0.003, 5, 24), [0, -0.022, 0]);
  s.ring([0, -0.022, 0.003], 0.024, 0.024);
  s.ring([0, -0.022, 0.003], 0.019, 0.019);
  s.solid(new THREE.CylinderGeometry(0.013, 0.016, 0.015, 10), [0, -0.052, 0]);
  s.solid(new THREE.LatheGeometry([
    new THREE.Vector2(0.084, -0.105), new THREE.Vector2(0.081, -0.098),
    new THREE.Vector2(0.053, -0.078), new THREE.Vector2(0.016, -0.058),
  ], 24));
  s.solid(new THREE.CylinderGeometry(0.084, 0.084, 0.012, 24), [0, -0.108, 0]);
  s.solid(new THREE.CylinderGeometry(0.079, 0.075, 0.014, 24), [0, -0.311, 0]);
  s.solid(new THREE.CylinderGeometry(0.075, 0.064, 0.012, 24), [0, -0.324, 0]);
  const corners = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i;
    return [Math.cos(a) * 0.075, Math.sin(a) * 0.075] as const;
  });
  for (const [y, radius] of [[-0.104, 0.084], [-0.114, 0.084], [-0.304, 0.079], [-0.318, 0.075], [-0.33, 0.064]]) s.ring([0, y, 0], radius, radius, "xz");
  for (const side of [-1, 1]) {
    s.line([[side * 0.015, -0.058, 0.002], [side * 0.055, -0.079, 0.002], [side * 0.084, -0.104, 0.002]]);
  }
  for (const [x, z] of corners) {
    s.solid(new THREE.CylinderGeometry(0.0035, 0.0035, 0.19, 5), [x, -0.209, z]);
    for (const side of [-1, 1]) s.line([[x + side * 0.0036, -0.114, z + 0.002], [x + side * 0.0036, -0.305, z + 0.002]]);
    s.line([[x * 0.2, -0.061, z * 0.2 + 0.002], [x, -0.1, z + 0.002]], true);
  }
  // Crossed slender guard wires seen through the front glass in the mockup.
  s.line([[-0.056, -0.135, 0.059], [0.052, -0.275, 0.059]], true);
  s.line([[0.054, -0.134, 0.061], [-0.048, -0.276, 0.061]], true);
  // Sparse glass highlights, not an opaque white window hiding the candle.
  for (const x of [-0.051, 0.047]) {
    s.line([[x, -0.143, 0.054], [x + 0.009, -0.198, 0.054]], true);
    s.line([[x + 0.003, -0.229, 0.054], [x + 0.009, -0.271, 0.054]], true);
  }
  // Candle, wax rim, two faint drips, and an unlit black wick by day.
  s.solid(new THREE.CylinderGeometry(0.017, 0.019, 0.107, 12), [0, -0.248, 0], [0, 0, 0], 1, "wax");
  s.ring([0, -0.194, 0], 0.017, 0.017, "xz");
  s.line([[-0.017, -0.195, 0.002], [-0.019, -0.302, 0.002]]);
  s.line([[0.017, -0.195, 0.002], [0.019, -0.302, 0.002]]);
  s.line([[-0.007, -0.197, 0.016], [-0.006, -0.23, 0.017]], true);
  s.line([[0.006, -0.2, 0.016], [0.008, -0.217, 0.017]], true);
  s.line([[0, -0.196, 0.005], [0.003, -0.185, 0.005]]);
  const group = s.finish("Pier Candle Lantern", palette);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.188, 6, 1, true), palette.glass);
  glass.name = "Pier Lantern Clear Glass";
  glass.position.y = -0.208;
  glass.rotation.y = Math.PI / 6;
  group.add(glass);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), palette.flame);
  flame.name = "Pier Lantern Candle Flame";
  flame.position.set(0.001, -0.169, 0);
  flame.scale.set(0.009, 0.021, 0.008);
  flame.visible = false;
  group.add(flame);
  return { group, flame };
}

/** A single cheap additive glow, no extra light pool slots, shadows or render pass. */
function createCandleGlow() {
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(Math.exp(-r * r * 5) * (1 - THREE.MathUtils.smoothstep(r, 0.65, 1)) * 255);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: texture, color: "black", opacity: 0.2, transparent: true, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: false });
  // useFogFade fades opacity. Fog colour must not turn an additive halo into a square.
  material.onBeforeCompile = (shader) => { shader.fragmentShader = shader.fragmentShader.replace("#include <fog_fragment>", ""); };
  material.customProgramCacheKey = () => "pier-candle-alpha-fog-v1";
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.4), material);
  mesh.name = "Pier Lantern Soft Candle Glow";
  mesh.position.set(0, -0.195, 0.003);
  return { mesh, material, texture };
}

export function createPierDecorations(rodReach: number, hookReach: number) {
  // Different fog roots never share mutable materials.
  const rodPalette = createPalette(), lanternPalette = createPalette();
  const rod = createRod(rodReach, rodPalette);
  const letterSwing = new THREE.Group();
  letterSwing.name = "Pier Envelope Breeze";
  letterSwing.position.set(rodReach, PIER_DECORATION.rodHeight, 0.008);
  const thread = new SketchBuilder();
  thread.line([[0, 0, 0], [0, -PIER_DECORATION.lineLength, 0]], true);
  letterSwing.add(thread.finish("Pier Fishing Line", rodPalette));
  const letter = createLetter(rodPalette);
  letter.position.y = -PIER_DECORATION.lineLength;
  letterSwing.add(letter);
  rod.add(letterSwing);
  const hook = createHook(hookReach, lanternPalette);
  const lanternSwing = new THREE.Group();
  lanternSwing.name = "Pier Lantern Breeze";
  lanternSwing.position.set(hookReach - 0.008, -0.006, 0.009);
  lanternSwing.scale.setScalar(0.9);
  const lantern = createLantern(lanternPalette);
  const glow = createCandleGlow();
  lanternSwing.add(lantern.group, glow.mesh);
  hook.add(lanternSwing);
  for (const root of [rod, hook]) root.traverse((object) => {
    object.raycast = pierDecorationNoRaycast;
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    }
  });
  const warm = new THREE.Color("#ffd28a");
  let nightAmount = 0;
  let disposed = false;
  return {
    rod, hook, letterSwing, lanternSwing,
    palettes: [rodPalette, lanternPalette],
    flame: lantern.flame,
    glow: glow.mesh,
    applyNight(amount: number) {
      nightAmount = THREE.MathUtils.clamp(amount, 0, 1);
      rodPalette.applyNight(nightAmount);
      lanternPalette.applyNight(nightAmount);
      lantern.flame.visible = nightAmount > 0;
      glow.material.color.copy(warm).multiplyScalar(nightAmount);
    },
    animate(elapsed: number, motionScale: number) {
      const motion = pierDecorationMotion(elapsed, motionScale);
      letterSwing.rotation.z = motion.letterSwing;
      lanternSwing.rotation.z = motion.lanternSwing;
      lantern.flame.scale.y = 0.021 * motion.flameScale;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const root of [rod, hook]) root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) object.geometry.dispose();
      });
      rodPalette.dispose();
      lanternPalette.dispose();
      glow.material.dispose();
      glow.texture.dispose();
    },
  };
}
