import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = "public/textures/textures/corridor/avatar_anim";
const sourcePath = path.join(dir, "avatar.png");
const size = 1024;
const outputFrames = 9;

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function createCharacterMask(rgb) {
  const total = size * size;
  const dark = new Uint8Array(total);
  const blocked = new Uint8Array(total);
  const flood = new Uint8Array(total);

  for (let i = 0; i < total; i += 1) {
    const p = i * 3;
    dark[i] = luminance(rgb[p], rgb[p + 1], rgb[p + 2]) < 225 ? 1 : 0;
  }

  // Thicken line art before flood-filling from the border so tiny antialias gaps
  // do not let the background leak into the character silhouette.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = y * size + x;
      if (!dark[idx]) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          blocked[ny * size + nx] = 1;
        }
      }
    }
  }

  const queue = [];
  const push = (x, y) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = y * size + x;
    if (blocked[idx] || flood[idx]) return;
    flood[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < size; x += 1) {
    push(x, 0);
    push(x, size - 1);
  }
  for (let y = 0; y < size; y += 1) {
    push(0, y);
    push(size - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const idx = queue[head];
    const x = idx % size;
    const y = Math.floor(idx / size);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    mask[i] = flood[i] ? 0 : 1;
  }
  return mask;
}

function createArmMask(characterMask) {
  // Polygon around the forearm/hand in the 1024x1024 resized avatar.
  // The upper arm stays mostly fixed while the forearm and hand wave.
  const polygon = [
    [685, 326],
    [730, 356],
    [778, 318],
    [799, 276],
    [828, 230],
    [864, 212],
    [898, 235],
    [870, 278],
    [828, 305],
    [796, 342],
    [746, 398],
    [708, 388],
    [670, 358],
  ];

  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = y * size + x;
      if (characterMask[idx] && pointInPolygon(x + 0.5, y + 0.5, polygon)) {
        mask[idx] = 1;
      }
    }
  }
  return mask;
}

function sampleBilinear(buffer, x, y) {
  if (x < 0 || x >= size - 1 || y < 0 || y >= size - 1) return [0, 0, 0, 0];
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const dx = x - x0;
  const dy = y - y0;
  const result = [0, 0, 0, 0];

  for (let yy = 0; yy <= 1; yy += 1) {
    for (let xx = 0; xx <= 1; xx += 1) {
      const weight = (xx ? dx : 1 - dx) * (yy ? dy : 1 - dy);
      const idx = ((y0 + yy) * size + x0 + xx) * 4;
      result[0] += buffer[idx] * weight;
      result[1] += buffer[idx + 1] * weight;
      result[2] += buffer[idx + 2] * weight;
      result[3] += buffer[idx + 3] * weight;
    }
  }

  return result;
}

function compositeOver(dst, src, idx) {
  const sa = src[3] / 255;
  if (sa <= 0) return;

  const da = dst[idx + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;

  dst[idx] = Math.round((src[0] * sa + dst[idx] * da * (1 - sa)) / outA);
  dst[idx + 1] = Math.round((src[1] * sa + dst[idx + 1] * da * (1 - sa)) / outA);
  dst[idx + 2] = Math.round((src[2] * sa + dst[idx + 2] * da * (1 - sa)) / outA);
  dst[idx + 3] = Math.round(outA * 255);
}

function createFrame(baseRgba, armRgba, degrees) {
  const frame = Buffer.from(baseRgba);
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const pivotX = 705;
  const pivotY = 356;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const rx = x - pivotX;
      const ry = y - pivotY;
      const sx = pivotX + rx * cos + ry * sin;
      const sy = pivotY - rx * sin + ry * cos;
      const sampled = sampleBilinear(armRgba, sx, sy);
      compositeOver(frame, sampled, (y * size + x) * 4);
    }
  }

  return frame;
}

const { data: rgb } = await sharp(sourcePath)
  .resize(size, size, { fit: "contain", background: "#ffffff" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const characterMask = createCharacterMask(rgb);
const armMask = createArmMask(characterMask);
const baseRgba = Buffer.alloc(size * size * 4);
const armRgba = Buffer.alloc(size * size * 4);

for (let i = 0; i < size * size; i += 1) {
  const rgbIdx = i * 3;
  const rgbaIdx = i * 4;
  const alpha = characterMask[i] ? 255 : 0;

  baseRgba[rgbaIdx] = rgb[rgbIdx];
  baseRgba[rgbaIdx + 1] = rgb[rgbIdx + 1];
  baseRgba[rgbaIdx + 2] = rgb[rgbIdx + 2];
  baseRgba[rgbaIdx + 3] = armMask[i] ? 0 : alpha;

  armRgba[rgbaIdx] = rgb[rgbIdx];
  armRgba[rgbaIdx + 1] = rgb[rgbIdx + 1];
  armRgba[rgbaIdx + 2] = rgb[rgbIdx + 2];
  armRgba[rgbaIdx + 3] = armMask[i] ? alpha : 0;
}

const angles = [-10, -6, 0, 6, 10, 6, 0, -6, -10];
const previews = [];
const previewCell = 220;
const previewGap = 12;

for (let i = 0; i < outputFrames; i += 1) {
  const frame = createFrame(baseRgba, armRgba, angles[i]);
  const outputPath = path.join(dir, `${i + 1}.webp`);
  await sharp(frame, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 95, effort: 6 })
    .toFile(outputPath);

  const preview = await sharp(frame, { raw: { width: size, height: size, channels: 4 } })
    .resize(previewCell, previewCell, { fit: "contain" })
    .flatten({ background: "#f4f4f4" })
    .png()
    .toBuffer();

  previews.push({
    input: preview,
    left: previewGap + (i % 3) * (previewCell + previewGap),
    top: previewGap + Math.floor(i / 3) * (previewCell + previewGap),
  });
}

await sharp({
  create: {
    width: previewGap * 4 + previewCell * 3,
    height: previewGap * 4 + previewCell * 3,
    channels: 4,
    background: "#ffffff",
  },
})
  .composite(previews)
  .png()
  .toFile(path.join(dir, "avatar_wave_preview.png"));

console.log(`Generated ${outputFrames} waving avatar frames from ${sourcePath}`);
console.log(`Preview: ${path.join(dir, "avatar_wave_preview.png")}`);
