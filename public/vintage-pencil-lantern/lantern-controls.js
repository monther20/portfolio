/** Three.js r180. Call once for each independently cloned model instance. */
import * as THREE from 'three';

export function createLanternControls(root, { spillLight = false } = {}) {
  const glass = root.getObjectByName('Glass_Panels');
  const interior = root.getObjectByName('Interior_Emissive_Light');
  if (!glass?.isMesh || !interior?.isMesh) throw new Error('Expected named lantern meshes.');

  // glTF materials may be shared across loaded instances; clone the two controls.
  glass.material = glass.material.clone();
  interior.material = interior.material.clone();
  glass.material.depthWrite = false;
  glass.material.side = THREE.FrontSide;
  glass.material.roughness = 1;
  glass.renderOrder = 2;
  interior.renderOrder = 1;
  interior.material.toneMapped = false;
  // Default mode needs no runtime shader modifications, lights, or bloom passes.
  let point = null;
  if (spillLight) {
    point = new THREE.PointLight(0xffc080, 0, 1.4, 2);
    point.position.set(0, 0.30, 0);
    point.castShadow = false;
    root.add(point);
  }
  let enabled = false;
  function setLight(on, intensity = 1) {
    enabled = Boolean(on);
    const power = enabled ? Math.max(0, intensity) : 0;
    interior.visible = power > 0;
    interior.material.opacity = power > 0 ? 1 : 0;
    glass.material.color.set(enabled ? 0xffe4b9 : 0xbcbcbc);
    glass.material.emissive.set(0xffae50);
    glass.material.emissiveIntensity = power * 1.35;
    interior.material.emissive.set(0xffd59c);
    interior.material.emissiveIntensity = power * 3;
    interior.material.color.set(enabled ? 0xffe5c4 : 0x505050);
    if (point) point.intensity = power * 0.10;
  }
  function dispose() {
    glass.material.dispose();
    interior.material.dispose();
    if (point) { point.removeFromParent(); point.dispose(); }
  }
  setLight(false);
  return { setLight, get isOn() { return enabled; }, glass, interior, point, dispose };
}
