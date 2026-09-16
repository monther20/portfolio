import * as THREE from "three";
import { NIGHT_CONFIG } from "../../dayNight/config";

export type PierSurface = "paper" | "shaft" | "grip" | "metal" | "wax";

const SURFACE_COLORS: Record<PierSurface, readonly [string, string]> = {
  paper: ["#ffffff", NIGHT_CONFIG.unlitTint.illustration],
  shaft: ["#ffffff", "#8e9eb4"],
  grip: ["#c4c4c4", "#626c7a"],
  metal: ["#ffffff", "#8592a5"],
  wax: ["#ffffff", "#e7dec9"],
};

/** A tiny monochrome pencil grain, not a glossy environment/reflection map. */
function createGraphiteGrain() {
  const size = 64, data = new Uint8Array(size * size * 4);
  let seed = 1947;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = 247 + (seed >>> 28) / 2;
    const pencil = (x + y * 3) % 19 === 0 ? 8 : 0;
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.round(grain - pencil);
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.name = "Pier neutral pencil grain";
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Authored matte shading keeps day whites independent of the scene's PBR light
 * intensity. Paper stays white; wood, grip and painted metal have separate finishes.
 */
export function pierSurfaceShade(kind: PierSurface, frontNormal: number) {
  const shade = { paper: 1, shaft: 0.9, grip: 0.88, metal: 0.78, wax: 0.97 }[kind];
  return shade + (1 - shade) * Math.max(0, Math.min(1, frontNormal));
}

export function createPierDecorationPalette() {
  const grain = createGraphiteGrain();
  const createSurface = (kind: PierSurface) => {
    const material = new THREE.MeshBasicMaterial({
      color: SURFACE_COLORS[kind][0],
      map: kind === "paper" || kind === "wax" ? null : grain,
      vertexColors: true,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    material.name = `Pier ${kind} matte finish`;
    return material;
  };
  const paper = createSurface("paper"), shaft = createSurface("shaft"), grip = createSurface("grip"), metal = createSurface("metal"), wax = createSurface("wax");
  const surfaces = { paper, shaft, grip, metal, wax };
  // Graphite remains dark ink at night too, not a blue luminous wireframe.
  const ink = new THREE.MeshBasicMaterial({ color: "#303030", transparent: true, opacity: 1, depthTest: true, depthWrite: false, fog: true });
  const fine = new THREE.LineBasicMaterial({ color: "#4c4c4c", transparent: true, opacity: 0.78, depthTest: true, depthWrite: false, fog: true });
  const glass = new THREE.MeshBasicMaterial({ color: "white", transparent: true, opacity: 0.1, depthTest: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, fog: true });
  const flame = new THREE.MeshBasicMaterial({ color: "black", fog: true });
  const materials = [...Object.values(surfaces), ink, fine, glass, flame];
  const transitions = Object.entries(surfaces).map(([kind, material]) => ({
    material,
    day: new THREE.Color(SURFACE_COLORS[kind as PierSurface][0]),
    night: new THREE.Color(SURFACE_COLORS[kind as PierSurface][1]),
  }));
  const dayInk = new THREE.Color("#303030"), nightInk = new THREE.Color("#222832");
  const dayFine = new THREE.Color("#4c4c4c"), nightFine = new THREE.Color("#424b58");
  const white = new THREE.Color("white"), nightGlass = new THREE.Color("#ffe1af");
  let disposed = false;
  return {
    ...surfaces, ink, fine, glass, flame, materials, grain,
    applyNight(amount: number) {
      const mix = THREE.MathUtils.clamp(amount, 0, 1);
      for (const item of transitions) item.material.color.lerpColors(item.day, item.night, mix);
      ink.color.lerpColors(dayInk, nightInk, mix);
      fine.color.lerpColors(dayFine, nightFine, mix);
      glass.color.lerpColors(white, nightGlass, mix);
      flame.color.setRGB(2.8 * mix, 1.85 * mix, 0.72 * mix);
      // Do not overwrite opacity, transparency or depth: useFogFade owns them.
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      materials.forEach((material) => material.dispose());
      grain.dispose();
    },
  };
}
