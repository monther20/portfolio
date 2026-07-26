"use client";

import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";

import {
  AIRPLANE_CAMERA_OFFSET,
  BEACH,
  CORRIDOR,
  JOURNEY,
  landingProgressAt,
  windowProgressAt,
} from "./journeyConfig";
import { useFogFade } from "./useFogFade";
import {
  getJourneyState,
  setJourneyState,
  useJourneyState,
} from "./journeyState";
import {
  AIRPLANE_LOOK,
  AIRPLANE_WOBBLE,
} from "./airplane/airplaneGeometry";
import {
  useAirplaneModeEffects,
  type AirplaneFoldAnimationControls,
  type ModeAnim,
} from "./airplane/useAirplaneModeEffects";
import ContactLetterForm, {
  type LetterFields,
} from "./airplane/ContactLetterForm";
import {
  createPaperAirplaneDebugGui,
  createPaperAirplaneDebugState,
  type PaperAirplaneDebugState,
} from "./debug/createPaperAirplaneDebugGui";
import { contact } from "@/data/portfolio";

/** The plane's resting pose once it has landed on the boardwalk. */
const LANDED_EULER = new THREE.Euler(0, 0.165407346410207, 0.04);

const MESSAGE_PAPER_POSITION: [number, number, number] = [0, 0.04, 0];
const MESSAGE_PAPER_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const MESSAGE_PAPER_SCALE: [number, number, number] = [0.27, 0.22, 1];
const PAPER_AIRPLANE_MODEL_URL = "/paperairplane.glb";

