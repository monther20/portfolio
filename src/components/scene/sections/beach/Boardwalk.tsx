"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";

import { CONTACT_TEXTURES } from "../../assetPaths";
import { seededRange } from "../../PartingItem";
import { BEACH } from "../../journeyConfig";
import { useFogFade } from "../../useFogFade";

const PLANK_DEPTH = 0.68;
const PLANK_TEXTURE_VARIANTS = 6;
const WOOD_TINTS = ["#ffffff", "#eeeeeb", "#f8f8f5", "#deded9"] as const;

type FogFadedMeshProps = {
  children: ReactNode;
  geometry: THREE.BufferGeometry;
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

function FogFadedMesh({
  children,
  geometry,
  name,
  position,
  rotation,
  scale,
}: FogFadedMeshProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFogFade(ref);

  return (
    <mesh
      ref={ref}
      name={name}
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {children}
    </mesh>
  );
}

/**
 * Boardwalk — a weathered monochrome timber pier built from the project's
 * existing hand-drawn wood grain. Uneven planks, supporting beams and sagging side
 * ropes retain the imperfect sketchbook construction of the rest of the scene.
 */
export default function Boardwalk() {
  const woodSource = useLoader(THREE.TextureLoader, CONTACT_TEXTURES.boardwalkWood);
  const plankGeometry = useMemo(
    () => new THREE.BoxGeometry(BEACH.boardwalk.width, 0.14, PLANK_DEPTH),
    [],
  );
  const postGeometry = useMemo(() => new THREE.BoxGeometry(0.2, 1.75, 0.2), []);
  const supportLength = BEACH.boardwalk.startZ - BEACH.boardwalk.endZ + PLANK_DEPTH;
  const supportGeometry = useMemo(
    () => new THREE.BoxGeometry(0.2, 0.24, supportLength),
    [supportLength],
  );

  // Crop narrow strips from different boards in the source artwork, then turn
  // the grain so it runs along each plank instead of across the short edge.
  const plankTextures = useMemo(
    () =>
      Array.from({ length: PLANK_TEXTURE_VARIANTS }, (_, index) => {
        const texture = woodSource.clone();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.center.set(0.5, 0.5);
        texture.rotation = -Math.PI / 2;
        texture.repeat.set(0.065, 1.08);
        texture.offset.set(-0.42 + index * 0.17, index * 0.13);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        return texture;
      }),
    [woodSource],
  );

  const postTexture = useMemo(() => {
    const texture = woodSource.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.075, 0.92);
    texture.offset.set(0.2, 0.04);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [woodSource]);

  useEffect(
    () => () => {
      plankTextures.forEach((texture) => texture.dispose());
      postTexture.dispose();
    },
    [plankTextures, postTexture],
  );

  const planks = useMemo(() => {
    const out: {
      z: number;
      x: number;
      y: number;
      tilt: number;
      widthScale: number;
    }[] = [];

    for (let z = BEACH.boardwalk.startZ; z >= BEACH.boardwalk.endZ; z -= 0.62) {
      out.push({
        z,
        x: BEACH.boardwalk.x + seededRange(`plank-${z}-x`, -0.025, 0.025),
        y: BEACH.boardwalk.topY - 0.06 + seededRange(`plank-${z}-y`, -0.018, 0.018),
        tilt: seededRange(`plank-${z}-tilt`, -0.018, 0.018),
        widthScale: seededRange(`plank-${z}-width`, 0.985, 1.015),
      });
    }
    return out;
  }, []);

  const postRows = useMemo(() => {
    const zPositions: number[] = [];
    for (let z = BEACH.boardwalk.startZ - 0.65; z >= BEACH.boardwalk.endZ; z -= 3.35) {
      zPositions.push(z);
    }

    const railX = BEACH.boardwalk.width / 2 - 0.08;
    return {
      zPositions,
      sides: [BEACH.boardwalk.x - railX, BEACH.boardwalk.x + railX],
    };
  }, []);

  const ropes = useMemo(
    () =>
      postRows.sides.flatMap((x, sideIndex) =>
        postRows.zPositions.slice(0, -1).map((z, index) => {
          const nextZ = postRows.zPositions[index + 1];
          const span = z - nextZ;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, span / 2),
            new THREE.Vector3(0, -0.16, 0),
            new THREE.Vector3(0, 0, -span / 2),
          ]);

          return {
            key: `rope-${sideIndex}-${index}`,
            geometry: new THREE.TubeGeometry(curve, 10, 0.026, 5, false),
            position: [x, BEACH.boardwalk.topY + 0.38, (z + nextZ) / 2] as [number, number, number],
          };
        }),
      ),
    [postRows],
  );

  useEffect(
    () => () => ropes.forEach((rope) => rope.geometry.dispose()),
    [ropes],
  );

  const supportCenterZ = (BEACH.boardwalk.startZ + BEACH.boardwalk.endZ) / 2;

  return (
    <group name="Beach Boardwalk">
      {/* Darker lengthwise timbers make the separate deck boards feel supported. */}
      {[-0.92, 0.92].map((offset, index) => (
        <FogFadedMesh
          key={`support-${offset}`}
          name={`Boardwalk Support Beam ${index + 1}`}
          geometry={supportGeometry}
          position={[
            BEACH.boardwalk.x + offset,
            BEACH.boardwalk.topY - 0.24,
            supportCenterZ,
          ]}
        >
          <meshBasicMaterial map={postTexture} color="#c8c8c3" fog />
          <Edges color="#111111" fog />
        </FogFadedMesh>
      ))}

      {planks.map((plank, index) => (
        <FogFadedMesh
          key={`plank-${plank.z}`}
          name={`Boardwalk Plank ${index + 1}`}
          geometry={plankGeometry}
          position={[plank.x, plank.y, plank.z]}
          rotation={[0, plank.tilt, 0]}
          scale={[plank.widthScale, 1, 1]}
        >
          <meshBasicMaterial
            map={plankTextures[index % plankTextures.length]}
            color={WOOD_TINTS[index % WOOD_TINTS.length]}
            fog
          />
          <Edges color="#111111" fog />
        </FogFadedMesh>
      ))}

      {postRows.sides.flatMap((x, sideIndex) =>
        postRows.zPositions.map((z, index) => (
          <FogFadedMesh
            key={`post-${sideIndex}-${z}`}
            name={`Boardwalk Post ${sideIndex * postRows.zPositions.length + index + 1}`}
            geometry={postGeometry}
            position={[x, BEACH.boardwalk.topY - 0.34, z]}
            rotation={[0, seededRange(`post-${sideIndex}-${z}`, -0.035, 0.035), 0]}
          >
            <meshBasicMaterial map={postTexture} color="#ddddda" fog />
            <Edges color="#111111" fog />
          </FogFadedMesh>
        )),
      )}

      {ropes.map((rope, index) => (
        <FogFadedMesh
          key={rope.key}
          name={`Boardwalk Rope ${index + 1}`}
          geometry={rope.geometry}
          position={rope.position}
        >
          <meshBasicMaterial color="#666666" fog />
        </FogFadedMesh>
      ))}
    </group>
  );
}
