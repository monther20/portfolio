"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { useLoader, extend, useThree, useFrame } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";

import {
  rotationTuple,
  scaleTuple,
  vector3Tuple,
  type RoomDebugState,
} from "./roomDebug/types";

// Same wipe shader as the lanterns — blends from texBase to texOn top-to-bottom
const DoorWipeMaterial = shaderMaterial(
  {
    texBase: null,
    texOn: null,
    progress: 0,
    tintColor: new THREE.Color("#ffffff"),
    // Manual fog uniforms — synced each frame from the scene fog
    fogColor: new THREE.Color(1, 1, 1),
    fogNear: 5,
    fogFar: 55,
  },
  // Vertex — passes fog depth to fragment
  `
    varying vec2 vUv;
    varying float vFogDepth;
    void main() {
      vUv = uv;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPos;
      vFogDepth = -mvPos.z;
    }
  `,
  // Fragment — applies manual linear fog after colour computation
  `
    varying vec2 vUv;
    varying float vFogDepth;
    uniform sampler2D texBase;
    uniform sampler2D texOn;
    uniform float progress;
    uniform vec3 tintColor;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;

    void main() {
      vec4 base = texture2D(texBase, vUv);
      vec4 on   = texture2D(texOn,   vUv);

      // progress 0→1: wipe line moves from top (1.0) to bottom (0.0)
      float p = progress * 1.4 - 0.2;
      float Y = 1.0 - p;
      float mixVal = smoothstep(Y - 0.15, Y + 0.15, vUv.y);

      gl_FragColor = mix(base, on, mixVal) * vec4(tintColor, 1.0);
      #include <colorspace_fragment>

      // Apply linear fog — blends output toward fogColor with distance
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    }
  `,
);

extend({ DoorWipeMaterial });

const DOOR_PANEL_WIDTH = 4.9;
const DOOR_PANEL_HEIGHT = 8.8;
const DOOR_HANDLE_POSITION: [number, number, number] = [2, -0.1, 0];
const DOOR_HANDLE_SCALE: [number, number, number] = [1.95, 1.7, 1];
const DOOR_HANDLE_RENDER_ORDER_OFFSET = 1;

declare module "@react-three/fiber" {
  interface ThreeElements {
    doorWipeMaterial: any;
  }
}