function PaperAirplaneModel({
  debug,
  foldAnimationRef,
}: {
  debug: PaperAirplaneDebugState;
  foldAnimationRef: MutableRefObject<AirplaneFoldAnimationControls | null>;
}) {
  const gltf = useGLTF(PAPER_AIRPLANE_MODEL_URL);
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions, mixer } = useAnimations(gltf.animations, modelScene);
  const foldClip = useMemo(
    () =>
      gltf.animations.find((clip) => clip.name.toLowerCase() === "fold") ??
      gltf.animations.find((clip) => clip.name.toLowerCase().includes("fold")) ??
      gltf.animations[0],
    [gltf.animations],
  );

  useEffect(() => {
    modelScene.traverse((child) => {
      const mesh = child as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.Material | THREE.Material[]
      >;
      if (!mesh.isMesh) return;

      mesh.frustumCulled = false;
      mesh.renderOrder = AIRPLANE_LOOK.renderOrder;

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        material.side = THREE.DoubleSide;
        (material as THREE.Material & { fog?: boolean }).fog = true;
        material.needsUpdate = true;
      });
    });
  }, [modelScene]);

  const setFoldProgress = useCallback(
    (progress: number) => {
      if (!foldClip) return;

      const action = actions[foldClip.name];
      if (!action) return;

      action.enabled = true;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      action.paused = false;
      action.play();
      mixer.setTime(foldClip.duration * THREE.MathUtils.clamp(progress, 0, 1));
      action.paused = true;
    },
    [actions, foldClip, mixer],
  );

  useLayoutEffect(() => {
    const controls: AirplaneFoldAnimationControls = {
      duration: foldClip?.duration ?? 0,
      setProgress: setFoldProgress,
    };

    foldAnimationRef.current = controls;
    setFoldProgress(debug.animation.foldProgress);

    return () => {
      if (foldAnimationRef.current === controls) {
        foldAnimationRef.current = null;
      }
    };
  }, [debug.animation.foldProgress, foldAnimationRef, foldClip, setFoldProgress]);

  return (
    <group
      name="Paper Airplane GLB Model"
      visible={debug.model.visible}
      position={[debug.model.x, debug.model.y, debug.model.z]}
      rotation={[
        THREE.MathUtils.degToRad(debug.model.rotationX),
        THREE.MathUtils.degToRad(debug.model.rotationY),
        THREE.MathUtils.degToRad(debug.model.rotationZ),
      ]}
      scale={debug.model.scale}
    >
      <primitive object={modelScene} />
    </group>
  );
}

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
  const foldAnimationRef = useRef<AirplaneFoldAnimationControls | null>(null);
  const sendRequested = useRef(false);
  const airplaneDebug = useMemo(() => createPaperAirplaneDebugState(), []);
  const [, refreshAirplaneDebug] = useState(0);

  useEffect(() => {
    let gui: { destroy: () => void } | undefined;
    let disposed = false;

    createPaperAirplaneDebugGui({
      state: airplaneDebug,
      foldAnimationRef,
      onChange: () => refreshAirplaneDebug((version) => version + 1),
    })
      .then((createdGui) => {
        if (disposed) {
          createdGui.destroy();
          return;
        }

        gui = createdGui;
      })
      .catch((error) => {
        if (!disposed) {
          console.error("Failed to create paper airplane debug GUI", error);
        }
      });

    return () => {
      disposed = true;
      gui?.destroy();
    };
  }, [airplaneDebug]);

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
        launchCurve: null,
        launchStartQuaternion: new THREE.Quaternion(),
        landingCurve: null,
        landingStartQuaternion: new THREE.Quaternion(),
        landingStartZ: null,
      } as ModeAnim,
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
    foldAnimationRef,
    modeAnim: scratch.modeAnim,
    sendRequested,
  });

  /** The camera-locked flight pose (position + wobble quaternion). */
  const computeLockedPose = useCallback(() => {
    scratch.offset
      .set(
        AIRPLANE_CAMERA_OFFSET.x,
        AIRPLANE_CAMERA_OFFSET.y,
        AIRPLANE_CAMERA_OFFSET.z,
      )
      .applyQuaternion(camera.quaternion);
    scratch.lockPos.copy(camera.position).add(scratch.offset);

    // Every maneuver phase comes from camera distance, not elapsed time, so
    // the airplane freezes exactly when the scroll-driven camera does.
    const w = AIRPLANE_WOBBLE;
    const flightDistance = Math.max(
      0,
      JOURNEY.windowExitZ - camera.position.z,
    );
    const roll =
      Math.sin(flightDistance * w.rollFrequency) * w.rollStrength;
    const pitch =
      w.pitchBase +
      Math.sin(flightDistance * w.pitchFrequency) * w.pitchStrength;
    const yaw = Math.sin(flightDistance * w.yawFrequency) * w.yawStrength;

    scratch.wobbleEuler.set(pitch, yaw, roll);
    scratch.wobbleQuat.setFromEuler(scratch.wobbleEuler);
    scratch.lockQuat.copy(camera.quaternion).multiply(scratch.wobbleQuat);
  }, [camera, scratch]);

  /** Follow the active scripted curve; nose along the tangent. */
  const applyCurveFrame = useCallback(
    (root: THREE.Group) => {
      const anim = scratch.modeAnim;
      if (!anim.curve) return;

      const t = THREE.MathUtils.clamp(anim.t, 0, 1);
      anim.curve.getPointAt(t, scratch.curvePos);
      anim.curve.getTangentAt(t, scratch.tangent);
      root.position.copy(scratch.curvePos);

      // The model's nose points down -z, so look *away* from the tangent.
      scratch.lookTarget.copy(scratch.curvePos).sub(scratch.tangent);
      root.lookAt(scratch.lookTarget);

      if (anim.kind === "launch") {
        // Gust motion is also a function of scroll progress, making it pause
        // and reverse together with the launch path.
        const gustEnvelope = Math.sin(Math.PI * t);
        root.position.x +=
          (Math.sin(t * 22) * 0.055 + Math.sin(t * Math.PI * 3) * 0.09) *
          gustEnvelope;
        root.position.y +=
          (Math.sin(t * 27) * 0.035 + 0.075) * gustEnvelope;

        const bankFade = 1 - THREE.MathUtils.smoothstep(t, 0.25, 0.85);
        const gustBank = Math.sin(t * 25) * 0.045 * gustEnvelope;
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
        computeLockedPose();
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

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;
    const t = state.clock.elapsedTime;

    if (airplaneMode !== "landed") {
      root.visible = true;
      root.scale.set(1, 1, 1);
    }

    switch (airplaneMode) {
      case "resting": {
        root.position.set(...CORRIDOR.airplaneRest);
        root.rotation.set(0, CORRIDOR.airplaneRestYaw, 0);
        break;
      }

      case "launching": {
        // The open window's scroll progress is the gust that carries the plane
        // off the table and through the frame. At the exit, hand it to the
        // camera-relative flight pose used throughout the journey sections.
        scratch.modeAnim.t = windowProgressAt(camera.position.z);
        applyCurveFrame(root);

        if (scratch.modeAnim.t >= 0.995) {
          setJourneyState({ airplaneMode: "locked" });
        }
        break;
      }

      case "landing": {
        // Camera z is the landing timeline: wheel movement advances it, no
        // movement freezes it, and back-scrolling reverses the same curve.
        const landingStartZ =
          scratch.modeAnim.landingStartZ ?? JOURNEY.landingTriggerZ;
        scratch.modeAnim.t = landingProgressAt(
          camera.position.z,
          landingStartZ,
        );
        applyCurveFrame(root);

        if (scratch.modeAnim.t >= 0.999) {
          setJourneyState({ airplaneMode: "landed" });
        } else if (camera.position.z >= landingStartZ) {
          setJourneyState({ airplaneMode: "locked" });
        }
        break;
      }

      case "sendoff": {
        // Sending the contact letter remains an intentional one-shot cinematic.
        applyCurveFrame(root);
        break;
      }

      case "locked": {
        computeLockedPose();
        root.position.copy(scratch.lockPos);
        root.quaternion.copy(scratch.lockQuat);

        const journey = getJourneyState();
        const landingStartZ =
          scratch.modeAnim.landingStartZ ?? JOURNEY.landingTriggerZ;
        if (windowProgressAt(camera.position.z) < 0.99) {
          setJourneyState({ airplaneMode: "launching" });
        } else if (
          camera.position.z < landingStartZ &&
          !journey.contactOpen
        ) {
          setJourneyState({ airplaneMode: "landing" });
        }
        break;
      }

      case "landed": {
        root.visible = true;
        root.position.set(...BEACH.landing);
        root.rotation.set(
          LANDED_EULER.x,
          LANDED_EULER.y,
          // A landed paper plane still breathes a little in the sea breeze.
          LANDED_EULER.z + Math.sin(t * 1.4) * 0.012,
        );
        root.scale.set(1, 1, 1);

        const journey = getJourneyState();
        const landingStartZ =
          scratch.modeAnim.landingStartZ ?? JOURNEY.landingTriggerZ;
        if (
          landingProgressAt(camera.position.z, landingStartZ) < 0.999 &&
          !journey.contactOpen &&
          !journey.cameraLocked
        ) {
          setJourneyState({ airplaneMode: "landing" });
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
      {/* The folded paper airplane model from /public/paperairplane.glb. */}
      <group
        ref={planeRef}
        name="Folded Airplane"
        renderOrder={AIRPLANE_LOOK.renderOrder}
      >
        <PaperAirplaneModel
          debug={airplaneDebug}
          foldAnimationRef={foldAnimationRef}
        />
      </group>

      {/* Input fields are projected over the unfolded GLB paper; no duplicate
          paper mesh is shown during the contact interaction. */}
      <group
        ref={letterRef}
        name="Contact Letter Animation"
        visible={false}
      >
        <group
          name="Contact Letter"
          position={MESSAGE_PAPER_POSITION}
          rotation={MESSAGE_PAPER_ROTATION}
          scale={MESSAGE_PAPER_SCALE}
        >
          {letterOpen && (
            <ContactLetterForm
              onSend={handleSend}
              onClose={handleClose}
              debug={airplaneDebug.contactForm}
            />
          )}
        </group>
      </group>
    </group>
  );
}
