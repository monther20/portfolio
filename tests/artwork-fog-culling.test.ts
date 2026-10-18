import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  getFogFadeRange,
  isSphereBeyondFog,
  registerFogCull,
} from "../src/components/scene/fogVisibility";

const fog = new THREE.Fog("#ffffff", 5, 45);
const scratch = new THREE.Vector3();

function planeCorners(width: number, height: number) {
  return [-1, 1].flatMap((x) => [-1, 1].map((y) =>
    new THREE.Vector3(x * width / 2, y * height / 2, 0),
  ));
}

function vertexDepth(point: THREE.Vector3, object: THREE.Object3D, camera: THREE.Camera) {
  return -point.clone().applyMatrix4(object.matrixWorld)
    .applyMatrix4(camera.matrixWorldInverse).z;
}

function beforeSceneRender(scene: THREE.Scene, camera: THREE.Camera) {
  // Match WebGLRenderer's ordering: update final scene/camera transforms,
  // run the scene callback, then construct the visible render list.
  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  scene.onBeforeRender(null!, scene, camera, null!, null!, null!);
}

test("only a whole sphere beyond the fog curtain skips rendering", () => {
  const camera = new THREE.PerspectiveCamera(43, 390 / 844, 0.1, 770);
  const plane = new THREE.Group();
  const { fadeFar } = getFogFadeRange(fog);

  plane.position.z = -(fadeFar + 10);
  assert.equal(isSphereBeyondFog(plane, camera, fog, 2, scratch), true);
  plane.position.z = -(fadeFar + 1);
  assert.equal(isSphereBeyondFog(plane, camera, fog, 2, scratch), false);
  plane.position.z = -fadeFar;
  assert.equal(isSphereBeyondFog(plane, camera, fog, 2, scratch), false);
  plane.position.z = 4;
  assert.equal(isSphereBeyondFog(plane, camera, fog, 2, scratch), false);
});

test("a broad tilted cloud remains drawable while any edge can leave the fog", () => {
  const camera = new THREE.PerspectiveCamera();
  const plane = new THREE.Group();
  const width = 16, height = 2;
  const { fadeFar } = getFogFadeRange(fog);
  plane.position.z = -(fadeFar + 1);
  plane.rotation.y = 0.9;

  assert.equal(isSphereBeyondFog(
    plane, camera, fog, Math.hypot(width / 2, height / 2), scratch,
  ), false);
  assert.ok(planeCorners(width, height).some((corner) =>
    vertexDepth(corner, plane, camera) < fadeFar,
  ));
});

test("banked cameras and nested nonuniform scale never cull a visible plane edge", () => {
  const camera = new THREE.PerspectiveCamera(43, 0.46, 0.1, 770);
  camera.position.set(2, 1, 4);
  camera.rotation.set(0.16, -0.22, 0.38);
  const parent = new THREE.Group();
  const pivot = new THREE.Group();
  const plane = new THREE.Group();
  parent.add(pivot);
  pivot.add(plane);
  parent.scale.set(3.4, 0.6, 1.7);
  parent.rotation.set(-0.2, 0.15, -0.11);
  pivot.rotation.set(0.7, -0.6, 0.3);
  plane.scale.set(1.08, 1.08, 1);
  const width = 9, height = 2.25;
  const radius = Math.hypot(width / 2, height / 2);
  const corners = planeCorners(width, height);
  const { fadeFar } = getFogFadeRange(fog);
  let retainedEdges = 0;
  let culled = 0;

  for (let depth = 8; depth <= 100; depth += 0.5) {
    parent.position.set(0.5, -1, -depth);
    const hidden = isSphereBeyondFog(plane, camera, fog, radius, scratch);
    const depths = corners.map((corner) => vertexDepth(corner, plane, camera));
    if (hidden) {
      culled += 1;
      assert.ok(depths.every((value) => value > fadeFar));
    }
    if (depths.some((value) => value <= fadeFar)) {
      retainedEdges += 1;
      assert.equal(hidden, false);
    }
  }
  assert.ok(culled > 0 && retainedEdges > 0);
});

test("visibility recovers in both travel directions using current camera transforms", () => {
  const camera = new THREE.PerspectiveCamera();
  const plane = new THREE.Group();
  plane.position.z = -60;
  const states = [0, -20, -35, -80, -35, 0].map((z) => {
    // Deliberately do not update matrices outside the production helper.
    camera.position.z = z;
    return isSphereBeyondFog(plane, camera, fog, 2, scratch);
  });
  assert.deepEqual(states, [true, true, false, false, false, true]);
});

