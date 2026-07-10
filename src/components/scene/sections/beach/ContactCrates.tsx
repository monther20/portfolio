"use client";

import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Edges, Float, Html } from "@react-three/drei";

import PaintSprite from "../../PaintSprite";
import { seededRange } from "../../PartingItem";
import { BEACH } from "../../journeyConfig";
import { getJourneyState, setJourneyState } from "../../journeyState";
import { contact } from "@/data/portfolio";

const ICONS: Record<string, string> = {
  message: "/textures/textures/contact/backups/maillink.webp",
  github: "/textures/textures/contact/backups/githublink.webp",
  linkedin: "/textures/textures/contact/backups/linkedinlink.webp",
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-caveat), 'Caveat', cursive",
  fontSize: 15,
  fontWeight: 700,
  color: "#2b2b2b",
  background: "rgba(255,255,255,0.85)",
  border: "1px solid #8e8a82",
  borderRadius: 999,
  padding: "2px 10px",
  pointerEvents: "none",
  userSelect: "none",
  whiteSpace: "nowrap",
};

function crateAction(key: string) {
  if (key === "message") {
    // Only when the airplane is parked — it becomes the letter.
    if (getJourneyState().airplaneMode === "landed") {
      setJourneyState({ cameraLocked: true, contactOpen: true, airplaneMode: "unfolding" });
    }
    return;
  }
  if (key === "github") {
    window.open(contact.github, "_blank", "noopener,noreferrer");
    return;
  }
  // Placeholder link until the real profile url is filled into portfolio.ts.
  window.open(contact.linkedin || "https://www.linkedin.com", "_blank", "noopener,noreferrer");
}

/** One bobbing crate on the water with its icon + label. */
function Crate({ crate }: { crate: (typeof BEACH.crates)[number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const phase = useMemo(() => seededRange(crate.key, 0, Math.PI * 2), [crate.key]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;

    group.position.y = BEACH.crateY + Math.sin(t * 1.15 + phase) * 0.09;
    group.rotation.z = Math.sin(t * 0.9 + phase) * 0.04;
    group.rotation.x = Math.cos(t * 0.75 + phase) * 0.03;

    const target = hovered ? 1.08 : 1;
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, target, 0.12));
  });

  return (
    <group ref={groupRef} name={`Contact Crate: ${crate.label}`} position={[crate.x, BEACH.crateY, crate.z]}>
      <mesh
        name={`Contact Crate Box: ${crate.label}`}
        onClick={(e) => {
          e.stopPropagation();
          crateAction(crate.key);
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
        <boxGeometry args={[1.15, 1.15, 1.15]} />
        <meshBasicMaterial color="#e8dcc0" />
        <Edges color="#8e8a82" />
      </mesh>

      {/* Icon + handwritten label floating above the crate */}
      <Float speed={1.1} rotationIntensity={0.1} floatIntensity={0.4} floatingRange={[-0.1, 0.15]}>
        <PaintSprite
          name={`Contact Crate Icon: ${crate.label}`}
          sketch={ICONS[crate.key]}
          position={[0, 1.15, 0]}
          height={0.72}
          revealNear={8}
          revealFar={18}
        />
        <Html center position={[0, 0.62, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={LABEL_STYLE}>{crate.label}</div>
        </Html>
      </Float>
    </group>
  );
}

/** ContactCrates — message / github / linkedin, floating on the sea. */
export default function ContactCrates() {
  return (
    <group name="Contact Crates">
      {BEACH.crates.map((crate) => (
        <Crate key={crate.key} crate={crate} />
      ))}
    </group>
  );
}
