"use client";

import { Component, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { useResponsiveExperience } from "../../ResponsiveExperience";
import { ROOM_FURNITURE_MODEL_URL } from "../assetPaths";

const CHAIR_ROCK_CLIP = "Chair_Rocking_Loop";
// The source clip contains two 0→4°→0 cycles in four seconds. Reduce both
// amplitude and speed instead of layering a second rotation over its pivot.
const ROCK_SPEED = 0.32;
const ROCK_WEIGHT = 0.125;

const FURNITURE = {
  position: [-5.18, -3.02, -9.75] as [number, number, number],
  rotation: [0, 0.515407346410207, 0] as [number, number, number],
  scale: 3.43,
} as const;

class ChairAnimationErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("The chair animation could not start; furniture remains available.", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ChairAnimation({
  furniture,
  furnitureClips,
}: {
  furniture: THREE.Group;
  furnitureClips: THREE.AnimationClip[];
}) {
  const { reducedMotion } = useResponsiveExperience();

  const setup = useMemo(() => {
    const chair = furniture.getObjectByName("Chair_Model");
    const pivot = furniture.getObjectByName("Chair_Rocking_Pivot");
    const rockingClip = furnitureClips.find((clip) => clip.name === CHAIR_ROCK_CLIP);
    if (!chair || !pivot || !rockingClip) {
      throw new Error("Chair anchors or rocking animation clip are missing.");
    }

    return {
      chair,
      pivot,
      rockMixer: new THREE.AnimationMixer(furniture),
      rockingClip,
    };
  }, [furniture, furnitureClips]);

  useLayoutEffect(() => {
    return () => {
      setup.rockMixer.stopAllAction();
      setup.rockMixer.uncacheRoot(furniture);
      // Geometries, materials and embedded atlas textures belong to useGLTF's
      // shared cache; only the cloned Object3D hierarchies are owned here.
    };
  }, [furniture, setup]);

  useEffect(() => {
    if (reducedMotion) {
      setup.rockMixer.stopAllAction();
      setup.pivot.quaternion.identity();
      return;
    }
    const rock = setup.rockMixer.clipAction(setup.rockingClip);
    rock.reset().setLoop(THREE.LoopRepeat, Infinity);
    rock.timeScale = ROCK_SPEED;
    rock.setEffectiveWeight(ROCK_WEIGHT);
    rock.play();
    return () => {
      rock.stop();
      setup.pivot.quaternion.identity();
    };
  }, [reducedMotion, setup]);

  const visibility = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    frustum: new THREE.Frustum(),
    // Only animate the chair while its bounds are visible to the camera.
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
      <ChairAnimationErrorBoundary>
        <ChairAnimation furniture={furniture} furnitureClips={animations} />
      </ChairAnimationErrorBoundary>
    </group>
  );
}
