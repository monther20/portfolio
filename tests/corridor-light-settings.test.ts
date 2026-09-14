import { test } from "node:test";
import assert from "node:assert/strict";
import { createCorridorLightSettings } from "../src/components/scene/corridor/corridorLightSettings";
import { CORRIDOR } from "../src/components/scene/journeyConfig";
import { CORRIDOR_LAMPS, CORRIDOR_LAMP_DEPTHS, NIGHT_CONFIG } from "../src/components/scene/dayNight/config";

test("corridor inspector preserves the tuned lights and lantern layout", () => {
  const settings = createCorridorLightSettings();
  assert.deepEqual(settings.lighting, { intensity: 4.8, fadeNear: 19, fadeFar: 23 });
  assert.deepEqual(settings.lanterns, {
    glassEmission: 2.9,
    sourceEmission: 6.05,
    glassColor: "#ffbd69",
    sourceColor: "#ffd59c",
  });
  const savedOffsets = [
    [0.11, 0, 0], [0, 0, 0], [1.22, -0.37, 0], [-1.2, 0.37, 0],
    [1.2, 0.37, 0], [-1.2, 0.37, 0], [1.2, 0.37, 0], [0, -1.32, 0.11],
  ];
  const savedRotations = [
    [0, 1.5707963267948966, 0], [0, 0, 0], [0, 1.5707963267948966, 0],
    [0, -1.57159265358979, 0], [0, 1.5707963267948966, 0],
    [0, -1.5707963267948966, 0], [0, 1.5707963267948966, 0],
    [-0.00159265358979299, 0, -0.00159265358979299],
  ];
  assert.equal(settings.lighting.intensity, CORRIDOR_LAMPS.intensity);
  assert.equal(settings.lighting.fadeNear, CORRIDOR_LAMPS.fadeNear);
  assert.equal(settings.lighting.fadeFar, CORRIDOR_LAMPS.fadeFar);
  assert.equal(settings.lanterns.glassEmission, CORRIDOR_LAMPS.glassEmission);
  assert.equal(settings.lanterns.sourceEmission, CORRIDOR_LAMPS.sourceEmission);
  assert.equal(settings.lanterns.glassColor, NIGHT_CONFIG.glassEmissiveColor);
  assert.equal(settings.lanterns.sourceColor, NIGHT_CONFIG.sourceEmissiveColor);
  assert.equal(settings.fixtures.length, CORRIDOR_LAMP_DEPTHS.length);
  settings.fixtures.forEach((fixture, index) => {
    const pendant = index === 1 || index === 7;
    const side = index % 2 === 0 ? -1 : 1;
    assert.equal(fixture.pendant, pendant);
    assert.deepEqual(fixture.position, [
      pendant ? 0 : side * (CORRIDOR.halfWidth - CORRIDOR_LAMPS.wallInset),
      pendant ? CORRIDOR.ceilY - CORRIDOR_LAMPS.ceilingInset : CORRIDOR_LAMPS.sconceHeight,
      CORRIDOR.startZ - CORRIDOR_LAMP_DEPTHS[index],
    ]);
    assert.deepEqual(fixture.rotation, savedRotations[index]);
    assert.equal(fixture.visible, true);
    assert.equal(fixture.scale, 1);
    assert.equal(fixture.intensityMultiplier, 1);
    assert.deepEqual(fixture.lightOffset, savedOffsets[index]);
  });
});

test("corridor inspector drafts and reset defaults are independent and JSON-safe", () => {
  const draft = createCorridorLightSettings();
  const defaults = createCorridorLightSettings();
  assert.deepEqual(JSON.parse(JSON.stringify(draft)), defaults);
  draft.fixtures[0].position[0] = 42;
  draft.fixtures[0].rotation[1] = 0;
  draft.fixtures[0].lightOffset[2] = 3;
  draft.lighting.intensity = 0;
  draft.lanterns.glassColor = "#000000";
  assert.deepEqual(createCorridorLightSettings(), defaults);
  assert.notEqual(draft.fixtures[0].position[0], defaults.fixtures[0].position[0]);
});
