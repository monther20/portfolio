"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  rotationTuple,
  scaleTuple,
  vector3Tuple,
  type RoomDebugState,
} from "../roomDebug/types";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import { ROOM_DOOR_MODEL_URL } from "../assetPaths";
import { useDayNight, useDayNightTransition } from "../dayNight/DayNightProvider";
import { addUnlitNightLighting } from "../dayNight/unlitNightMaterial";

const LEAF_WIDTH = 1.04;
const LEAF_HEIGHT = 2.05;
// Fit the existing opening. Equal X/Z scale keeps the hinge swing circular.
const MODEL_SCALE: [number, number, number] = [
  4.9 / LEAF_WIDTH,
  8.8 / LEAF_HEIGHT,
  4.9 / LEAF_WIDTH,
];
const MODEL_POSITION: [number, number, number] = [-0.05, -4.4, -0.35];

export default function AnimatedDoor({
  isOpen,
  onClick,
  debug,
}: {
  isOpen: boolean;
  onClick?: () => void;
  debug: RoomDebugState;
}) {
  const { scene } = useGLTF(ROOM_DOOR_MODEL_URL);
  const frameTexture = useTexture("/textures/room/door_frame.webp");
  const [hovered, setHovered] = useState(false);
  const responsive = useResponsiveExperience();
  const interactive = Boolean(onClick);
  const { materials, meshes } = debug;
  const { transition } = useDayNight();
  const frameColor = materials.doorFrame.color;
  const panelColor = materials.doorPanel.color;

  const model = useMemo(() => {
    // Never animate or recolor the globally cached useGLTF scene/material.
    const instance = scene.clone(true);
    const hinge = instance.getObjectByName("DoorHinge");
    if (!hinge) throw new Error("Fantasy door model is missing its DoorHinge node.");
    const ownedMaterials: THREE.MeshBasicMaterial[] = [];
    instance.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const cloneMaterial = (source: THREE.Material) => {
        if (!(source instanceof THREE.MeshBasicMaterial)) {
          throw new Error("Fantasy door requires its unlit pencil material.");
        }
        // The door is artwork, not a second loading indicator.
        const material = source.clone();
        material.toneMapped = false;
        addUnlitNightLighting(material, transition.uniforms, "door");
        ownedMaterials.push(material);
        return material;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneMaterial)
        : cloneMaterial(object.material);
    });
    return { instance, hinge, materials: ownedMaterials };
  }, [scene, transition]);

  useDayNightTransition(useCallback((amount) => {
    // Retain unlit day rendering; opt into linear exposure on the direct mobile
    // night path. The existing hover animation stays independent.
    model.materials.forEach((material) => {
      const toneMapped = amount > 0;
      if (material.toneMapped !== toneMapped) {
        material.toneMapped = toneMapped;
        material.needsUpdate = true;
      }
    });
  }, [model]));

  useEffect(() => {
    frameTexture.colorSpace = THREE.SRGBColorSpace;
    frameTexture.needsUpdate = true;
  }, [frameTexture]);

  useEffect(() => {
    // The asset's own hinge is authoritative; don't also play its GLTF clips.
    const tween = gsap.to(model.hinge.rotation, {
      y: isOpen ? Math.PI / 2 : 0,
      duration: responsive.reducedMotion ? 0.01 : 1.2,
      ease: "power2.inOut",
      overwrite: "auto",
    });
    return () => {
      tween.kill();
    };
  }, [isOpen, model, responsive.reducedMotion]);

  useEffect(() => {
    if (!interactive) setHovered(false);
  }, [interactive]);

  useEffect(() => {
    if (!hovered || !interactive || responsive.isCoarsePointer) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [hovered, interactive, responsive.isCoarsePointer]);

  useEffect(() => {
    const tint = new THREE.Color(panelColor);
    if (hovered && interactive) tint.multiplyScalar(1.12);
    const tweens = model.materials.map((material) =>
      gsap.to(material.color, {
        r: tint.r,
        g: tint.g,
        b: tint.b,
        duration: responsive.reducedMotion ? 0.01 : 0.25,
        ease: "power2.out",
        overwrite: "auto",
      }),
    );
    return () => {
      tweens.forEach((tween) => tween.kill());
    };
  }, [hovered, interactive, model, panelColor, responsive.reducedMotion]);

  useEffect(() => {
    model.instance.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.renderOrder = meshes.doorPanelSurface.renderOrder;
      }
    });
    model.materials.forEach((material) => {
      material.wireframe = materials.doorPanel.wireframe;
    });
  }, [materials.doorPanel.wireframe, meshes.doorPanelSurface.renderOrder, model]);

  useEffect(
    () => () => {
      // Geometry and the embedded atlas still belong to useGLTF's cache.
      model.materials.forEach((material) => material.dispose());
    },
    [model],
  );

  return (
    <group
      position={vector3Tuple(meshes.doorRoot.position)}
      rotation={rotationTuple(meshes.doorRoot.rotation)}
      scale={scaleTuple(meshes.doorRoot.scale)}
      renderOrder={meshes.doorRoot.renderOrder}
      visible={meshes.doorRoot.visible}
    >
      {/* The supplied model is a moving leaf, not a fixed wall jamb. */}
      <mesh
        position={vector3Tuple(meshes.doorFrame.position)}
        rotation={rotationTuple(meshes.doorFrame.rotation)}
        scale={scaleTuple(meshes.doorFrame.scale)}
        renderOrder={meshes.doorFrame.renderOrder}
        visible={meshes.doorFrame.visible}
      >
        <planeGeometry args={[7, 10.05]} />
        <meshStandardMaterial
          map={frameTexture}
          transparent
          side={THREE.DoubleSide}
          roughness={materials.doorFrame.roughness}
          metalness={materials.doorFrame.metalness}
          color={frameColor}
          wireframe={materials.doorFrame.wireframe}
        />
      </mesh>
      <group
        position={vector3Tuple(meshes.doorPanelPivot.position)}
        rotation={rotationTuple(meshes.doorPanelPivot.rotation)}
        scale={scaleTuple(meshes.doorPanelPivot.scale)}
        visible={meshes.doorPanelPivot.visible}
        onClick={
          interactive
            ? (event) => {
                event.stopPropagation();
                onClick?.();
              }
            : undefined
        }
        onPointerEnter={
          interactive
            ? (event) => {
                event.stopPropagation();
                if (!responsive.isCoarsePointer) setHovered(true);
              }
            : undefined
        }
        onPointerDown={
          interactive
            ? (event) => {
                event.stopPropagation();
                if (responsive.isCoarsePointer) setHovered(true);
              }
            : undefined
        }
        onPointerUp={() => {
          if (responsive.isCoarsePointer) setHovered(false);
        }}
        onPointerLeave={() => setHovered(false)}
      >
        <group
          position={vector3Tuple(meshes.doorPanelSurface.position)}
          rotation={rotationTuple(meshes.doorPanelSurface.rotation)}
          scale={scaleTuple(meshes.doorPanelSurface.scale)}
          visible={meshes.doorPanelSurface.visible}
        >
          <group position={MODEL_POSITION} scale={MODEL_SCALE}>
            <primitive object={model.instance} dispose={null} />
          </group>
        </group>
      </group>
    </group>
  );
}
