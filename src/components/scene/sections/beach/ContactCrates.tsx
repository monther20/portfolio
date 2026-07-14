"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import PaintSprite from "../../PaintSprite";
import { seededRange } from "../../PartingItem";
import { BEACH } from "../../journeyConfig";
import { getJourneyState, setJourneyState } from "../../journeyState";
import { useCorridorDebugGui as useSceneDebugGui } from "../../CorridorDebugGui";
import { contact } from "@/data/portfolio";

const CONTACT_BUTTON_HEIGHT = 1.65;
const CONTACT_BUTTON_Y = BEACH.seaY + CONTACT_BUTTON_HEIGHT / 2;

const BUTTON_TEXTURES: Record<string, string> = {
  message: "/textures/textures/contact/maillink.webp",
  github: "/textures/textures/contact/githublink.webp",
  linkedin: "/textures/textures/contact/linkedinlink.webp",
};

const BUTTON_PAINTED_TEXTURES: Record<string, string> = {
  message: "/textures/textures/contact/maillink_painted.webp",
  github: "/textures/textures/contact/githublink_painted.webp",
  linkedin: "/textures/textures/contact/linkedinlink_painted.webp",
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
  if (contact.linkedin) {
    window.open(contact.linkedin, "_blank", "noopener,noreferrer");
  }
}

/** One clickable pre-labeled wooden contact barrel floating on the sea. */
function ContactBarrel({ crate }: { crate: (typeof BEACH.crates)[number] }) {
  const bobRef = useRef<THREE.Group>(null);
  const phase = useMemo(() => seededRange(crate.key, 0, Math.PI * 2), [crate.key]);

  useFrame((state) => {
    const bob = bobRef.current;
    if (!bob) return;
    const t = state.clock.elapsedTime;

    // Local bobbing only; the parent position stays editable in lil-gui.
    bob.position.y = Math.sin(t * 1.15 + phase) * 0.065;
    bob.rotation.z = Math.sin(t * 0.9 + phase) * 0.035;
    bob.rotation.x = Math.cos(t * 0.75 + phase) * 0.025;
  });

  return (
    <group name={`Contact Barrel Button: ${crate.label}`} position={[crate.x, CONTACT_BUTTON_Y, crate.z]}>
      <group ref={bobRef} name={`Contact Barrel Button Bob: ${crate.label}`}>
        <PaintSprite
          name={`Contact Barrel Button Sprite: ${crate.label}`}
          sketch={BUTTON_TEXTURES[crate.key]}
          painted={BUTTON_PAINTED_TEXTURES[crate.key]}
          position={[0, 0, 0]}
          height={CONTACT_BUTTON_HEIGHT}
          revealNear={8}
          revealFar={18}
          autoReveal={false}
          interactive
          hoverScale={1.08}
          onClick={() => crateAction(crate.key)}
        />
      </group>
    </group>
  );
}

/** ContactCrates — message / github / linkedin as pre-labeled floating barrel buttons. */
export default function ContactCrates() {
  const debugRootRef = useRef<THREE.Group>(null);

  useSceneDebugGui(debugRootRef, {
    title: "Contact Barrels",
    rootLabel: "Contact Barrel Buttons",
    top: "0px",
    side: "left",
  });

  return (
    <group ref={debugRootRef} name="Contact Barrel Buttons">
      {BEACH.crates
        .filter((crate) => crate.key !== "linkedin" || Boolean(contact.linkedin))
        .map((crate) => (
          <ContactBarrel key={crate.key} crate={crate} />
        ))}
    </group>
  );
}
