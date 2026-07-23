"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type GUI from "lil-gui";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";

import {
  AIRPLANE_CAMERA_OFFSET,
  BEACH,
  CORRIDOR,
  JOURNEY,
  windowProgressAt,
} from "./journeyConfig";
import { useFogFade } from "./useFogFade";
import {
  getJourneyState,
  setJourneyState,
  useJourneyState,
  type AirplaneMode,
} from "./journeyState";
import {
  AIRPLANE_LOOK,
  AIRPLANE_WOBBLE,
  createAirplaneGeometry,
  FOLD_LINE_POINTS,
} from "./airplane/airplaneGeometry";
import {
  useAirplaneModeEffects,
  type ModeAnim,
} from "./airplane/useAirplaneModeEffects";
import ContactLetterForm, {
  type LetterFields,
} from "./airplane/ContactLetterForm";
import { contact, projectUI } from "@/data/portfolio";

/** The plane's resting pose once it has landed on the boardwalk. */
const LANDED_EULER = new THREE.Euler(0, 0.165407346410207, 0.04);

type LandedAirplaneDebug = {
  visible: boolean;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
};

const DEFAULT_LANDED_AIRPLANE_DEBUG: LandedAirplaneDebug = {
  visible: true,
  positionX: BEACH.landing[0],
  positionY: BEACH.landing[1],
  positionZ: BEACH.landing[2],
  rotationX: LANDED_EULER.x,
  rotationY: LANDED_EULER.y,
  rotationZ: LANDED_EULER.z,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
};

type MessagePaperDebug = {
  visible: boolean;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  width: number;
  height: number;
};

const DEFAULT_MESSAGE_PAPER_DEBUG: MessagePaperDebug = {
  visible: true,
  positionX: 0,
  positionY: -0.0199999999999996,
  positionZ: -0.0300000000000002,
  rotationX: -1.1907963267948967,
  rotationY: 0.000407346410206788,
  rotationZ: 0,
  scaleX: 0.27,
  scaleY: 0.22,
  scaleZ: 1,
  width: 1.7,
  height: 2.3,
};

/** Development-only transform inspector shown after the airplane has landed. */
function useLandedAirplaneDebug(airplaneMode: AirplaneMode) {
  const [debug, setDebug] = useState<LandedAirplaneDebug>(() => ({
    ...DEFAULT_LANDED_AIRPLANE_DEBUG,
  }));
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      airplaneMode !== "landed"
    ) {
      return;
    }

    let gui: GUI | undefined;
    let disposed = false;

    void import("lil-gui").then(({ default: GUIConstructor }) => {
      if (disposed) return;

      const params = { ...debugRef.current };
      gui = new GUIConstructor({ title: "Landed Airplane Debug", width: 330 });
      gui.domElement.style.zIndex = "10020";

      const commit = () => setDebug({ ...params });
      const number = (
        folder: GUI,
        key: keyof LandedAirplaneDebug,
        min: number,
        max: number,
        step: number,
        label: string,
      ) => folder.add(params, key, min, max, step).name(label).onChange(commit);

      gui.add(params, "visible").name("Visible").onChange(commit);

      const position = gui.addFolder("Position");
      number(position, "positionX", -10, 10, 0.01, "X");
      number(position, "positionY", -8, 5, 0.01, "Y");
      number(
        position,
        "positionZ",
        BEACH.landing[2] - 30,
        BEACH.landing[2] + 30,
        0.01,
        "Z",
      );

      const rotation = gui.addFolder("Rotation");
      number(rotation, "rotationX", -Math.PI, Math.PI, 0.001, "X");
      number(rotation, "rotationY", -Math.PI, Math.PI, 0.001, "Y");
      number(rotation, "rotationZ", -Math.PI, Math.PI, 0.001, "Z");

      const scale = gui.addFolder("Scale");
      number(scale, "scaleX", 0.05, 4, 0.01, "X");
      number(scale, "scaleY", 0.05, 4, 0.01, "Y");
      number(scale, "scaleZ", 0.05, 4, 0.01, "Z");

      const actions = {
        copySettings: () => {
          const json = JSON.stringify(params, null, 2);
          void navigator.clipboard?.writeText(json);
          console.info("Landed Airplane Debug settings:\n", json);
        },
      };
      gui.add(actions, "copySettings").name("Copy settings JSON");
    });

    return () => {
      disposed = true;
      gui?.destroy();
    };
  }, [airplaneMode]);

  return debug;
}