test("live parent scaling and enlarged touch targets are inside the retained bound", () => {
  const camera = new THREE.PerspectiveCamera();
  const parent = new THREE.Group();
  const planeAndTarget = new THREE.Group();
  parent.add(planeAndTarget);
  const { fadeFar } = getFogFadeRange(fog);
  parent.position.z = -(fadeFar + 2.5);
  const touchRadius = Math.hypot(1.32, 1.32, 0.002);

  assert.equal(isSphereBeyondFog(planeAndTarget, camera, fog, touchRadius, scratch), true);
  parent.scale.set(1, 1, 2);
  assert.equal(isSphereBeyondFog(planeAndTarget, camera, fog, touchRadius, scratch), false);
  parent.scale.setScalar(1);
  assert.equal(isSphereBeyondFog(planeAndTarget, camera, fog, touchRadius, scratch), true);
});

test("shared render callback preserves its predecessor until the last target unregisters", () => {
  const scene = new THREE.Scene();
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera();
  const far = new THREE.Group(), near = new THREE.Group();
  far.position.z = -100;
  near.position.z = -15;
  scene.add(far, near);
  let previousCalls = 0;
  const previous: THREE.Scene["onBeforeRender"] = function (this: THREE.Scene, ...args) {
    assert.equal(this, scene);
    assert.equal(args[1], scene);
    assert.equal(args[2], camera);
    previousCalls += 1;
  };
  scene.onBeforeRender = previous;
  const releaseFar = registerFogCull(scene, { current: far }, 2);
  const shared = scene.onBeforeRender;
  const releaseNear = registerFogCull(scene, { current: near }, 2);
  assert.equal(scene.onBeforeRender, shared);

  beforeSceneRender(scene, camera);
  assert.equal(previousCalls, 1);
  assert.equal(far.visible, false);
  assert.equal(near.visible, true);
  releaseFar();
  assert.equal(far.visible, true);
  assert.equal(scene.onBeforeRender, shared);
  beforeSceneRender(scene, camera);
  assert.equal(previousCalls, 2);
  releaseNear();
  assert.equal(scene.onBeforeRender, previous);

  // Strict Mode/remount cleanup cannot unregister a later registry.
  const releaseAgain = registerFogCull(scene, { current: far }, 2);
  const replacement = scene.onBeforeRender;
  releaseFar();
  assert.equal(scene.onBeforeRender, replacement);
  const releaseThird = registerFogCull(scene, { current: near }, 2);
  assert.equal(scene.onBeforeRender, replacement);
  releaseAgain();
  assert.equal(scene.onBeforeRender, replacement);
  releaseThird();
  assert.equal(scene.onBeforeRender, previous);
});

test("render-time culling uses the final ancestor pose and camera for each pass", () => {
  const scene = new THREE.Scene();
  scene.fog = fog;
  const parent = new THREE.Group();
  const plane = new THREE.Group();
  parent.add(plane);
  scene.add(parent);
  const camera = new THREE.PerspectiveCamera();
  const otherCamera = new THREE.PerspectiveCamera();
  otherCamera.position.z = -50;
  const release = registerFogCull(scene, { current: plane }, 2);

  parent.position.z = -70;
  beforeSceneRender(scene, camera);
  assert.equal(plane.visible, false);
  beforeSceneRender(scene, otherCamera);
  assert.equal(plane.visible, true);
  beforeSceneRender(scene, camera);
  assert.equal(plane.visible, false);

  // A later Float/parting callback may mutate the ancestor after the sprite's
  // own useFrame ran. The render hook must see this new pose immediately.
  parent.position.z = -20;
  beforeSceneRender(scene, camera);
  assert.equal(plane.visible, true);
  parent.position.z = -70;
  beforeSceneRender(scene, camera);
  assert.equal(plane.visible, false);
  scene.fog = null;
  beforeSceneRender(scene, camera);
  assert.equal(plane.visible, true);
  scene.fog = fog;
  beforeSceneRender(scene, camera);
  assert.equal(plane.visible, false);
  release();
  assert.equal(plane.visible, true);
});

test("registry cleanup preserves a subsequently installed scene callback", () => {
  const scene = new THREE.Scene();
  const plane = new THREE.Group();
  const release = registerFogCull(scene, { current: plane }, 2);
  const subsequent = () => {};
  scene.onBeforeRender = subsequent;
  release();
  assert.equal(scene.onBeforeRender, subsequent);
});
