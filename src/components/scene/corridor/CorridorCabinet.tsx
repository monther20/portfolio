"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

import { CABINET_MODEL_URL } from "../assetPaths";
import { setJourneyState } from "../journeyState";
import { useFogFade } from "../useFogFade";

// Temporarily disabled until the drawer animation and camera framing are fixed.
const CABINET_INTERACTION_ENABLED = false;
const DRAWER_CLIP = "Drawer_1_boxAction";

const CABINET = {
  position: [-3.1, -2.39, -111.77] as [number, number, number],
  rotation: [0, 1.553, -0.0002] as [number, number, number],
  scale: 2,
  modelY: -0.88,
} as const;

export default function CorridorCabinet() {
  const cabinetRef = useRef<THREE.Group>(null);
  const cameraStartPosition = useRef(new THREE.Vector3());
  const cameraStartQuaternion = useRef(new THREE.Quaternion());
  const focusPosition = useRef(new THREE.Vector3());
  const focusQuaternion = useRef(new THREE.Quaternion());
  const returning = useRef(false);
  const ownsInteractionLock = useRef(false);
  const [open, setOpen] = useState(false);
  const { camera } = useThree();
  const gltf = useGLTF(CABINET_MODEL_URL);
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, modelScene);

  useFogFade(cabinetRef);

  useEffect(() => {
    modelScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;

      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        if (
          material instanceof THREE.MeshStandardMaterial &&
          material.metalness !== 0
        ) {
          material.metalness = 0;
          material.needsUpdate = true;
        }
      });
    });
  }, [modelScene]);

  const lockInteraction = useCallback(() => {
    ownsInteractionLock.current = true;
    setJourneyState({ interactionLocked: true });
  }, []);

  const unlockInteraction = useCallback(() => {
    if (!ownsInteractionLock.current) return;
    ownsInteractionLock.current = false;
    setJourneyState({ interactionLocked: false });
  }, []);

  useEffect(
    () => () => {
      unlockInteraction();
    },
    [unlockInteraction],
  );

  const close = useCallback(() => {
    const action = actions[DRAWER_CLIP];
    if (action) {
      action.paused = false;
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = -1;
      action.play();
    }
    returning.current = true;
    setOpen(false);
    lockInteraction();
  }, [actions, lockInteraction]);

  const openDrawer = useCallback(() => {
    if (
      !CABINET_INTERACTION_ENABLED ||
      open ||
      returning.current ||
      !cabinetRef.current
    ) return;
    cameraStartPosition.current.copy(camera.position);
    cameraStartQuaternion.current.copy(camera.quaternion);
    const cabinet = cabinetRef.current;
    const origin = cabinet.getWorldPosition(new THREE.Vector3());
    const target = cabinet.localToWorld(new THREE.Vector3(0, 0.48, -0.1));
    const front = cabinet
      .localToWorld(new THREE.Vector3(0, 0, -1))
      .sub(origin)
      .normalize();
    focusPosition.current
      .copy(target)
      .addScaledVector(front, 2.45)
      .add(new THREE.Vector3(0, 0.2, 0));
    focusQuaternion.current.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(focusPosition.current, target, camera.up),
    );
    const action = actions[DRAWER_CLIP];
    if (action) {
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1;
      action.play();
    }
    returning.current = false;
    setOpen(true);
    lockInteraction();
  }, [actions, camera, lockInteraction, open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  useFrame((_, delta) => {
    const lerp = 1 - Math.pow(0.0001, delta);
    if (open) {
      camera.position.lerp(focusPosition.current, lerp);
      camera.quaternion.slerp(focusQuaternion.current, lerp);
    } else if (
      returning.current &&
      cameraStartPosition.current.lengthSq() > 0
    ) {
      camera.position.lerp(cameraStartPosition.current, lerp);
      camera.quaternion.slerp(cameraStartQuaternion.current, lerp);
      if (
        camera.position.distanceToSquared(cameraStartPosition.current) <
          0.0001 &&
        camera.quaternion.angleTo(cameraStartQuaternion.current) < 0.002
      ) {
        returning.current = false;
        unlockInteraction();
      }
    }
  });

  return (
    <group
      ref={cabinetRef}
      name="Corridor Cabinet"
      position={CABINET.position}
      rotation={CABINET.rotation}
    >
      <group
        scale={CABINET.scale}
        position={[0, CABINET.modelY, 0]}
        onClick={
          CABINET_INTERACTION_ENABLED
            ? (event) => {
                event.stopPropagation();
                openDrawer();
              }
            : undefined
        }
      >
        <primitive object={modelScene} />
      </group>
      {open ? (
        <Html fullscreen zIndexRange={[10000, 10001]}>
          <div
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
            style={{ position: "fixed", inset: 0, pointerEvents: "auto" }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close cabinet"
              style={{
                position: "absolute",
                top: 20,
                left: 20,
                padding: "8px 14px",
                border: "1px solid #2b2b2b",
                background: "#fffdf8",
                color: "#2b2b2b",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              ← Back
            </button>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
