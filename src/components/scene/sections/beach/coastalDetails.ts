export type CoastalDetailStroke = {
  kind: "pine" | "rock" | "contour";
  from: readonly [number, number];
  to: readonly [number, number];
  strength: number;
  /** Local glyph offsets can retain their proportions on a narrow coastline. */
  anchorX?: number;
};

/** Small static pencil marks, batched into the existing ridge line buffers. */
export function createCoastalDetailStrokes(
  layerIndex: number,
  heightAt: (x: number) => number,
): CoastalDetailStroke[] {
  let seed = 7319 + layerIndex * 913;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const strokes: CoastalDetailStroke[] = [];
  const add = (
    kind: CoastalDetailStroke["kind"],
    ax: number, ay: number, bx: number, by: number,
    strength: number,
    anchorX?: number,
  ) => {
    // Rock seams belong inside the paper silhouette, not in the sky or water.
    if (kind !== "pine") {
      ay = Math.min(heightAt(ax) * 0.96, Math.max(0.09, ay));
      by = Math.min(heightAt(bx) * 0.96, Math.max(0.09, by));
    }
    if (Math.hypot(bx - ax, by - ay) < 0.0001) return;
    strokes.push({ kind, from: [ax, ay], to: [bx, by], strength, anchorX });
  };

  // Short broken strata wrap around the flanks rather than striping the whole range.
  for (const center of [-0.96, -0.78, -0.53, -0.36, 0.3, 0.48, 0.7, 0.94]) {
    const top = heightAt(center);
    for (let row = 0; row < 3; row++) {
      const start = center - 0.042 + random() * 0.014;
      const level = top * (0.38 + row * 0.17);
      let px = start, py = level;
      for (let step = 1; step <= 4; step++) {
        const x = start + step * (0.018 + random() * 0.006);
        const y = level + Math.sin(step * 0.85 + row) * 0.018 + (heightAt(x) - top) * 0.28;
        if (step !== 3 || row === 1) add("contour", px, py, x, y, 0.17 + random() * 0.07);
        px = x; py = y;
      }
    }
  }

  // Leave the most distant peaks bare: sparse conifers live on the nearer shoulders.
  if (layerIndex > 0) {
    const clusters = layerIndex === 1 ? [-0.9, -0.46, 0.39, 0.82] : [-0.83, -0.6, 0.51, 0.83];
    for (const center of clusters) {
      for (let tree = 0; tree < 4; tree++) {
        const x = center + (tree - 1.5) * 0.016 + (random() - 0.5) * 0.005;
        const base = heightAt(x) - 0.012;
        const height = (layerIndex === 1 ? 0.045 : 0.12) * (1 + random() * 0.7);
        const halfWidth = height * 0.048;
        const lean = (random() - 0.5) * halfWidth * 0.35;
        add("pine", x, base, x + lean, base + height, 0.65, x);
        for (let branch = 0; branch < 5; branch++) {
          const spread = 0.24 + branch * 0.15;
          const y = base + height * (0.86 - branch * 0.145);
          const trunkX = x + lean * (y - base) / height;
          add("pine", trunkX, y, trunkX - halfWidth * spread, y - height * 0.18, 0.58, x);
          add("pine", trunkX, y - height * 0.025, trunkX + halfWidth * spread * 0.91, y - height * 0.19, 0.53, x);
        }
      }
    }

    // Tiny angular outcrops and split faces on the lower slopes/rocky waterline.
    for (const center of [-0.91, -0.72, -0.5, -0.34, 0.31, 0.54, 0.73, 0.93]) {
      for (let rock = 0; rock < 2; rock++) {
        const x = center + rock * 0.019;
        const y = heightAt(x) * (layerIndex === 2 ? 0.55 : 0.77);
        const width = 0.008 + random() * 0.009;
        const height = (layerIndex === 2 ? 0.035 : 0.014) * (1 + random());
        const points = [[x - width, y], [x - width * 0.55, y + height * 0.7], [x + width * 0.18, y + height], [x + width, y + height * 0.25], [x + width * 0.65, y]] as const;
        points.slice(1).forEach((point, index) => {
          add("rock", ...points[index], ...point, 0.3);
        });
        add("rock", x + width * 0.18, y + height, x - width * 0.1, y + height * 0.16, 0.22);
      }
    }
  }
  return strokes;
}
