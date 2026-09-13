"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import type * as THREE from "three";
import { useResponsiveExperience } from "../../ResponsiveExperience";
import {
  createLanternUniforms,
  DAY_NIGHT_TRANSITION,
  type TimeOfDay,
} from "./config";

function createTransition() {
  return {
    uniforms: createLanternUniforms(),
    listeners: new Set<(amount: number) => void>(),
    bloomSelection: [] as THREE.Object3D[],
    lights: [] as THREE.Object3D[],
    registryVersion: 0,
  };
}

type DayNightContextValue = {
  timeOfDay: TimeOfDay;
  toggle: () => void;
  enabled: boolean;
  transition: ReturnType<typeof createTransition>;
};
const DayNightContext = createContext<DayNightContextValue | null>(null);

export function DayNightProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const transition = useMemo(createTransition, []);
  const { reducedMotion } = useResponsiveExperience();
  const gl = useThree((state) => state.gl);
  const toggle = useCallback(() => {
    if (enabled)
      setTimeOfDay((current) => (current === "day" ? "night" : "day"));
  }, [enabled]);

  useEffect(() => {
    const amount = transition.uniforms.nightAmount;
    // Camera transitions may lock the toggle, but never reset the chosen time.
    const target = timeOfDay === "night" ? 1 : 0;
    const publish = () =>
      transition.listeners.forEach((listener) => listener(amount.value));
    const tween = gsap.to(amount, {
      value: target,
      duration: reducedMotion
        ? DAY_NIGHT_TRANSITION.reducedDuration
        : DAY_NIGHT_TRANSITION.duration,
      ease: DAY_NIGHT_TRANSITION.ease,
      overwrite: true,
      onUpdate: publish,
      onComplete: () => {
        amount.value = target;
        publish();
      },
    });
    return () => {
      tween.kill();
    };
  }, [reducedMotion, timeOfDay, transition]);

  useEffect(() => {
    // Only the existing navigation/hints use this attribute, never a canvas filter.
    const root = gl.domElement.closest<HTMLElement>(".experience-root");
    if (!root) return;
    root.dataset.timeOfDay = timeOfDay;
    return () => {
      delete root.dataset.timeOfDay;
    };
  }, [gl, timeOfDay]);

  useEffect(() => {
    // Keyboard equivalent without adding a competing on-screen theme switch.
    const canvas = gl.domElement;
    // R3F puts Canvas's tabIndex/aria-label on its wrapping div, not the canvas.
    const keyboardTarget = canvas.closest<HTMLElement>("[tabindex]") ?? canvas;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.target !== canvas && event.target !== keyboardTarget) ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        toggle();
      }
    };
    keyboardTarget.addEventListener("keydown", onKeyDown);
    return () => keyboardTarget.removeEventListener("keydown", onKeyDown);
  }, [gl, toggle]);

  const value = useMemo(
    () => ({ timeOfDay, toggle, enabled, transition }),
    [timeOfDay, toggle, enabled, transition],
  );
  return (
    <DayNightContext.Provider value={value}>
      {children}
    </DayNightContext.Provider>
  );
}

export function useDayNight() {
  const context = useContext(DayNightContext);
  if (!context) throw new Error("useDayNight must be inside DayNightProvider.");
  return context;
}

/** One GSAP clock updates registered properties, with no per-frame React state.
 * Every subscriber interpolates from saved endpoints, so interrupted/repeated
 * toggles cannot accumulate tints. Late-mounted consumers receive the current mix.
 */
export function useDayNightTransition(apply: (amount: number) => void) {
  const { transition } = useDayNight();
  useLayoutEffect(() => {
    transition.listeners.add(apply);
    apply(transition.uniforms.nightAmount.value);
    return () => {
      transition.listeners.delete(apply);
    };
  }, [apply, transition]);
}
