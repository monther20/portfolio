import * as THREE from "three";
import { BEACH, JOURNEY } from "../../journeyConfig";
import { createCoastalDetailStrokes } from "./coastalDetails";

/** Match the actual back edge of the finite illustrated sea, not the camera horizon. */
export const SEA_SIZE = { width: 80, depth: 70 } as const;
export const SEA_HORIZON_Z = BEACH.seaZ - SEA_SIZE.depth / 2;

/** Submerged paper skirts meet the finite water's distant edge in projection.
 * The ridges themselves stay fixed well beyond it, rather than following the camera.
 */
function coastBaseY(z: number) {
  const seaDistance = JOURNEY.farBound - SEA_HORIZON_Z;
  const coastDistance = JOURNEY.farBound - z;
  return JOURNEY.beachY + (BEACH.seaY - JOURNEY.beachY) * coastDistance / seaDistance - 0.08;
}

type RidgePoint = readonly [number, number];
type CoastLayer = {
  name: string;
  z: number;
  baseY: number;
  height: number;
  profile: readonly RidgePoint[];
  day: string;
  night: string;
  dayInk: string;
  nightInk: string;
};

// Asymmetric peaks, saddles and low headlands. The quiet central valley leaves
// room above the contact signs; the long shoulders continue beyond the viewport.
export const COAST_LAYERS: readonly CoastLayer[] = [
  {
    name: "Distant Coastal Peaks", z: SEA_HORIZON_Z - 48, baseY: coastBaseY(SEA_HORIZON_Z - 48), height: 4.25,
    day: "#eeeeee", night: "#19253a", dayInk: "#a0a0a0", nightInk: "#202b3f",
    profile: [[-3, 0.25], [-2.2, 0.65], [-1.65, 0.34], [-1.22, 0.57], [-1.04, 0.44], [-0.88, 0.74], [-0.72, 0.95], [-0.62, 0.79], [-0.51, 0.86], [-0.34, 0.54], [-0.19, 0.36], [0.02, 0.24], [0.17, 0.43], [0.31, 0.7], [0.4, 0.62], [0.56, 0.89], [0.68, 0.73], [0.82, 0.5], [1.02, 0.38], [1.23, 0.62], [1.6, 0.33], [2.2, 0.7], [3, 0.3]],
  },
  {
    name: "Pencil Coastal Ridge", z: SEA_HORIZON_Z - 38, baseY: coastBaseY(SEA_HORIZON_Z - 38), height: 2.9,
    day: "#dedede", night: "#17283a", dayInk: "#838383", nightInk: "#202c40",
    profile: [[-3, 0.2], [-2, 0.55], [-1.4, 0.32], [-1.06, 0.4], [-0.91, 0.54], [-0.77, 0.45], [-0.59, 0.84], [-0.48, 0.69], [-0.33, 0.6], [-0.19, 0.3], [-0.02, 0.17], [0.18, 0.23], [0.35, 0.49], [0.48, 0.43], [0.68, 0.81], [0.8, 0.66], [0.96, 0.42], [1.16, 0.27], [1.55, 0.52], [2, 0.35], [3, 0.2]],
  },
  {
    name: "Rocky Shore Headlands", z: SEA_HORIZON_Z - 30, baseY: coastBaseY(SEA_HORIZON_Z - 30), height: 1.12,
    day: "#cccccc", night: "#142737", dayInk: "#727272", nightInk: "#212c40",
    profile: [[-3, 0.2], [-2, 0.48], [-1.5, 0.3], [-1.15, 0.37], [-0.94, 0.59], [-0.79, 0.7], [-0.62, 0.57], [-0.42, 0.47], [-0.24, 0.22], [-0.06, 0.12], [0.12, 0.15], [0.29, 0.34], [0.44, 0.49], [0.61, 0.6], [0.73, 0.51], [0.88, 0.36], [1.03, 0.23], [1.3, 0.5], [1.8, 0.3], [2.4, 0.6], [3, 0.2]],
  },
];

export function coastVisibility(cameraZ: number) {
  // Arrive naturally during descent, and disappear again on backtracking.
  return THREE.MathUtils.smoothstep(JOURNEY.descentStartZ - cameraZ, 0, 15);
}

export function coastLayerLayout(index: number, fov: number, aspect: number) {
  const layer = COAST_LAYERS[index];
  const distance = JOURNEY.farBound - layer.z;
  return {
    halfWidth: Math.tan(THREE.MathUtils.degToRad(fov / 2)) * distance * aspect,
    height: layer.height * Math.min(1, 0.66 + aspect * 0.5),
    baseY: layer.baseY,
    z: layer.z,
  };
}

