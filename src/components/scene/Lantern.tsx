"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { ROOM_LANTERN_MODEL_URL } from "./assetPaths";

type LanternControls = {
  setLight: (on: boolean, intensity?: number) => void;
  dispose: () => void;
};

function createLanternControls(
  root: THREE.Object3D,
  spillLight: boolean,
): LanternControls {
  const glass = root.getObjectByName("Glass_Panels");
  const interior = root.getObjectByName("Interior_Emissive_Light");

  if (!(glass instanceof THREE.Mesh) || !(interior instanceof THREE.Mesh)) {
    throw new Error("The lantern model is missing its controllable meshes.");
  }
  if (
    !(glass.material instanceof THREE.MeshStandardMaterial) ||
    !(interior.material instanceof THREE.MeshStandardMaterial)
  ) {
    throw new Error("The lantern model has unexpected light materials.");
  }

  glass.material = glass.material.clone();
  interior.material = interior.material.clone();
  glass.material.depthWrite = false;
  glass.material.side = THREE.FrontSide;
  glass.material.roughness = 1;
  glass.renderOrder = 2;
  interior.renderOrder = 1;
  interior.material.toneMapped = false;

  const pointLight = spillLight
    ? new THREE.PointLight(0xffc080, 0, 5.5, 2)
    : null;
  if (pointLight) {
    pointLight.position.set(0, 0.3, 0.35);
    pointLight.castShadow = false;
    root.add(pointLight);
  }

  return {
    setLight(on, intensity = 1) {
      const power = on ? Math.max(0, intensity) : 0;
      interior.visible = power > 0;
      interior.material.opacity = power > 0 ? 1 : 0;
      glass.material.color.set(on ? 0xffe4b9 : 0xbcbcbc);
      glass.material.emissive.set(0xffae50);
      glass.material.emissiveIntensity = power * 1.35;
      interior.material.emissive.set(0xffd59c);
      interior.material.emissiveIntensity = power * 3;
      interior.material.color.set(on ? 0xffe5c4 : 0x505050);
      if (pointLight) pointLight.intensity = power * 0.1;
    },
    dispose() {
      glass.material.dispose();
      interior.material.dispose();
      pointLight?.removeFromParent();
    },
  };
}

/** Clickable, independently controlled instance of the pencil lantern model. */
export default function Lantern({
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  visible = true,
  renderOrder = 0,
  on = false,
  intensity = 1,
  spillLight = false,
  onClick,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  visible?: boolean;
  renderOrder?: number;
  on?: boolean;
  intensity?: number;
  spillLight?: boolean;
  onClick?: () => void;
}) {
  const gltf = useGLTF(ROOM_LANTERN_MODEL_URL);
  const instance = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    instance.traverse((object) => {
      if (object instanceof THREE.Mesh) object.renderOrder = renderOrder;
    });
  }, [instance, renderOrder]);

  useEffect(() => {
    const controls = createLanternControls(instance, spillLight);
    instance.userData.lanternControls = controls;
    invalidate();

    return () => {
      controls.dispose();
      delete instance.userData.lanternControls;
    };
  }, [instance, invalidate, spillLight]);

  useEffect(() => {
    const controls = instance.userData.lanternControls as
      | LanternControls
      | undefined;
    controls?.setLight(on, intensity);
    invalidate();
  }, [instance, intensity, invalidate, on]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > 4) return;
    onClick?.();
  };

  return (
    <primitive
      object={instance}
      dispose={null}
      position={position}
      rotation={rotation}
      scale={scale}
      visible={visible}
      onClick={onClick ? handleClick : undefined}
      onPointerOver={
        onClick
          ? (event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        onClick
          ? (event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              document.body.style.cursor = "auto";
            }
          : undefined
      }
    />
  );
}
