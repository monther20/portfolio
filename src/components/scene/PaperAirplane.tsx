"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// Reusable material for the paper with flatShading to highlight the crisp origami folds
const PaperMaterial = () => (
  <meshStandardMaterial
    color="#f4f4f4"
    roughness={0.9}
    metalness={0.05}
    side={THREE.DoubleSide}
    flatShading={true}
  />
);

export function AirplaneModel({ 
  isFolded, 
  position, 
  rotation, 
  scale 
}: { 
  isFolded: boolean, 
  position?: [number, number, number], 
  rotation?: [number, number, number], 
  scale?: number 
}) {
  // Hierarchy Refs
  const leftHalfRef = useRef<THREE.Group>(null);
  const rightHalfRef = useRef<THREE.Group>(null);
  
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  
  const leftCornerRef = useRef<THREE.Group>(null);
  const rightCornerRef = useRef<THREE.Group>(null);

  // --- PAPER DIMENSIONS ---
  // A perfect 8x12 rectangular piece of paper
  const noseZ = 6;
  const tailZ = -6;
  const length = 12;
  
  // The crease logic
  const fuselageWidth = 1.5; 
  const wingOuterX = 4.0;
  // Corner fold crease goes from Nose(0,6) to edge at Z=0
  const cornerZ = 0; 

  // --- GEOMETRIES (Built in Flat Unfolded State) ---
  
  // 1. FUSELAGE (Spine to Wing Hinge)
  const leftInnerGeo = useMemo(() => {
    const vertices = new Float32Array([
      0, 0, noseZ,               // Nose
      -fuselageWidth, 0, tailZ,  // Tail Hinge
      0, 0, tailZ,               // Tail Center
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rightInnerGeo = useMemo(() => {
    const vertices = new Float32Array([
      0, 0, noseZ,               
      0, 0, tailZ,               
      fuselageWidth, 0, tailZ,   
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. WING MAIN (Wing Hinge to Corner Hinge)
  // Built in local space offset from Nose (0,0,6)
  const leftWingMainGeo = useMemo(() => {
    const vertices = new Float32Array([
      // Triangle 1
      0, 0, 0,                                 // Nose
      -wingOuterX, 0, cornerZ - noseZ,         // Corner Point
      -fuselageWidth, 0, tailZ - noseZ,        // Tail Hinge
      
      // Triangle 2
      -wingOuterX, 0, cornerZ - noseZ,         // Corner Point
      -wingOuterX, 0, tailZ - noseZ,           // Tail Outer
      -fuselageWidth, 0, tailZ - noseZ,        // Tail Hinge
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rightWingMainGeo = useMemo(() => {
    const vertices = new Float32Array([
      0, 0, 0,
      fuselageWidth, 0, tailZ - noseZ,
      wingOuterX, 0, cornerZ - noseZ,
      
      wingOuterX, 0, cornerZ - noseZ,
      fuselageWidth, 0, tailZ - noseZ,
      wingOuterX, 0, tailZ - noseZ,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. CORNER FLAPS (The top corners of the paper that fold in first)
  const leftCornerFlapGeo = useMemo(() => {
    const vertices = new Float32Array([
      0, 0, 0,                                 // Nose
      -wingOuterX, 0, 0,                       // Top Outer Corner
      -wingOuterX, 0, cornerZ - noseZ,         // Corner Point
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rightCornerFlapGeo = useMemo(() => {
    const vertices = new Float32Array([
      0, 0, 0,
      wingOuterX, 0, cornerZ - noseZ,
      wingOuterX, 0, 0,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // --- HINGE AXES ---
  // Wing hinges
  const leftWingAxis = useMemo(() => new THREE.Vector3(-fuselageWidth, 0, -length).normalize(), []);
  const rightWingAxis = useMemo(() => new THREE.Vector3(fuselageWidth, 0, -length).normalize(), []);
  
  // Corner hinges
  const leftCornerAxis = useMemo(() => new THREE.Vector3(-wingOuterX, 0, cornerZ - noseZ).normalize(), []);
  const rightCornerAxis = useMemo(() => new THREE.Vector3(wingOuterX, 0, cornerZ - noseZ).normalize(), []);

  // --- ORIGAMI ANIMATION SEQUENCE ---
  const progressRef = useRef(0);

  useFrame((state, delta) => {
    // 1. Track a single overarching progress value (0 to 1)
    progressRef.current = THREE.MathUtils.damp(
      progressRef.current,
      isFolded ? 1 : 0,
      3.0,
      delta
    );

    const p = progressRef.current;
    
    // 2. Sequence the folds to look like real origami!
    // Sequence 1: Corners fold in first (0.0 to 0.6)
    const cornerP = Math.min(Math.max(p / 0.6, 0), 1);
    
    // Sequence 2: Fuselage and Wings fold down (0.3 to 1.0)
    const bodyP = Math.min(Math.max((p - 0.3) / 0.7, 0), 1);

    // Smooth mechanical easing
    const ease = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const cEase = ease(cornerP);
    const bEase = ease(bodyP);

    // --- APPLY ROTATIONS ---
    
    // Fold Corners In (180 degrees minus a tiny bit to prevent z-fighting)
    const cornerAngle = cEase * (Math.PI - 0.02);
    if (leftCornerRef.current) {
      leftCornerRef.current.quaternion.setFromAxisAngle(leftCornerAxis, cornerAngle);
    }
    if (rightCornerRef.current) {
      rightCornerRef.current.quaternion.setFromAxisAngle(rightCornerAxis, -cornerAngle);
    }

    // Fold Fuselage (Closing the spine)
    const halfAngle = bEase * (Math.PI / 2 - 0.05);
    if (leftHalfRef.current) leftHalfRef.current.rotation.z = -halfAngle;
    if (rightHalfRef.current) rightHalfRef.current.rotation.z = halfAngle;

    // Fold Wings Down
    const wingAngle = bEase * (Math.PI / 2 + 0.2);
    if (leftWingRef.current) {
      leftWingRef.current.quaternion.setFromAxisAngle(leftWingAxis, -wingAngle);
    }
    if (rightWingRef.current) {
      rightWingRef.current.quaternion.setFromAxisAngle(rightWingAxis, wingAngle);
    }

    // Hide the protruding corner flaps as the wings fold!
    // In a real paper airplane, these flaps get sandwiched cleanly inside the fuselage.
    // By scaling them down to 0, they magically tuck away into the nose.
    const flapScale = Math.max(1.0 - bEase, 0.001); // Prevent exactly 0 scale matrix issues
    if (leftCornerRef.current) leftCornerRef.current.scale.setScalar(flapScale);
    if (rightCornerRef.current) rightCornerRef.current.scale.setScalar(flapScale);
  });

  return (
    <group position={position || [0, 0, 0]} rotation={rotation} scale={scale}>
      
      {/* LEFT HALF OF PAPER */}
      <group ref={leftHalfRef}>
        <mesh geometry={leftInnerGeo} castShadow receiveShadow>
          <PaperMaterial />
        </mesh>
        
        {/* LEFT WING HINGE */}
        <group position={[0, 0, noseZ]}>
          <group ref={leftWingRef}>
            <mesh geometry={leftWingMainGeo} castShadow receiveShadow>
              <PaperMaterial />
            </mesh>
            
            {/* LEFT CORNER FLAP HINGE */}
            {/* Child of the wing so it moves with it! */}
            <group ref={leftCornerRef}>
              <mesh geometry={leftCornerFlapGeo} castShadow receiveShadow>
                <PaperMaterial />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* RIGHT HALF OF PAPER */}
      <group ref={rightHalfRef}>
        <mesh geometry={rightInnerGeo} castShadow receiveShadow>
          <PaperMaterial />
        </mesh>
        
        {/* RIGHT WING HINGE */}
        <group position={[0, 0, noseZ]}>
          <group ref={rightWingRef}>
            <mesh geometry={rightWingMainGeo} castShadow receiveShadow>
              <PaperMaterial />
            </mesh>
            
            {/* RIGHT CORNER FLAP HINGE */}
            <group ref={rightCornerRef}>
              <mesh geometry={rightCornerFlapGeo} castShadow receiveShadow>
                <PaperMaterial />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      
    </group>
  );
}

// --- ISOLATED TEST COMPONENT ---
export default function PaperAirplane() {
  const [isFolded, setIsFolded] = React.useState(true);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas shadows camera={{ position: [0, 5, 12], fov: 50 }}>
        <color attach="background" args={["#222222"]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <OrbitControls makeDefault />

        <AirplaneModel isFolded={isFolded} />

        {/* Floor to catch shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.5} />
        </mesh>
      </Canvas>

      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <button
          onClick={() => setIsFolded(!isFolded)}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            background: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          }}
        >
          {isFolded ? "Unfold Plane" : "Fold Plane"}
        </button>
      </div>
    </div>
  );
}
