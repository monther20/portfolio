import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildResponsiveExperienceProfile } from "../src/components/ResponsiveExperience";
import {
  CORRIDOR_READING_DISTANCE,
  corridorGreeterLayout,
  corridorStationCenter,
  corridorStationReadingAngles,
} from "../src/components/scene/corridor/corridorFraming";
import { corridorHingedWallSettings } from "../src/components/scene/corridor/hingedWallSettings";
import { JOURNEY, corridorStationZ } from "../src/components/scene/journeyConfig";
import { JOURNEY_SECTIONS } from "../src/components/scene/sectionNavigation";

const sizes = [[320, 844], [390, 844], [430, 932], [768, 1024], [844, 390], [1280, 800], [1920, 1080]];

function profileFor(width: number, height: number) {
  return buildResponsiveExperienceProfile({
    width, height, devicePixelRatio: 2, coarsePointer: width < 1000,
    reducedMotion: false, hardwareConcurrency: 8,
  });
}

test("About navigation stops where the entire display can be read", () => {
  assert.equal(JOURNEY_SECTIONS[0].z, corridorStationZ(0) + CORRIDOR_READING_DISTANCE);
});

test("the complete name and role fit before the greeter begins to part", () => {
  for (const [width, height] of sizes) {
    const profile = profileFor(width, height);
    const layout = corridorGreeterLayout(profile);
    const available = 2 * 6 * Math.tan(profile.cameraFov * Math.PI / 360) * profile.aspect;
    assert.ok(layout.nameFontSize * 4 * profile.greeterScale <= available * 0.93, `name fits ${width}×${height}`);
    assert.ok(layout.roleFontSize * 8.8 * profile.greeterScale <= available * 0.93, `role fits ${width}×${height}`);
    assert.ok(layout.nameFontSize > 0.4, "name remains readable");
    assert.ok(layout.roleFontSize > 0.19, "role remains readable");
    if (profile.isCompact && profile.isPortrait) {
      const halfHeight = 6 * Math.tan(profile.cameraFov * Math.PI / 360);
      const top = layout.y + (layout.nameY + layout.nameFontSize / 2) * profile.greeterScale;
      const bottom = layout.y + (layout.roleY - layout.roleFontSize / 2) * profile.greeterScale;
      assert.ok(top < JOURNEY.walkY + halfHeight, `name clears top ${width}×${height}`);
      assert.ok(bottom > JOURNEY.walkY - halfHeight + halfHeight * 200 / height, `role clears dock ${width}×${height}`);
    }
  }
});

test("framed artwork and copy stay inside the available viewport on both walls", () => {
  for (const [width, height] of sizes) {
    const profile = profileFor(width, height);
    for (const side of [-1, 1] as const) {
      const stationZ = corridorStationZ(0);
      const cameraZ = stationZ + CORRIDOR_READING_DISTANCE;
      const center = corridorStationCenter(side, stationZ);
      const angles = corridorStationReadingAngles(side, stationZ, cameraZ, profile);
      const camera = new THREE.PerspectiveCamera(profile.cameraFov, profile.aspect, 0.1, 100);
      camera.position.set(0, JOURNEY.walkY, cameraZ);
      camera.rotation.set(angles.pitch, angles.yaw, 0);
      camera.updateMatrixWorld();

      const panel = new THREE.Object3D();
      panel.position.set(center.x, corridorHingedWallSettings.y, center.z);
      panel.rotation.y = center.yaw;
      panel.updateMatrixWorld();

      // Bounds enclose frame, heading and wrapped notes with reading space, without testing
      // decorative wall geometry that intentionally extends past the display.
      for (const x of [-1.89, 1.89]) {
        for (const y of [-2.58, 2.13]) {
          const point = new THREE.Vector3(x, y, 0.14).applyMatrix4(panel.matrixWorld).project(camera);
          const rightLimit = profile.isCompact ? 0.96 : 1 - 2 * 148 / width;
          const bottomLimit = profile.isCompact ? -1 + 2 * 100 / height : -0.96;
          assert.ok(point.x > -0.98 && point.x < rightLimit, `horizontal ${width}×${height} side ${side}: ${point.x}`);
          assert.ok(point.y > bottomLimit && point.y < 0.96, `vertical ${width}×${height} side ${side}: ${point.y}`);
        }
      }
    }
  }
});

test("passing a wall never whips the camera sideways or introduces invalid angles", () => {
  const profile = profileFor(390, 844);
  for (const side of [-1, 1] as const) {
    for (let offset = 30; offset >= -8; offset -= 0.5) {
      const z = corridorStationZ(0);
      const angles = corridorStationReadingAngles(side, z, z + offset, profile);
      assert.ok(Number.isFinite(angles.yaw) && Number.isFinite(angles.pitch));
      assert.ok(Math.abs(angles.yaw) < 0.3);
      assert.ok(Math.abs(angles.pitch) < 0.15);
    }
  }
});
