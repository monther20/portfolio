"use client";

import { useEffect, useState } from "react";

import {
  JOURNEY_INTERACTION_EVENT,
  useResponsiveExperience,
} from "../ResponsiveExperience";

/** Input-aware exploration hint shown after the visitor enters the corridor. */
export default function JourneyHud({ visible }: { visible: boolean }) {
  const [interacted, setInteracted] = useState(false);
  const responsive = useResponsiveExperience();

  useEffect(() => {
    if (!visible) return;

    const hideHint = () => setInteracted(true);
    window.addEventListener(JOURNEY_INTERACTION_EVENT, hideHint, { once: true });
    return () => window.removeEventListener(JOURNEY_INTERACTION_EVENT, hideHint);
  }, [visible]);

  const show = visible && !interacted;

  return (
    <div
      className={`journey-hud${show ? " is-visible" : ""}`}
      aria-hidden={!show}
    >
      <div className="journey-hud__title">{responsive.journeyHint}</div>
      <div className="journey-hud__sections">
        journey · skills · projects · contact
      </div>
      {!responsive.isCoarsePointer ? (
        <div className="journey-hud__keyboard">arrow keys also work</div>
      ) : null}
      <div className="journey-hud__arrow" aria-hidden="true">↓</div>
    </div>
  );
}
