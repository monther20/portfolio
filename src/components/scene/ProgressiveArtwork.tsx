"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { JOURNEY_INTERACTION_EVENT } from "../ResponsiveExperience";
import { configureArtworkTexture } from "./artworkTexture";
import { getProgressiveArtworkAsset } from "./progressiveAssetManifest";
import { useJourneyStagePreparation } from "./journeyStagePreparation";
import { requestProgressiveTexture } from "./progressiveTextureLoading";

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

type LoadedTexture = {
  src: string;
  texture: THREE.Texture;
};

export type ProgressiveArtworkTexture = {
  preview: THREE.Texture;
  original: THREE.Texture;
  originalReady: boolean;
  width: number;
  height: number;
};

const preparedByRenderer = new WeakMap<
  THREE.WebGLRenderer,
  WeakMap<THREE.Texture, Promise<void>>
>();
const backgroundUploadChainByRenderer = new WeakMap<
  THREE.WebGLRenderer,
  Promise<void>
>();
const imminentUploadChainByRenderer = new WeakMap<
  THREE.WebGLRenderer,
  Promise<void>
>();
const UPLOAD_QUIET_PERIOD_MS = 3000;
let uploadsQuietUntil = 0;
let listeningForJourneyInteraction = false;

function deferUploadsDuringInteraction() {
  if (typeof performance === "undefined") return;
  uploadsQuietUntil = Math.max(
    uploadsQuietUntil,
    performance.now() + UPLOAD_QUIET_PERIOD_MS,
  );
}

function installInteractionListener() {
  if (listeningForJourneyInteraction || typeof window === "undefined") return;
  listeningForJourneyInteraction = true;
  window.addEventListener(
    JOURNEY_INTERACTION_EVENT,
    deferUploadsDuringInteraction,
  );
}

function runWhenRenderingIsIdle(
  callback: () => void,
  deferForInteraction: boolean,
) {
  if (typeof window === "undefined") {
    callback();
    return;
  }

  installInteractionListener();
  const idleWindow = window as IdleWindow;
  const schedule = () => {
    const remaining = deferForInteraction
      ? uploadsQuietUntil - performance.now()
      : 0;
    if (remaining > 0) {
      window.setTimeout(schedule, remaining + 16);
      return;
    }

    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(() => {
        if (deferForInteraction && performance.now() < uploadsQuietUntil) {
          schedule();
        } else {
          callback();
        }
      }, { timeout: 500 });
    } else {
      window.setTimeout(() => {
        if (deferForInteraction && performance.now() < uploadsQuietUntil) {
          schedule();
        } else {
          callback();
        }
      }, 32);
    }
  };

  schedule();
}

/** Upload only one newly decoded texture per idle opportunity/frame. */
export function prepareTextureForRenderer(
  gl: THREE.WebGLRenderer,
  texture: THREE.Texture,
  deferForInteraction = true,
) {
  let preparedTextures = preparedByRenderer.get(gl);
  if (!preparedTextures) {
    preparedTextures = new WeakMap();
    preparedByRenderer.set(gl, preparedTextures);
  }

  const prepared = preparedTextures.get(texture);
  if (prepared) return prepared;

  const chainByRenderer = deferForInteraction
    ? backgroundUploadChainByRenderer
    : imminentUploadChainByRenderer;
  const previous = chainByRenderer.get(gl) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          runWhenRenderingIsIdle(() => {
            try {
              gl.initTexture(texture);
              resolve();
            } catch (error) {
              reject(error);
            }
          }, deferForInteraction);
        }),
    );

  chainByRenderer.set(gl, next);
  preparedTextures.set(texture, next);
  return next;
}

/**
 * The preview participates in Suspense and is therefore the section baseline.
 * The original is loaded, decoded and GPU-prepared independently; failures
 * leave the preview in place without blocking navigation.
 */
export function useProgressiveArtwork(
  src: string,
): ProgressiveArtworkTexture {
  const asset = getProgressiveArtworkAsset(src);
  const preview = useLoader(
    THREE.TextureLoader,
    asset?.preview ?? src,
  );
  const { gl } = useThree();
  const registerStagePreparation = useJourneyStagePreparation();
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);

  useLayoutEffect(() => {
    installInteractionListener();
    if (asset) deferUploadsDuringInteraction();
    configureArtworkTexture(
      preview,
      gl.capabilities.getMaxAnisotropy(),
    );
    const preparation = prepareTextureForRenderer(gl, preview, false);
    registerStagePreparation?.(preparation);
  }, [asset, gl, preview, registerStagePreparation]);

  useEffect(() => {
    if (!asset) return;

    let cancelled = false;
    void requestProgressiveTexture(src)
      .then((texture) => {
        configureArtworkTexture(
          texture,
          gl.capabilities.getMaxAnisotropy(),
        );
        return prepareTextureForRenderer(gl, texture).then(() => texture);
      })
      .then((texture) => {
        if (!cancelled) setLoaded({ src, texture });
      })
      .catch(() => {
        // Keep the preview indefinitely if the optional quality upgrade fails.
      });

    return () => {
      cancelled = true;
    };
  }, [asset, gl, src]);

  const currentOriginal = loaded?.src === src ? loaded.texture : null;
  const image = preview.image as HTMLImageElement | undefined;

  return {
    preview,
    original: currentOriginal ?? preview,
    originalReady: !asset || currentOriginal !== null,
    width: asset?.width ?? image?.width ?? 1,
    height: asset?.height ?? image?.height ?? 1,
  };
}
