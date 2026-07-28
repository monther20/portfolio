"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ExperienceLayout =
  | "wide"
  | "standard"
  | "tablet"
  | "phone"
  | "short-landscape";

export type QualityTier = "low" | "medium" | "high";

export type ResponsiveExperienceProfile = {
  width: number;
  height: number;
  aspect: number;
  layout: ExperienceLayout;
  qualityTier: QualityTier;
  isPortrait: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isCompact: boolean;
  isShortLandscape: boolean;
  isCoarsePointer: boolean;
  reducedMotion: boolean;
  cameraFov: number;
  maxDpr: number;
  laneScale: number;
  greeterScale: number;
  corridorFocusScale: number;
  projectFocusDistance: number;
  hitTargetScale: number;
  motionScale: number;
  parallaxScale: number;
  journeyHint: string;
};

type BrowserSignals = {
  width: number;
  height: number;
  devicePixelRatio: number;
  coarsePointer: boolean;
  reducedMotion: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
};

// Start conservatively during SSR; capable clients upgrade after hydration.
const DEFAULT_SIGNALS: BrowserSignals = {
  width: 390,
  height: 844,
  devicePixelRatio: 1,
  coarsePointer: false,
  reducedMotion: false,
  hardwareConcurrency: 4,
};

function buildProfile(signals: BrowserSignals): ResponsiveExperienceProfile {
  const width = Math.max(240, signals.width);
  const height = Math.max(240, signals.height);
  const aspect = width / height;
  const isPortrait = aspect < 0.9;
  const isShortLandscape = !isPortrait && height < 500;
  const hasPhoneSizedEdge = Math.min(width, height) < 600;
  const isPhone =
    width < 600 || (signals.coarsePointer && hasPhoneSizedEdge);
  const isTablet = !isPhone && (width < 1100 || signals.coarsePointer);
  const isCompact = isPhone || isTablet || isShortLandscape;
  const lowPower =
    (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) ||
    signals.hardwareConcurrency <= 4;

  let layout: ExperienceLayout = "standard";
  if (isShortLandscape) layout = "short-landscape";
  else if (isPhone) layout = "phone";
  else if (isTablet) layout = "tablet";
  else if (width >= 1600 && height >= 850) layout = "wide";

  const qualityTier: QualityTier = lowPower || isPhone
    ? "low"
    : isTablet || width < 1440
      ? "medium"
      : "high";

  const cameraFov = isPhone && isPortrait
    ? 43
    : isShortLandscape
      ? 38
      : isPortrait
        ? 37
        : isTablet
          ? 33
          : 30;

  const laneScale = isPhone && isPortrait
    ? 0.58
    : isShortLandscape
      ? 0.74
      : isTablet && isPortrait
        ? 0.72
        : isTablet
          ? 0.84
          : layout === "wide"
            ? 1
            : 0.92;

  const dprCap = qualityTier === "low"
    ? 1.15
    : qualityTier === "medium"
      ? 1.4
      : 1.75;

  return {
    width,
    height,
    aspect,
    layout,
    qualityTier,
    isPortrait,
    isPhone,
    isTablet,
    isCompact,
    isShortLandscape,
    isCoarsePointer: signals.coarsePointer,
    reducedMotion: signals.reducedMotion,
    cameraFov,
    maxDpr: Math.max(1, Math.min(signals.devicePixelRatio, dprCap)),
    laneScale,
    greeterScale: isPhone ? 0.84 : isShortLandscape ? 0.88 : isTablet ? 0.93 : 1,
    corridorFocusScale: isPhone ? 1.8 : isTablet ? 1.5 : isShortLandscape ? 1.3 : 1,
    projectFocusDistance: isPhone ? 3.45 : isTablet ? 3.9 : isShortLandscape ? 3.8 : 4.6,
    hitTargetScale: signals.coarsePointer ? 1.32 : 1,
    motionScale: signals.reducedMotion ? 0 : qualityTier === "low" ? 0.65 : 1,
    parallaxScale: signals.reducedMotion || signals.coarsePointer ? 0 : 1,
    journeyHint: signals.coarsePointer ? "swipe up to explore" : "scroll to explore",
  };
}

const DEFAULT_PROFILE = buildProfile(DEFAULT_SIGNALS);
const ResponsiveExperienceContext = createContext(DEFAULT_PROFILE);

function readBrowserSignals(): BrowserSignals {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    coarsePointer:
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    hardwareConcurrency: navigator.hardwareConcurrency || 8,
    deviceMemory: navigatorWithMemory.deviceMemory,
  };
}

export function ResponsiveExperienceProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<BrowserSignals>(DEFAULT_SIGNALS);

  useEffect(() => {
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setSignals(readBrowserSignals()));
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    coarseQuery.addEventListener("change", update);
    motionQuery.addEventListener("change", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      coarseQuery.removeEventListener("change", update);
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  const profile = useMemo(() => buildProfile(signals), [signals]);

  return (
    <ResponsiveExperienceContext.Provider value={profile}>
      {children}
    </ResponsiveExperienceContext.Provider>
  );
}

export function useResponsiveExperience(): ResponsiveExperienceProfile {
  return useContext(ResponsiveExperienceContext);
}

export const JOURNEY_INTERACTION_EVENT = "portfolio:journey-interaction";

export function reportJourneyInteraction() {
  window.dispatchEvent(new Event(JOURNEY_INTERACTION_EVENT));
}