/** Development-only inspector shown while the contact message paper is open. */
function useMessagePaperDebug(contactOpen: boolean) {
  const [debug, setDebug] = useState<MessagePaperDebug>(() => ({
    ...DEFAULT_MESSAGE_PAPER_DEBUG,
  }));
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !contactOpen) return;

    let gui: GUI | undefined;
    let disposed = false;

    void import("lil-gui").then(({ default: GUIConstructor }) => {
      if (disposed) return;

      const params = { ...debugRef.current };
      gui = new GUIConstructor({ title: "Message Paper Debug", width: 330 });
      gui.domElement.style.zIndex = "10020";

      const commit = () => setDebug({ ...params });
      const number = (
        folder: GUI,
        key: keyof MessagePaperDebug,
        min: number,
        max: number,
        step: number,
        label: string,
      ) => folder.add(params, key, min, max, step).name(label).onChange(commit);

      gui.add(params, "visible").name("Visible").onChange(commit);

      const position = gui.addFolder("Position");
      number(position, "positionX", -5, 5, 0.01, "X");
      number(position, "positionY", -5, 5, 0.01, "Y");
      number(position, "positionZ", -5, 5, 0.01, "Z");

      const rotation = gui.addFolder("Rotation");
      number(rotation, "rotationX", -Math.PI, Math.PI, 0.001, "X");
      number(rotation, "rotationY", -Math.PI, Math.PI, 0.001, "Y");
      number(rotation, "rotationZ", -Math.PI, Math.PI, 0.001, "Z");

      const scale = gui.addFolder("Scale");
      number(scale, "scaleX", 0.05, 4, 0.01, "X");
      number(scale, "scaleY", 0.05, 4, 0.01, "Y");
      number(scale, "scaleZ", 0.05, 4, 0.01, "Z");

      const size = gui.addFolder("Paper Size");
      number(size, "width", 0.25, 5, 0.01, "Width");
      number(size, "height", 0.25, 6, 0.01, "Height");

      const actions = {
        copySettings: () => {
          const json = JSON.stringify(params, null, 2);
          void navigator.clipboard?.writeText(json);
          console.info("Message Paper Debug settings:\n", json);
        },
      };
      gui.add(actions, "copySettings").name("Copy settings JSON");
    });

    return () => {
      disposed = true;
      gui?.destroy();
    };
  }, [contactOpen]);

  return debug;
}

/**
 * PaperAirplaneActor — the journey's hero. Rests on the corridor table, flies
 * out the window, glues itself in front of the camera across the sky, glides
 * down onto the boardwalk, and unfolds into the contact letter.
 */
