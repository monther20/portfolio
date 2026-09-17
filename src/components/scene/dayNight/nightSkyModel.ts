import * as THREE from "three";
import { NIGHT_STARS } from "./config";

/** One draw call: fine dust, pencil dots and a handful of four-point glints. */
export function createNightStarGeometry(count: number) {
  let seed = 19507;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const glints = new Float32Array(count);
  const cool = new THREE.Color(NIGHT_STARS.color);
  const warm = new THREE.Color(NIGHT_STARS.warmColor);
  const direction = new THREE.Vector3();
  for (let index = 0; index < count; index++) {
    // The old uniform hemisphere left only a few stars inside the narrow journey
    // FOV. Enrich the forward sky, while retaining a surrounding hemisphere.
    if (index % 5 < 4) {
      // Begin slightly below the geometric horizon. The sea and coastline depth-
      // occlude those points, leaving stars visible right down to the skyline
      // instead of an empty horizontal band above it.
      direction.set((random() - 0.5) * 1.9, -0.075 + random() ** 1.35 * 0.795, -1).normalize();
    } else {
      const azimuth = random() * Math.PI * 2;
      const height = 0.025 + random() * 0.9;
      const horizontal = Math.sqrt(1 - height * height);
      direction.set(Math.cos(azimuth) * horizontal, height, Math.sin(azimuth) * horizontal);
    }
    direction.multiplyScalar(NIGHT_STARS.radius).toArray(positions, index * 3);
    const glint = random() > 0.9;
    glints[index] = glint ? 1 : 0;
    sizes[index] = glint
      ? THREE.MathUtils.lerp(4.5, NIGHT_STARS.maxSize, random())
      : THREE.MathUtils.lerp(NIGHT_STARS.minSize, 3.1, random() ** 2);
    phases[index] = random() * Math.PI * 2;
    (random() > 0.82 ? warm : cool).toArray(colors, index * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("starSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("glint", new THREE.BufferAttribute(glints, 1));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function createNightStarMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 }, time: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `attribute float starSize; attribute float phase; attribute float glint;
      uniform float pixelRatio; uniform float time;
      varying float brightness; varying vec3 starColor; varying float sparkle;
      void main() {
        starColor = color; sparkle = glint;
        brightness = 0.86 + 0.14 * sin(time * 0.48 + phase);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = starSize * pixelRatio;
      }`,
    fragmentShader: `uniform float opacity;
      varying float brightness; varying vec3 starColor; varying float sparkle;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float core = exp(-5.5 * dot(p, p));
        float cross = exp(-24.0 * abs(p.x) - 3.5 * abs(p.y)) + exp(-24.0 * abs(p.y) - 3.5 * abs(p.x));
        float ink = min(1.0, core * 0.85 + cross * sparkle * 0.42);
        gl_FragColor = vec4(starColor, ink * opacity * brightness);
        #include <colorspace_fragment>
      }`,
    transparent: true, vertexColors: true, depthWrite: false, depthTest: true, toneMapped: false,
  });
}

const planeVertex = `varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/** Analytic paper crescent: no image download, lights, bloom or painted sky disk. */
export function createMoonMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      opacity: { value: 0 },
      paper: { value: new THREE.Color("#eee7d5") },
      graphite: { value: new THREE.Color("#a9b3c4") },
    },
    vertexShader: planeVertex,
    fragmentShader: `varying vec2 vUv;
      uniform float opacity; uniform vec3 paper; uniform vec3 graphite;
      float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ring(vec2 p, vec2 center, float radius, float aa) {
        return 1.0 - smoothstep(0.009, 0.009 + aa, abs(length(p - center) - radius));
      }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y, p.x);
        float edge = r - 0.62 + sin(angle * 19.0) * 0.0018 + sin(angle * 37.0) * 0.001;
        float cut = length(p - vec2(0.285, 0.16)) - 0.575;
        float aa = max(fwidth(r), 0.001);
        float body = (1.0 - smoothstep(-aa, aa, edge)) * smoothstep(-aa, aa, cut);
        float pencilEdge = (1.0 - smoothstep(0.002, 0.013 + aa, min(abs(edge), abs(cut)))) * body;
        float craters = ring(p, vec2(-0.37, 0.08), 0.074, aa)
          + ring(p, vec2(-0.20, -0.35), 0.048, aa)
          + ring(p, vec2(-0.43, -0.17), 0.028, aa);
        float hatch = smoothstep(0.88, 1.0, sin((p.x + p.y * 0.72) * 115.0))
          * (0.35 + 0.65 * (1.0 - smoothstep(-0.58, -0.15, p.x)));
        float fleck = grain(floor(vUv * 430.0));
        vec3 ink = mix(paper, graphite, 0.07 * hatch + 0.085 * fleck + craters * 0.14 + pencilEdge * 0.38);
        float halo = exp(-7.0 * r * r) * 0.035;
        // Broken, slightly imperfect pencil arcs outside the crescent.
        float arc = (1.0 - smoothstep(0.001, 0.001 + aa, abs(r - 0.76 - sin(angle * 7.0) * 0.004)))
          * smoothstep(-0.25, 0.3, sin(angle * 2.0 + 0.7)) * 0.11;
        float alpha = body * 0.97 + (halo + arc) * (1.0 - body);
        alpha *= 1.0 - smoothstep(0.88, 1.0, r);
        gl_FragColor = vec4(ink, alpha * opacity);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
  });
}

/** Tapered chalk trail, with a small pearl head instead of a neon/bloom streak. */
export function createMeteorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 }, ink: { value: new THREE.Color("#e2e5ef") } },
    vertexShader: planeVertex,
    fragmentShader: `varying vec2 vUv; uniform float opacity; uniform vec3 ink;
      void main() {
        float along = vUv.x;
        float y = (vUv.y - 0.5) * 2.0 + sin(along * 8.0) * 0.045 * (1.0 - along);
        float taper = pow(along, 1.7) * (1.0 - smoothstep(0.97, 1.0, along));
        float width = mix(0.045, 0.11, along);
        float line = exp(-pow(y / width, 2.0)) * taper;
        float haze = exp(-y * y * 14.0) * taper * 0.16;
        float head = exp(-pow((along - 0.967) * 65.0, 2.0) - y * y * 32.0);
        float echo = exp(-pow((y - 0.25) * 26.0, 2.0)) * pow(along, 0.9) * (1.0 - along) * 0.22;
        gl_FragColor = vec4(ink, min(1.0, line * 0.75 + haze + head + echo) * opacity);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
  });
}
