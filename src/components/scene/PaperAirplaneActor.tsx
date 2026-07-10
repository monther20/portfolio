"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";

import { AIRPLANE_CAMERA_OFFSET, CORRIDOR, JOURNEY } from "./journeyConfig";
import { getJourneyState, setJourneyState, useJourneyState } from "./journeyState";
import {
  AIRPLANE_LOOK,
  AIRPLANE_WOBBLE,
  createAirplaneGeometry,
  FOLD_LINE_POINTS,
} from "./airplane/airplaneGeometry";
import { useAirplaneModeEffects, type ModeAnim } from "./airplane/useAirplaneModeEffects";
import ContactLetterForm, { type LetterFields } from "./airplane/ContactLetterForm";
import { contact, projectUI } from "@/data/portfolio";

/** The plane's resting pose once it has landed on the boardwalk. */
const LANDED_EULER = new THREE.Euler(0, 0.25, 0.04);

/**
 * PaperAirplaneActor — the journey's hero. Rests on the corridor table, flies
 * out the window, glues itself in front of the camera across the sky, glides
 * down onto the boardwalk, and unfolds into the contact letter.
 */
export default function PaperAirplaneActor() {
  const { airplaneMode } = useJourneyState();
  const { camera } = useThree();

  const rootRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Group>(null);
  const letterRef = useRef<THREE.Group>(null);
  const sendRequested = useRef(false);

  const geometry = useMemo(createAirplaneGeometry, []);
  const paperTex = useLoader(THREE.TextureLoader, projectUI.paperTexture);

  useEffect(() => {
    paperTex.colorSpace = THREE.SRGBColorSpace;
    paperTex.needsUpdate = true;
  }, [paperTex]);

  // Scratch objects — no per-frame allocations.
  const scratch = useMemo(
    () => ({
      offset: new THREE.Vector3(),
      lockPos: new THREE.Vector3(),
      lockQuat: new THREE.Quaternion(),
      wobbleEuler: new THREE.Euler(0, 0, 0, "XYZ"),
      wobbleQuat: new THREE.Quaternion(),
      curvePos: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      lookTarget: new THREE.Vector3(),
      landedQuat: new THREE.Quaternion().setFromEuler(LANDED_EULER),
      modeAnim: { curve: null, t: 0, kind: null } as ModeAnim,
      relock: { from: new THREE.Vector3(), t: 1 },
    }),
    [],
  );

  useAirplaneModeEffects({
    airplaneMode,
    camera,
    rootRef,
    planeRef,
    letterRef,
    modeAnim: scratch.modeAnim,
    relock: scratch.relock,
    sendRequested,
  });

  /** The camera-locked flight pose (position + wobble quaternion). */
  const computeLockedPose = useCallback(
    (elapsed: number) => {
      scratch.offset
        .set(AIRPLANE_CAMERA_OFFSET.x, AIRPLANE_CAMERA_OFFSET.y, AIRPLANE_CAMERA_OFFSET.z)
        .applyQuaternion(camera.quaternion);
      scratch.lockPos.copy(camera.position).add(scratch.offset);

      const w = AIRPLANE_WOBBLE;
      const flightDistance = Math.max(0, JOURNEY.windowExitZ - camera.position.z);
      const roll = Math.sin(flightDistance * w.rollFrequency + elapsed * w.rollSpeed) * w.rollStrength;
      const pitch =
        w.pitchBase + Math.sin(flightDistance * w.pitchFrequency + elapsed * w.pitchSpeed) * w.pitchStrength;
      const yaw = Math.sin(flightDistance * w.yawFrequency + elapsed * w.yawSpeed) * w.yawStrength;

      scratch.wobbleEuler.set(pitch, yaw, roll);
      scratch.wobbleQuat.setFromEuler(scratch.wobbleEuler);
      scratch.lockQuat.copy(camera.quaternion).multiply(scratch.wobbleQuat);
    },
    [camera, scratch],
  );

  /** Follow the active scripted curve; nose along the tangent. */
  const applyCurveFrame = useCallback(
    (root: THREE.Group, elapsed: number) => {
      const anim = scratch.modeAnim;
      if (!anim.curve) return;

      const t = THREE.MathUtils.clamp(anim.t, 0, 1);
      anim.curve.getPointAt(t, scratch.curvePos);
      anim.curve.getTangentAt(t, scratch.tangent);
      root.position.copy(scratch.curvePos);

      // The geometry's nose points down -z, so look *away* from the tangent.
      scratch.lookTarget.copy(scratch.curvePos).sub(scratch.tangent);
      root.lookAt(scratch.lookTarget);

      if (anim.kind === "launch" && t > 0.75) {
        // Blend into the camera-locked pose so the handoff is seamless.
        const blend = (t - 0.75) / 0.25;
        computeLockedPose(elapsed);
        root.position.lerp(scratch.lockPos, blend);
        root.quaternion.slerp(scratch.lockQuat, blend);
      } else if ((anim.kind === "landing" || anim.kind === "sendoffReturn") && t > 0.8) {
        // Settle from flight orientation into the landed rest pose.
        root.quaternion.slerp(scratch.landedQuat, (t - 0.8) / 0.2);
      }
    },
    [computeLockedPose, scratch],
  );

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const t = state.clock.elapsedTime;

    switch (airplaneMode) {
      case "resting": {
        const rest = CORRIDOR.airplaneRest;
        root.position.set(rest[0], rest[1] + Math.sin(t * 1.6) * 0.04, rest[2]);
        root.rotation.set(
          Math.sin(t * 1.1) * 0.02,
          CORRIDOR.airplaneRestYaw + Math.sin(t * 0.8) * 0.06,
          Math.sin(t * 1.3) * 0.03,
        );
        break;
      }

      case "launching":
      case "landing":
      case "sendoff": {
        applyCurveFrame(root, t);
        break;
      }

      case "locked": {
        computeLockedPose(t);
        scratch.relock.t = Math.min(1, scratch.relock.t + delta / 0.9);
        const blend = THREE.MathUtils.smoothstep(scratch.relock.t, 0, 1);
        if (blend >= 1) {
          root.position.copy(scratch.lockPos);
          root.quaternion.copy(scratch.lockQuat);
        } else {
          root.position.lerpVectors(scratch.relock.from, scratch.lockPos, blend);
          root.quaternion.slerp(scratch.lockQuat, Math.min(1, blend + 0.15));
        }

        const journey = getJourneyState();
        if (camera.position.z < JOURNEY.landingTriggerZ && !journey.contactOpen) {
          setJourneyState({ airplaneMode: "landing" });
        }
        break;
      }

      case "landed": {
        // A landed paper plane still breathes a little in the sea breeze.
        root.rotation.z = LANDED_EULER.z + Math.sin(t * 1.4) * 0.012;

        const journey = getJourneyState();
        if (
          camera.position.z > JOURNEY.landingTriggerZ + 3 &&
          !journey.contactOpen &&
          !journey.cameraLocked
        ) {
          setJourneyState({ airplaneMode: "locked" });
        }
        break;
      }

      // unfolding / unfolded / folding: gsap owns the transforms.
    }
  });

  const handleSend = useCallback((fields: LetterFields) => {
    sendRequested.current = true;
    const subject = encodeURIComponent("Hello Munther — from your portfolio");
    const body = encodeURIComponent(`${fields.message}\n\n— ${fields.name} (${fields.email})`);
    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, "_self");
    setJourneyState({ airplaneMode: "folding" });
  }, []);

  const handleClose = useCallback(() => {
    sendRequested.current = false;
    setJourneyState({ airplaneMode: "folding" });
  }, []);

  const letterOpen =
    airplaneMode === "unfolding" || airplaneMode === "unfolded" || airplaneMode === "folding";

  return (
    <group
      ref={rootRef}
      name="Paper Airplane Actor"
      position={CORRIDOR.airplaneRest}
      rotation={[0, CORRIDOR.airplaneRestYaw, 0]}
    >
      {/* The folded origami plane */}
      <group ref={planeRef} name="Folded Airplane" scale={AIRPLANE_LOOK.scale} renderOrder={AIRPLANE_LOOK.renderOrder}>
        <mesh name="Folded Airplane Mesh" geometry={geometry}>
          <meshStandardMaterial
            color={AIRPLANE_LOOK.paperColor}
            roughness={AIRPLANE_LOOK.roughness}
            metalness={AIRPLANE_LOOK.metalness}
            side={THREE.DoubleSide}
          />
          <Edges
            linewidth={AIRPLANE_LOOK.edgeLinewidth}
            threshold={AIRPLANE_LOOK.edgeThreshold}
            color={AIRPLANE_LOOK.edgeColor}
          />
        </mesh>
        <line name="Fold Line">
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[FOLD_LINE_POINTS, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={AIRPLANE_LOOK.lineColor} />
        </line>
      </group>

      {/* The unfolded letter with the contact form */}
      <group ref={letterRef} name="Contact Letter" visible={false} position={[0, 0.06, 0]} rotation={[-Math.PI / 2 + 0.38, 0, 0]}>
        <mesh name="Contact Letter Paper">
          <planeGeometry args={[1.7, 2.3]} />
          <meshBasicMaterial map={paperTex} side={THREE.DoubleSide} />
          <Edges color="#8e8a82" />
        </mesh>
        {letterOpen && <ContactLetterForm onSend={handleSend} onClose={handleClose} />}
      </group>
    </group>
  );
}
