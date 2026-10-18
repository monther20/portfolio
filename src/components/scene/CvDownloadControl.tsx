"use client";

import { useCallback, useRef } from "react";
import { useJourneyState } from "./journeyState";
import { useDayNightTransition } from "./dayNight/DayNightProvider";
import styles from "./CvDownloadControl.module.css";

/** Persistent screen-space download, paired with the day/night control. */
export default function CvDownloadControl({ visible }: { visible: boolean }) {
  const control = useRef<HTMLDivElement>(null);
  const journey = useJourneyState();
  useDayNightTransition(
    useCallback((amount) => {
      control.current?.style.setProperty("--night-amount", String(amount));
    }, []),
  );
  const showControl = visible && !journey.contactOpen && !journey.interactionLocked;

  return (
    <div ref={control} className={styles.control} data-visible={showControl} aria-hidden={!showControl}>
      <a
        className={styles.link}
        href="/Monther-Abdelrazek-CV.pdf"
        download="Monther-Abdelrazek-CV.pdf"
        aria-label="Download Monther Abdelrazek's CV as a PDF"
        tabIndex={showControl ? 0 : -1}
      >
        Download CV <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
