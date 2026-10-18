"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { canLoadJourneyStage, type JourneyLoadStageId } from "./journeyLoading";
import { useJourneyLoading } from "./JourneyLoadingProvider";
import {
  JourneyStagePreparationContext,
  type JourneyStagePreparationRegistry,
} from "./journeyStagePreparation";

const initializedPrograms = new WeakSet<object>();

type FogMaterialState = {
  material: THREE.Material;
  transparent: boolean;
  depthWrite: boolean;
};

async function compileStageVariants(
  gl: THREE.WebGLRenderer,
  stage: THREE.Group,
  camera: THREE.Camera,
  scene: THREE.Scene,
) {
  await gl.compileAsync(stage, camera, scene);

  const alternateStates: FogMaterialState[] = [];
  const visited = new Set<THREE.Material>();
  stage.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (visited.has(material)) continue;
      visited.add(material);
      const baseTransparent = material.userData.fogFadeBaseTransparent;
      if (
        typeof baseTransparent !== "boolean" ||
        material.transparent === baseTransparent
      ) continue;

      alternateStates.push({
        material,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      });
      material.transparent = baseTransparent;
      if (typeof material.userData.fogFadeBaseDepthWrite === "boolean") {
        material.depthWrite = material.userData.fogFadeBaseDepthWrite;
      }
      material.needsUpdate = true;
    }
  });

  if (alternateStates.length === 0) return;

  // compile() runs synchronously at the start of compileAsync(), so restore the
  // live fog state immediately while the driver finishes in parallel.
  const alternateCompilation = gl.compileAsync(stage, camera, scene);
  for (const state of alternateStates) {
    state.material.transparent = state.transparent;
    state.material.depthWrite = state.depthWrite;
    state.material.needsUpdate = true;
  }
  await alternateCompilation;
}

class StageErrorBoundary extends Component<
  {
    onError: () => void;
    children: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function StageReadySignal({
  root,
  preparations,
  onReady,
}: {
  root: RefObject<THREE.Group | null>;
  preparations: JourneyStagePreparationRegistry;
  onReady: () => void;
}) {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    const stage = root.current;
    if (!stage) return;

    let cancelled = false;
    let frame = 0;
    let settleFrame = 0;
    const compileAfterCommit = () => {
      if (cancelled) return;
      if (settleFrame < 1) {
        settleFrame += 1;
        requestAnimationFrame(compileAfterCommit);
        return;
      }

      const prepareStage = async () => {
        // Effects can register uploads after the stage's first commit. Drain
        // the live set so queued cabinet maps and preview textures finish too.
        while (!cancelled && preparations.pending.size > 0) {
          await Promise.allSettled([...preparations.pending]);
        }
        if (cancelled) return;
        await compileStageVariants(gl, stage, camera, scene).catch(
          () => undefined,
        );
        if (cancelled) return;

        // compileAsync waits for the driver but Three defers program-log,
        // uniform and attribute inspection until first use. Do that work one
        // program per frame while this stage is still behind its safe bound.
        const programs = (gl.info.programs ?? []).filter(
          (program) => !initializedPrograms.has(program),
        );
        const prepareNextProgram = () => {
          if (cancelled) return;
          const program = programs.shift();
          if (program) {
            initializedPrograms.add(program);
            try {
              program.getUniforms();
              program.getAttributes();
            } catch {
              // A warm-up failure must not deadlock journey navigation.
            }
            requestAnimationFrame(prepareNextProgram);
            return;
          }

          // Commit two frames after shader preparation, matching the previous
          // readiness signal without compiling on first visibility.
          if (frame < 1) {
            frame += 1;
            requestAnimationFrame(prepareNextProgram);
          } else {
            onReady();
          }
        };
        requestAnimationFrame(prepareNextProgram);
      };
      void prepareStage();
    };
    requestAnimationFrame(compileAfterCommit);

    return () => {
      cancelled = true;
    };
  }, [camera, gl, onReady, preparations, root, scene]);

  return null;
}

/** Mount real scenes ahead of the visitor, not a second list of cached URLs.
 * A distant suspension/error must never hide the entrance or a ready section.
 */
export default function JourneyAssetStage({
  id,
  children,
}: {
  id: JourneyLoadStageId;
  children: ReactNode;
}) {
  const { completedStages, requestedStages, markReady, markFailed } =
    useJourneyLoading();
  const root = useRef<THREE.Group>(null);
  const preparations = useMemo<JourneyStagePreparationRegistry>(() => {
    const pending = new Set<Promise<unknown>>();
    return {
      pending,
      register(preparation) {
        pending.add(preparation);
        void preparation.then(
          () => pending.delete(preparation),
          () => pending.delete(preparation),
        );
      },
    };
  }, []);
  const onReady = useCallback(() => markReady(id), [id, markReady]);
  const onError = useCallback(() => markFailed(id), [id, markFailed]);
  if (!canLoadJourneyStage(id, completedStages, requestedStages)) return null;

  return (
    <StageErrorBoundary onError={onError}>
      <Suspense fallback={null}>
        <JourneyStagePreparationContext.Provider value={preparations}>
          <group ref={root} name={`Journey Load Stage: ${id}`}>
            {children}
          </group>
          <StageReadySignal
            root={root}
            preparations={preparations}
            onReady={onReady}
          />
        </JourneyStagePreparationContext.Provider>
      </Suspense>
    </StageErrorBoundary>
  );
}
