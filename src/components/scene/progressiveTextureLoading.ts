import * as THREE from "three";

import {
  getProgressiveArtworkAsset,
  progressiveAssetsForSection,
  progressiveAssetsForStage,
} from "./progressiveAssetManifest";
import type { JourneyLoadStageId } from "./journeyLoading";
import type { JourneySectionId } from "./sectionNavigation";

export type ProgressiveLoadPriority = "intent" | "lookahead";

type TextureTask = {
  src: string;
  priority: number;
  order: number;
  status: "queued" | "loading" | "ready" | "failed";
  promise: Promise<THREE.Texture>;
  resolve: (texture: THREE.Texture) => void;
  reject: (error: Error) => void;
};

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
};

const PRIORITY: Record<ProgressiveLoadPriority, number> = {
  intent: 0,
  lookahead: 1,
};

const tasks = new Map<string, TextureTask>();
const textureLoader = new THREE.TextureLoader();
let activeTasks = 0;
let taskOrder = 0;
let listeningForVisibility = false;

function concurrentTextureLimit() {
  if (typeof navigator === "undefined") return 2;
  const connection = (navigator as NavigatorWithConnection).connection;
  return connection?.saveData || connection?.effectiveType === "2g" ? 1 : 2;
}

function installVisibilityListener() {
  if (
    listeningForVisibility ||
    typeof document === "undefined"
  ) return;

  listeningForVisibility = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) pumpTextureQueue();
  });
}

function decodeTextureImage(texture: THREE.Texture) {
  const image = texture.image as { decode?: () => Promise<void> } | undefined;
  if (!image?.decode) return Promise.resolve();
  return image.decode().catch(() => undefined);
}

function finishTask(task: TextureTask) {
  activeTasks = Math.max(0, activeTasks - 1);
  pumpTextureQueue();
}

function startTask(task: TextureTask) {
  task.status = "loading";
  activeTasks += 1;

  textureLoader.load(
    task.src,
    (texture) => {
      void decodeTextureImage(texture).then(() => {
        task.status = "ready";
        task.resolve(texture);
        finishTask(task);
      });
    },
    undefined,
    (reason) => {
      task.status = "failed";
      task.reject(
        reason instanceof Error
          ? reason
          : new Error(`Could not load progressive texture: ${task.src}`),
      );
      finishTask(task);
    },
  );
}

function pumpTextureQueue() {
  if (typeof document !== "undefined" && document.hidden) return;

  const limit = concurrentTextureLimit();
  while (activeTasks < limit) {
    const next = [...tasks.values()]
      .filter((task) => task.status === "queued")
      .sort(
        (a, b) => a.priority - b.priority || a.order - b.order,
      )[0];
    if (!next) return;
    startTask(next);
  }
}

/**
 * Load each original texture once, with bounded concurrency. Components keep
 * rendering their preview while this shared promise is pending or rejected.
 */
export function requestProgressiveTexture(
  src: string,
  priority: ProgressiveLoadPriority = "lookahead",
): Promise<THREE.Texture> {
  if (!getProgressiveArtworkAsset(src)) {
    return Promise.reject(
      new Error(`No progressive artwork descriptor for ${src}`),
    );
  }

  const existing = tasks.get(src);
  if (existing) {
    existing.priority = Math.min(existing.priority, PRIORITY[priority]);
    pumpTextureQueue();
    return existing.promise;
  }

  let resolve!: (texture: THREE.Texture) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<THREE.Texture>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  const task: TextureTask = {
    src,
    priority: PRIORITY[priority],
    order: taskOrder,
    status: "queued",
    promise,
    resolve,
    reject,
  };
  taskOrder += 1;
  tasks.set(src, task);
  installVisibilityListener();
  pumpTextureQueue();
  return promise;
}

function prefetchAssets(
  assets: readonly { src: string }[],
  priority: ProgressiveLoadPriority,
) {
  for (const asset of assets) {
    void requestProgressiveTexture(asset.src, priority).catch(() => {
      // A failed original is non-fatal: its small preview remains visible.
    });
  }
}

/** Start likely destination artwork on hover/focus/touch intent. */
export function prefetchProgressiveSection(section: JourneySectionId) {
  prefetchAssets(progressiveAssetsForSection(section), "intent");
}

/** Start originals when the existing journey staging requests their section. */
export function prefetchProgressiveStage(stage: JourneyLoadStageId) {
  prefetchAssets(progressiveAssetsForStage(stage), "lookahead");
}