export default function AnimatedDoor({
  isOpen,
  isNight,
  onClick,
  debug,
}: {
  isOpen: boolean;
  isNight: boolean;
  onClick?: () => void;
  debug: RoomDebugState;
}) {
  const doorRef = useRef<THREE.Group>(null);
  const frameMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const doorMaterialRef = useRef<any>(null);
  const handleMaterialRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const { scene } = useThree();
  const { materials, meshes } = debug;
  const doorFrameColor = isNight
    ? (materials.doorFrame.nightColor ?? materials.doorFrame.color)
    : materials.doorFrame.color;
  const doorPanelTint = isNight
    ? (materials.doorPanel.nightColor ?? materials.doorPanel.color)
    : materials.doorPanel.color;

  const doorDefaultTexture = useLoader(
    THREE.TextureLoader,
    "/textures/door_colored.webp",
  );
  const doorHandleTexture = useLoader(
    THREE.TextureLoader,
    "/textures/door_handle.webp",
  );
  const doorHandleOpenTexture = useLoader(
    THREE.TextureLoader,
    "/textures/door_handle_open.webp",
  );
  const frameTexture = useLoader(
    THREE.TextureLoader,
    "/textures/door_frame.webp",
  );

  // These are color/albedo textures. Without SRGBColorSpace three.js treats
  // them as linear data, which makes image colors render noticeably washed out.
  useEffect(() => {
    [
      doorDefaultTexture,
      doorHandleTexture,
      doorHandleOpenTexture,
      frameTexture,
    ].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });
  }, [
    doorDefaultTexture,
    doorHandleTexture,
    doorHandleOpenTexture,
    frameTexture,
  ]);

  // Sync the manual fog uniforms with the scene's live fog each frame.
  useFrame(() => {
    const fog = scene.fog;
    if (!(fog instanceof THREE.Fog)) return;

    [doorMaterialRef.current, handleMaterialRef.current].forEach((material) => {
      if (!material) return;
      material.fogColor = fog.color;
      material.fogNear = fog.near;
      material.fogFar = fog.far;
    });
  });

  // Only the separate handle artwork changes on door hover.
  useEffect(() => {
    if (!handleMaterialRef.current) return;
    gsap.to(handleMaterialRef.current, {
      progress: hovered ? 1 : 0,
      duration: 0.25,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [hovered]);

  // Rotate door open/closed. The debug rotation is the base pose;
  // opening adds a 90-degree swing on top of that base Y rotation.
  useEffect(() => {
    if (doorRef.current) {
      gsap.to(doorRef.current.rotation, {
        x: meshes.doorPanelPivot.rotation.x,
        y: meshes.doorPanelPivot.rotation.y + (isOpen ? Math.PI / 2 : 0),
        z: meshes.doorPanelPivot.rotation.z,
        duration: 1.2,
        ease: "power2.inOut",
      });
    }
  }, [
    isOpen,
    meshes.doorPanelPivot.rotation.x,
    meshes.doorPanelPivot.rotation.y,
    meshes.doorPanelPivot.rotation.z,
  ]);

  // Dim the door frame and the custom door shader at night.
  useEffect(() => {
    const targetFrameColor = new THREE.Color(doorFrameColor);
    const targetPanelTint = new THREE.Color(doorPanelTint);

    if (frameMaterialRef.current) {
      gsap.to(frameMaterialRef.current.color, {
        r: targetFrameColor.r,
        g: targetFrameColor.g,
        b: targetFrameColor.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    [doorMaterialRef.current, handleMaterialRef.current].forEach((material) => {
      if (!material?.tintColor) return;
      gsap.to(material.tintColor, {
        r: targetPanelTint.r,
        g: targetPanelTint.g,
        b: targetPanelTint.b,
        duration: 1.5,
        ease: "power2.inOut",
      });
    });
  }, [doorFrameColor, doorPanelTint]);

  return (
    <group
      position={vector3Tuple(meshes.doorRoot.position)}
      rotation={rotationTuple(meshes.doorRoot.rotation)}
      scale={scaleTuple(meshes.doorRoot.scale)}
      renderOrder={meshes.doorRoot.renderOrder}
      visible={meshes.doorRoot.visible}
    >
      {/* Door frame */}
      <group position={[0, 0, 0]}>
        <mesh
          position={vector3Tuple(meshes.doorFrame.position)}
          rotation={rotationTuple(meshes.doorFrame.rotation)}
          scale={scaleTuple(meshes.doorFrame.scale)}
          renderOrder={meshes.doorFrame.renderOrder}
          visible={meshes.doorFrame.visible}
        >
          <planeGeometry args={[7, 10.05]} />
          <meshStandardMaterial
            ref={frameMaterialRef}
            map={frameTexture}
            transparent={true}
            side={THREE.DoubleSide}
            roughness={materials.doorFrame.roughness}
            metalness={materials.doorFrame.metalness}
            color={doorFrameColor}
            wireframe={materials.doorFrame.wireframe}
          />
        </mesh>
      </group>

      {/* Door panel — pivots for open animation */}
      <group
        ref={doorRef}
        position={vector3Tuple(meshes.doorPanelPivot.position)}
        scale={scaleTuple(meshes.doorPanelPivot.scale)}
        renderOrder={meshes.doorPanelPivot.renderOrder}
        visible={meshes.doorPanelPivot.visible}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <group position={[2.555, 0, 0]}>
          <mesh
            position={vector3Tuple(meshes.doorPanelSurface.position)}
            rotation={rotationTuple(meshes.doorPanelSurface.rotation)}
            scale={scaleTuple(meshes.doorPanelSurface.scale)}
            renderOrder={meshes.doorPanelSurface.renderOrder}
            visible={meshes.doorPanelSurface.visible}
          >
            <planeGeometry args={[DOOR_PANEL_WIDTH, DOOR_PANEL_HEIGHT]} />
            <doorWipeMaterial
              ref={doorMaterialRef}
              texBase={doorDefaultTexture}
              texOn={doorDefaultTexture}
              tintColor={new THREE.Color(doorPanelTint)}
              transparent={false}
              wireframe={materials.doorPanel.wireframe}
            />
          </mesh>
          <mesh
            name="Door Handle"
            position={DOOR_HANDLE_POSITION}
            scale={DOOR_HANDLE_SCALE}
            renderOrder={
              meshes.doorPanelSurface.renderOrder +
              DOOR_HANDLE_RENDER_ORDER_OFFSET
            }
            visible={meshes.doorPanelSurface.visible}
          >
            <planeGeometry args={[1, 1]} />
            <doorWipeMaterial
              ref={handleMaterialRef}
              texBase={doorHandleTexture}
              texOn={doorHandleOpenTexture}
              tintColor={new THREE.Color(doorPanelTint)}
              transparent
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
              wireframe={materials.doorPanel.wireframe}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
