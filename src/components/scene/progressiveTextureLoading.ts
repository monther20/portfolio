import { useLoader } from "@react-three/fiber";
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
let originalsPausedForNavigation = false;
let prioritySection: JourneySectionId | null = null;

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

function taskPriority(src: string, fallback: number) {
  return getProgressiveArtworkAsset(src)?.section === prioritySection
    ? PRIORITY.intent
    : fallback;
}

function reprioritizeQueuedOriginals() {
  for (const task of tasks.values()) {
    if (task.status !== "queued") continue;
    task.priority = taskPriority(task.src, PRIORITY.lookahead);
  }
}

function pumpTextureQueue() {
  if (originalsPausedForNavigation) return;
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

  const requestedPriority = taskPriority(src, PRIORITY[priority]);
  const existing = tasks.get(src);
  if (existing) {
    existing.priority = Math.min(existing.priority, requestedPriority);
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
    priority: requestedPriority,
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

function prefetchPreviews(assets: readonly { preview: string }[]) {
  for (const asset of assets) {
    // This uses the exact scalar R3F cache key consumed by
    // useProgressiveArtwork, so intent preloading cannot duplicate a texture.
    useLoader.preload(THREE.TextureLoader, asset.preview);
  }
}

/** Start only the lightweight destination baseline on hover/focus/touch. */
export function prefetchProgressiveSection(section: JourneySectionId) {
  prefetchPreviews(progressiveAssetsForSection(section));
}

/** Discover stage previews before its components mount. */
export function prefetchProgressiveStage(stage: JourneyLoadStageId) {
  prefetchPreviews(progressiveAssetsForStage(stage));
}

/**
 * A direct navigation gives preview/model baselines exclusive priority. New
 * original requests remain queued until the camera is allowed to move.
 */
export function prioritizeProgressiveNavigation(section: JourneySectionId) {
  prioritySection = section;
  originalsPausedForNavigation = true;
  prefetchProgressiveSection(section);
  reprioritizeQueuedOriginals();
}

/** Resume optional originals after the lightweight route is usable. */
export function resumeProgressiveOriginalLoading(clearPriority = false) {
  const wasPaused = originalsPausedForNavigation;
  const hadPriority = prioritySection !== null;
  if (!wasPaused && (!clearPriority || !hadPriority)) return;

  originalsPausedForNavigation = false;
  if (clearPriority) {
    prioritySection = null;
    reprioritizeQueuedOriginals();
  }
  pumpTextureQueue();
}