export default function PaperAirplaneActor() {
  const { airplaneMode, contactOpen } = useJourneyState();
  const { camera } = useThree();
  const landedDebug = useLandedAirplaneDebug(airplaneMode);
  const messagePaperDebug = useMessagePaperDebug(contactOpen);

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
      curveQuat: new THREE.Quaternion(),
      landedQuat: new THREE.Quaternion().setFromEuler(LANDED_EULER),
      modeAnim: {
        curve: null,
        t: 0,
        kind: null,
        startQuaternion: new THREE.Quaternion(),
      } as ModeAnim,
      relock: { from: new THREE.Vector3(), t: 1 },
    }),
    [],
  );

  useFogFade(rootRef);

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
        .set(
          AIRPLANE_CAMERA_OFFSET.x,
          AIRPLANE_CAMERA_OFFSET.y,
          AIRPLANE_CAMERA_OFFSET.z,
        )
        .applyQuaternion(camera.quaternion);
      scratch.lockPos.copy(camera.position).add(scratch.offset);

      const w = AIRPLANE_WOBBLE;
      const flightDistance = Math.max(
        0,
        JOURNEY.windowExitZ - camera.position.z,
      );
      const roll =
        Math.sin(flightDistance * w.rollFrequency + elapsed * w.rollSpeed) *
        w.rollStrength;
      const pitch =
        w.pitchBase +
        Math.sin(flightDistance * w.pitchFrequency + elapsed * w.pitchSpeed) *
          w.pitchStrength;
      const yaw =
        Math.sin(flightDistance * w.yawFrequency + elapsed * w.yawSpeed) *
        w.yawStrength;

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

      if (anim.kind === "launch") {
        // The open window releases an uneven gust: the plane lifts, slips
        // sideways, and flutters before the airflow steadies outside.
        const gustEnvelope = Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0, 1));
        root.position.x +=
          (Math.sin(elapsed * 5.8 + t * 13) * 0.055 +
            Math.sin(t * Math.PI * 3) * 0.09) *
          gustEnvelope;
        root.position.y +=
          (Math.sin(elapsed * 7.1 + t * 9) * 0.035 + 0.075) * gustEnvelope;

        const bankFade = 1 - THREE.MathUtils.smoothstep(t, 0.25, 0.85);
        const gustBank =
          Math.sin(elapsed * 6.4 + t * 17) * 0.045 * gustEnvelope;
        scratch.wobbleEuler.set(
          0,
          0,
          Math.sin(t * Math.PI * 2.4) * 0.12 * bankFade + gustBank,
        );
        scratch.wobbleQuat.setFromEuler(scratch.wobbleEuler);
        root.quaternion.multiply(scratch.wobbleQuat);
      }

      if (t < 0.18) {
        // Avoid the initial snap when switching from the resting pose to curve-following.
        scratch.curveQuat.copy(root.quaternion);
        root.quaternion
          .copy(anim.startQuaternion)
          .slerp(scratch.curveQuat, THREE.MathUtils.smoothstep(t, 0, 0.18));
      }

      if (anim.kind === "launch" && t > 0.75) {
        // Blend into the camera-locked pose so the handoff is seamless.
        const blend = (t - 0.75) / 0.25;
        computeLockedPose(elapsed);
        root.position.lerp(scratch.lockPos, blend);
        root.quaternion.slerp(scratch.lockQuat, blend);
      } else if (
        (anim.kind === "landing" || anim.kind === "sendoffReturn") &&
        t > 0.8
      ) {
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

    if (airplaneMode !== "landed") {
      root.visible = true;
      root.scale.set(1, 1, 1);
    }

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

      case "launching": {
        // The open window's scroll progress is the gust that carries the plane
        // off the table and through the frame. At the exit, hand it to the
        // camera-relative flight pose used throughout the journey sections.
        scratch.modeAnim.t = windowProgressAt(camera.position.z);
        applyCurveFrame(root, t);

        if (scratch.modeAnim.t >= 0.995) {
          setJourneyState({ airplaneMode: "locked" });
        }
        break;
      }

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
          root.position.lerpVectors(
            scratch.relock.from,
            scratch.lockPos,
            blend,
          );
          root.quaternion.slerp(scratch.lockQuat, Math.min(1, blend + 0.15));
        }

        const journey = getJourneyState();
        if (
          camera.position.z < JOURNEY.landingTriggerZ &&
          !journey.contactOpen
        ) {
          setJourneyState({ airplaneMode: "landing" });
        }
        break;
      }

      case "landed": {
        root.visible = landedDebug.visible;
        root.position.set(
          landedDebug.positionX,
          landedDebug.positionY,
          landedDebug.positionZ,
        );
        root.rotation.set(
          landedDebug.rotationX,
          landedDebug.rotationY,
          // A landed paper plane still breathes a little in the sea breeze.
          landedDebug.rotationZ + Math.sin(t * 1.4) * 0.012,
        );
        root.scale.set(
          landedDebug.scaleX,
          landedDebug.scaleY,
          landedDebug.scaleZ,
        );

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
    const subject = encodeURIComponent(fields.subject);
    const body = encodeURIComponent(
      `${fields.message}\n\nReply to: ${fields.email}`,
    );
    window.open(
      `mailto:${contact.email}?subject=${subject}&body=${body}`,
      "_self",
    );
    setJourneyState({ airplaneMode: "folding" });
  }, []);

  const handleClose = useCallback(() => {
    sendRequested.current = false;
    setJourneyState({ airplaneMode: "folding" });
  }, []);

  const letterOpen =
    airplaneMode === "unfolding" ||
    airplaneMode === "unfolded" ||
    airplaneMode === "folding";

  return (
    <group
      ref={rootRef}
      name="Paper Airplane Actor"
      position={CORRIDOR.airplaneRest}
      rotation={[0, CORRIDOR.airplaneRestYaw, 0]}
    >
      {/* The folded origami plane */}
      <group
        ref={planeRef}
        name="Folded Airplane"
        scale={AIRPLANE_LOOK.scale}
        renderOrder={AIRPLANE_LOOK.renderOrder}
      >
        <mesh name="Folded Airplane Mesh" geometry={geometry}>
          <meshStandardMaterial
            color={AIRPLANE_LOOK.paperColor}
            roughness={AIRPLANE_LOOK.roughness}
            metalness={AIRPLANE_LOOK.metalness}
            side={THREE.DoubleSide}
            fog
          />
          <Edges
            linewidth={AIRPLANE_LOOK.edgeLinewidth}
            threshold={AIRPLANE_LOOK.edgeThreshold}
            color={AIRPLANE_LOOK.edgeColor}
            fog
          />
        </mesh>
        <line name="Fold Line">
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[FOLD_LINE_POINTS, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={AIRPLANE_LOOK.lineColor} fog />
        </line>
      </group>

      {/* The unfolded letter with the contact form. The outer group owns the
          fold animation; the inner group is safe to tune with the inspector. */}
      <group
        ref={letterRef}
        name="Contact Letter Animation"
        visible={false}
      >
        <group
          name="Contact Letter"
          visible={messagePaperDebug.visible}
          position={[
            messagePaperDebug.positionX,
            messagePaperDebug.positionY,
            messagePaperDebug.positionZ,
          ]}
          rotation={[
            messagePaperDebug.rotationX,
            messagePaperDebug.rotationY,
            messagePaperDebug.rotationZ,
          ]}
          scale={[
            messagePaperDebug.scaleX,
            messagePaperDebug.scaleY,
            messagePaperDebug.scaleZ,
          ]}
        >
          <mesh name="Contact Letter Paper">
            <planeGeometry
              args={[messagePaperDebug.width, messagePaperDebug.height]}
            />
            <meshBasicMaterial map={paperTex} side={THREE.DoubleSide} fog />
            <Edges color="#8e8a82" fog />
          </mesh>
          {letterOpen && (
            <ContactLetterForm onSend={handleSend} onClose={handleClose} />
          )}
        </group>
      </group>
    </group>
  );
}
