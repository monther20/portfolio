import * as THREE from "three";

/** Apply only to instance-owned materials, never the cached GLB. The generated
 * gray metal/beige glass suit night, but look too heavy against the daytime art.
 * Keep the pencil maps and interpolate from fixed endpoints for reversible fades.
 */
export function createCorridorFixturePalette(materials: Iterable<THREE.Material>) {
  const surfaces = Array.from(materials).flatMap((material) => {
    if (
      !(material instanceof THREE.MeshStandardMaterial) &&
      !(material instanceof THREE.LineBasicMaterial)
    ) return [];

    const isGlass = material.name === "Sketch_Glass";
    const isFrame = material.name === "Pencil_Metalwork";
    const isContour = material.name === "Graphite_Contours";
    if (!isGlass && !isFrame && !isContour) return [];

    return [{
      material,
      dayColor: new THREE.Color(isContour ? "#9a9a9a" : "#ffffff"),
      nightColor: material.color.clone(),
      dayOpacity: isGlass ? 0.5 : material.opacity,
      nightOpacity: material.opacity,
    }];
  });

  return (nightAmount: number) => {
    for (const surface of surfaces) {
      surface.material.color.copy(surface.dayColor).lerp(surface.nightColor, nightAmount);
      surface.material.opacity = THREE.MathUtils.lerp(
        surface.dayOpacity,
        surface.nightOpacity,
        nightAmount,
      );
    }
  };
}
