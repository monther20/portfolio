"use client";

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinnedScene } from "three/addons/utils/SkeletonUtils.js";

import { useResponsiveExperience } from "../../ResponsiveExperience";
import {
  ROOM_CHESSBOARD_MODEL_URL,
  ROOM_FURNITURE_MODEL_URL,
  ROOM_SEATED_SHADOW_MODEL_URL,
} from "../assetPaths";

const CHAIR_ROCK_CLIP = "Chair_Rocking_Loop";
const PERSON_IDLE_CLIP = "Seated_Idle_8s";
// The source clip contains two 0→4°→0 cycles in four seconds. Reduce both
// amplitude and speed instead of layering a second rotation over its pivot.
const ROCK_SPEED = 0.32;
const ROCK_WEIGHT = 0.125;
const BOARD_POSITION = [0, 0.751005, 0] as const;
const BOARD_YAW = -1.2242574623609548;

const FURNITURE = {
  position: [-5.18, -3.02, -9.75] as [number, number, number],
  rotation: [0, 0.515407346410207, 0] as [number, number, number],
  scale: 3.43,
} as const;

class RoomAdditionsErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("The room additions could not load; original furniture remains available.", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Independently suspended: a failed addition must not blank the door or furniture. */
function RoomFurnitureAdditions({
  furniture,
  furnitureClips,
}: {
  furniture: THREE.Group;
  furnitureClips: THREE.AnimationClip[];
}) {
  const { scene: characterSource, animations: characterClips } = useGLTF(
    ROOM_SEATED_SHADOW_MODEL_URL,
  );
  const { scene: boardSource } = useGLTF(ROOM_CHESSBOARD_MODEL_URL);
  const { gl } = useThree();
  const { reducedMotion } = useResponsiveExperience();

  const setup = useMemo(() => {
    const chair = furniture.getObjectByName("Chair_Model");
    const pivot = furniture.getObjectByName("Chair_Rocking_Pivot");
    const table = furniture.getObjectByName("Table_STATIC");
    const rockingClip = furnitureClips.find((clip) => clip.name === CHAIR_ROCK_CLIP);
    const idleClip = characterClips.find((clip) => clip.name === PERSON_IDLE_CLIP);
    if (!chair || !pivot || !table || !rockingClip || !idleClip) {
      throw new Error("Room furniture anchors or addition animation clips are missing.");
    }

    // Preserve the user's authored graphite atlas, 21-bone skin and subtly
    // animated head. A regular scene.clone(true) would bind to source bones;
    // clone the WHOLE asset scene (its skin and skeleton are sibling roots).
    const character = cloneSkinnedScene(characterSource);
    const board = boardSource.clone(true);
    board.position.set(...BOARD_POSITION);
    board.rotation.y = BOARD_YAW;

    return {
      chair,
      pivot,
      table,
      character,
      board,
      rockMixer: new THREE.AnimationMixer(furniture),
      idleMixer: new THREE.AnimationMixer(character),
      rockingClip,
      idleClip,
    };
  }, [boardSource, characterClips, characterSource, furniture, furnitureClips]);

  useLayoutEffect(() => {
    setup.chair.add(setup.character);
    setup.table.add(setup.board);
    return () => {
      setup.chair.remove(setup.character);
      setup.table.remove(setup.board);
      setup.rockMixer.stopAllAction();
      setup.idleMixer.stopAllAction();
      setup.rockMixer.uncacheRoot(furniture);
      setup.idleMixer.uncacheRoot(setup.character);
      // Geometries, materials and embedded atlas textures belong to useGLTF's
      // shared cache; only the cloned Object3D hierarchies are owned here.
    };
  }, [furniture, setup]);

  useEffect(() => {
    if (reducedMotion) {
      setup.rockMixer.stopAllAction();
      setup.idleMixer.stopAllAction();
      setup.pivot.quaternion.identity();
      return;
    }
    const rock = setup.rockMixer.clipAction(setup.rockingClip);
    const idle = setup.idleMixer.clipAction(setup.idleClip);
    rock.reset().setLoop(THREE.LoopRepeat, Infinity);
    rock.timeScale = ROCK_SPEED;
    rock.setEffectiveWeight(ROCK_WEIGHT);
    rock.play();
    idle.reset().setLoop(THREE.LoopRepeat, Infinity);
    idle.play();
    return () => {
      rock.stop();
      idle.stop();
      setup.pivot.quaternion.identity();
    };
  }, [reducedMotion, setup]);

  useEffect(() => {
    // Keep the baked square pattern readable at an oblique camera angle;
    // do not increase the phone's rendering DPR or turn on shadow maps.
    setup.board.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial) || !material.map) continue;
        const anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
        if (material.map.anisotropy !== anisotropy) {
          material.map.anisotropy = anisotropy;
          material.map.needsUpdate = true;
        }
      }
    });
  }, [gl, setup]);

  const visibility = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    frustum: new THREE.Frustum(),
    // The actual seated silhouette fits within a 0.85-unit chair-local sphere.
    // A larger proxy would keep it animating offscreen on portrait phones.
    sphere: new THREE.Sphere(new THREE.Vector3(), 0.85 * FURNITURE.scale),
    center: new THREE.Vector3(0, 0.65, -0.19),
  }), []);

  useFrame(({ camera }, delta) => {
    if (reducedMotion || document.hidden) return;
    camera.updateMatrixWorld();
    setup.chair.updateWorldMatrix(true, false);
    visibility.sphere.center.copy(visibility.center).applyMatrix4(setup.chair.matrixWorld);
    visibility.frustum.setFromProjectionMatrix(
      visibility.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    if (!visibility.frustum.intersectsSphere(visibility.sphere)) return;
    // This is the sole mixer update path (not also Drei's useAnimations).
    const elapsed = Math.min(delta, 0.05);
    setup.rockMixer.update(elapsed);
    setup.idleMixer.update(elapsed);
  });

  return null;
}

/** Original furniture geometry and its authored chair/table hierarchy are untouched. */
export default function RoomFurniture() {
  const { scene, animations } = useGLTF(ROOM_FURNITURE_MODEL_URL);
  const furniture = useMemo(() => scene.clone(true), [scene]);

  return (
    <group
      name="Room Table and Swaying Chair"
      position={FURNITURE.position}
      rotation={FURNITURE.rotation}
      scale={FURNITURE.scale}
    >
      <primitive object={furniture} dispose={null} />
      <RoomAdditionsErrorBoundary>
        <Suspense fallback={null}>
          <RoomFurnitureAdditions furniture={furniture} furnitureClips={animations} />
        </Suspense>
      </RoomAdditionsErrorBoundary>
    </group>
  );
}
