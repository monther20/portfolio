"use client";

import { useCallback, useRef } from "react";
import { useJourneyState } from "../journeyState";
import { useDayNight, useDayNightTransition } from "./DayNightProvider";
import styles from "./DayNightSwitch.module.css";

/** A DOM control sharing the same clock/state as the scene's lanterns. */
export default function DayNightSwitch({ visible }: { visible: boolean }) {
  const { timeOfDay, toggle, enabled } = useDayNight();
  const journey = useJourneyState();
  const control = useRef<HTMLDivElement>(null);

  // Follow the scene's eased progress, including reversals and reduced motion,
  // rather than starting a separate CSS timer or re-rendering every frame.
  useDayNightTransition(
    useCallback((amount) => {
      control.current?.style.setProperty("--night-amount", String(amount));
    }, []),
  );

  const isNight = timeOfDay === "night";
  const locked =
    !enabled ||
    journey.cameraLocked ||
    journey.contactOpen ||
    journey.interactionLocked;

  return (
    <div
      ref={control}
      className={styles.control}
      data-visible={visible}
      aria-hidden={!visible}
    >
      <button
        type="button"
        role="switch"
        aria-label="Daylight moonlight"
        aria-checked={isNight}
        title={`Switch to ${isNight ? "light" : "dark"} mode`}
        disabled={!visible || locked}
        className={styles.button}
        onClick={toggle}
      >
        <span className={styles.label} aria-hidden="true">
          <span data-mode="day">daylight</span>
          <span data-mode="night">moonlight</span>
        </span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.star}>✧</span>
          <span className={styles.thumb}>
            <svg className={styles.sun} viewBox="0 0 24 24" fill="none">
              <path d="M16.6 11.8c.2 2.7-1.8 4.9-4.5 4.8-2.8.2-4.9-1.9-4.7-4.6-.2-2.6 1.9-4.8 4.6-4.6 2.5-.2 4.8 1.8 4.6 4.4Z" />
              <path d="m12 2 .1 2M19.1 4.9l-1.4 1.5M22 12l-2 .1m-.9 7-1.5-1.4M12 22l-.1-2m-7-1 1.4-1.4M2 12l2-.1m.9-7 1.5 1.5" />
            </svg>
            <svg className={styles.moon} viewBox="0 0 24 24" fill="none">
              <path d="M18.9 15.4A8.1 8.1 0 0 1 8.6 5.1a8.2 8.2 0 1 0 10.3 10.3Z" />
              <path d="m17 3 .5 1.8L19 5.3l-1.5.5L17 7.5l-.5-1.7-1.6-.5 1.6-.5Z" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}