/** Slightly softened ridges with deterministic chips, never a repeating sawtooth. */
export function ridgeHeightAt(profile: readonly RidgePoint[], x: number) {
  const clamped = THREE.MathUtils.clamp(x, profile[0][0], profile[profile.length - 1][0]);
  let i = 1;
  while (i < profile.length - 1 && profile[i][0] < clamped) i++;
  const [ax, ay] = profile[i - 1], [bx, by] = profile[i];
  const t = (clamped - ax) / (bx - ax);
  const rounded = t * 0.55 + THREE.MathUtils.smoothstep(t, 0, 1) * 0.45;
  const chips = Math.sin(clamped * 83 + i) * Math.sin(clamped * 137 + 0.8) * 0.011 * Math.sin(t * Math.PI);
  return Math.max(0.06, THREE.MathUtils.lerp(ay, by, rounded) + chips);
}

const vertexShader = `varying vec2 vPoint; varying float vCrest;
  attribute float crest;
  void main() {
    vPoint = position.xy; vCrest = crest;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

function createRidgeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 }, paper: { value: new THREE.Color() }, ink: { value: new THREE.Color() } },
    vertexShader,
    fragmentShader: `varying vec2 vPoint; varying float vCrest;
      uniform float opacity; uniform vec3 paper; uniform vec3 ink;
      float noise(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float slope = vPoint.y / max(vCrest, 0.01);
        float pencil = vPoint.x * 83.0 + vPoint.y * 57.0;
        float aa = max(fwidth(pencil), 0.01);
        float hatch = 1.0 - smoothstep(0.035, 0.035 + aa, abs(fract(pencil) - 0.5));
        float face = smoothstep(-0.35, 0.75, sin(vPoint.x * 13.0 + vPoint.y * 3.2));
        float grain = noise(floor(vPoint * vec2(1200.0, 500.0)));
        float graphite = face * (0.055 + hatch * 0.12) + grain * 0.045;
        vec3 color = mix(paper, ink, graphite * smoothstep(0.03, 0.5, slope));
        // Feather the foot into the sea instead of drawing a hard cardboard seam.
        float alpha = smoothstep(0.0, 0.12, vPoint.y) * opacity;
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
  });
}

function createPencilMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 }, ink: { value: new THREE.Color() }, detailWidth: { value: 1 } },
    vertexShader: `attribute float strength; attribute float shapeOffset;
      uniform float detailWidth; varying float pencilAlpha;
      void main() {
        pencilAlpha = strength;
        vec3 point = position;
        // Only tree glyphs need this correction; ridge/rock coordinates stay fixed.
        point.x += shapeOffset * (detailWidth - 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
      }`,
    fragmentShader: `uniform vec3 ink; uniform float opacity; varying float pencilAlpha;
      void main() {
        gl_FragColor = vec4(ink, opacity * pencilAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
  });
}

const ignoreRaycast = () => {};

export function createCoastalLandscape() {
  const group = new THREE.Group();
  group.name = "Illustrated Mountain Coast";
  group.visible = false;
  const layers = COAST_LAYERS.map((config, layerIndex) => {
    const positions: number[] = [], crests: number[] = [], indices: number[] = [];
    const strokes: number[] = [], strengths: number[] = [], shapeOffsets: number[] = [];
    const stroke = (ax: number, ay: number, bx: number, by: number, strength: number, anchorX?: number) => {
      strokes.push(ax, ay, 0.002, bx, by, 0.002);
      const softened = strength * (0.62 + layerIndex * 0.16);
      strengths.push(softened, softened);
      shapeOffsets.push(anchorX === undefined ? 0 : ax - anchorX, anchorX === undefined ? 0 : bx - anchorX);
    };
    const segments = 420;
    for (let i = 0; i <= segments; i++) {
      const x = -3 + i * 6 / segments;
      const crest = ridgeHeightAt(config.profile, x);
      positions.push(x, 0, 0, x, crest, 0);
      crests.push(crest, crest);
      if (i > 0) {
        const prev = (i - 1) * 2;
        indices.push(prev, prev + 2, prev + 1, prev + 1, prev + 2, prev + 3);
        const px = x - 6 / segments, py = ridgeHeightAt(config.profile, px);
        stroke(px, py, x, crest, 0.65);
        if (i % 5 !== 0) stroke(px + 0.002, py + 0.009, x + 0.002, crest + 0.009, 0.19);
      }
    }
    // Broken ridgelines and small contour hatches, branching from actual peaks.
    config.profile.forEach(([x, y], i, profile) => {
      if (i === 0 || i === profile.length - 1 || y < 0.3 || y <= profile[i - 1][1] || y <= profile[i + 1][1]) return;
      const side = i % 2 === 0 ? 1 : -1;
      let px = x, py = y * 0.98;
      for (let j = 1; j <= 6; j++) {
        const nx = x + side * (j * 0.027 + Math.sin(j * 2.3 + i) * 0.012);
        const ny = Math.min(y * (1 - j * 0.126), ridgeHeightAt(profile, nx) * 0.95);
        stroke(px, py, nx, ny, 0.42);
        for (let k = 0; k < 3; k++) {
          const hx = nx - side * (0.022 + k * 0.024), hy = ny - 0.012 - k * 0.028;
          if (hy > 0.07 && hy < ridgeHeightAt(profile, hx)) stroke(nx, ny, hx, hy, 0.17);
        }
        px = nx; py = ny;
      }
    });
    // Short, uneven tide marks at the foot of the closest headlands.
    if (layerIndex === 2) for (let i = 0; i < 60; i++) {
      const x = -2.7 + i * 0.09;
      stroke(x, 0.05 + (i % 3) * 0.02, x + 0.035 + (i % 4) * 0.009, 0.052 + (i % 3) * 0.02, 0.3);
    }
    const details = createCoastalDetailStrokes(layerIndex, (x) => ridgeHeightAt(config.profile, x));
    for (const detail of details) stroke(...detail.from, ...detail.to, detail.strength, detail.anchorX);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("crest", new THREE.Float32BufferAttribute(crests, 1));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(strokes, 3));
    lineGeometry.setAttribute("strength", new THREE.Float32BufferAttribute(strengths, 1));
    lineGeometry.setAttribute("shapeOffset", new THREE.Float32BufferAttribute(shapeOffsets, 1));
    lineGeometry.computeBoundingSphere();
    // Include the shader's small glyph-width correction in culling bounds.
    lineGeometry.boundingSphere!.radius += 0.05;
    const material = createRidgeMaterial(), pencil = createPencilMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    const lines = new THREE.LineSegments(lineGeometry, pencil);
    const root = new THREE.Group();
    root.name = config.name;
    mesh.name = `${config.name} Paper`;
    lines.name = `${config.name} Graphite`;
    // Intentional backdrop ordering: sky -> layered coast -> sea/contact artwork.
    mesh.renderOrder = -30 + layerIndex * 2;
    lines.renderOrder = mesh.renderOrder + 1;
    mesh.raycast = lines.raycast = ignoreRaycast;
    root.add(mesh, lines);
    group.add(root);
    return {
      root, mesh, lines, material, pencil,
      day: new THREE.Color(config.day), night: new THREE.Color(config.night),
      dayInk: new THREE.Color(config.dayInk), nightInk: new THREE.Color(config.nightInk),
    };
  });
  let disposed = false;
  return {
    group, layers,
    layout(fov: number, aspect: number) {
      layers.forEach((layer, index) => {
        const layout = coastLayerLayout(index, fov, aspect);
        layer.root.position.set(0, layout.baseY, layout.z);
        layer.root.scale.set(layout.halfWidth, layout.height, 1);
        layer.pencil.uniforms.detailWidth.value = layout.height * 5.8 / layout.halfWidth;
      });
    },
    applyNight(amount: number) {
      const mix = THREE.MathUtils.clamp(amount, 0, 1);
      layers.forEach((layer) => {
        layer.material.uniforms.paper.value.copy(layer.day).lerp(layer.night, mix);
        layer.material.uniforms.ink.value.copy(layer.dayInk).lerp(layer.nightInk, mix);
        layer.pencil.uniforms.ink.value.copy(layer.dayInk).lerp(layer.nightInk, mix);
      });
    },
    setVisibility(opacity: number) {
      const amount = THREE.MathUtils.clamp(opacity, 0, 1);
      group.visible = amount > 0.001;
      layers.forEach((layer) => {
        layer.material.uniforms.opacity.value = amount;
        layer.pencil.uniforms.opacity.value = amount;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      layers.forEach(({ mesh, lines, material, pencil }) => {
        mesh.geometry.dispose(); lines.geometry.dispose(); material.dispose(); pencil.dispose();
      });
    },
  };
}
