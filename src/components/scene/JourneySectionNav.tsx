"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  JOURNEY_PROGRESS_EVENT,
  JOURNEY_SECTIONS,
  navigateToJourneySection,
  sectionIndexAtZ,
  sectionProgressAtZ,
  type JourneyProgressDetail,
  type JourneySectionId,
} from "./sectionNavigation";
import { useJourneyState } from "./journeyState";

function SectionIcon({ id }: { id: JourneySectionId }) {
  const paths: Record<JourneySectionId, ReactNode> = {
    about: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.8 19c.7-3.6 2.8-5.4 6.2-5.4s5.5 1.8 6.2 5.4" />
      </>
    ),
    journey: (
      <>
        <path d="M3.5 13.2 20.5 5l-5.6 14-3.2-5.2-5.3-.2 4.1-2.1" />
        <path d="m11.7 13.8 8.8-8.8" />
      </>
    ),
    skills: (
      <>
        <path d="m8.4 7-4 5 4 5M15.6 7l4 5-4 5" />
        <path d="m13.7 4-3.4 16" />
      </>
    ),
    projects: (
      <>
        <path d="M3.5 7.2h6l1.7 2h9.3v9.3h-17z" />
        <path d="M3.5 7.2V5h6l1.7 2.2" />
      </>
    ),
    contact: (
      <>
        <path d="M3.5 6.2h17v12h-17z" />
        <path d="m4.2 7 7.8 6 7.8-6" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

/** Scroll-synced section indicator and fast navigation for the 3D journey. */
export default function JourneySectionNav({ visible }: { visible: boolean }) {
  const [cameraZ, setCameraZ] = useState(JOURNEY_SECTIONS[0].z);
  const [hasJourneyProgress, setHasJourneyProgress] = useState(false);
  const journey = useJourneyState();

  useEffect(() => {
    const update = (event: Event) => {
      setCameraZ((event as CustomEvent<JourneyProgressDetail>).detail.z);
      // Progress events only exist after the door transition has handed control
      // to the journey. Keep this as a resilient visibility signal if the
      // page-level `entered` state is reset (for example by Fast Refresh).
      setHasJourneyProgress(true);
    };

    window.addEventListener(JOURNEY_PROGRESS_EVENT, update);
    return () => window.removeEventListener(JOURNEY_PROGRESS_EVENT, update);
  }, []);

  const activeIndex = sectionIndexAtZ(cameraZ);
  const progress = sectionProgressAtZ(cameraZ);
  const navVisible = visible || hasJourneyProgress;
  const navigationLocked =
    journey.cameraLocked || journey.contactOpen || journey.interactionLocked;

  return (
    <nav
      className={`journey-section-nav${navVisible ? " is-visible" : ""}`}
      aria-label="Portfolio sections"
      aria-hidden={!navVisible}
      style={{ "--section-progress": progress } as CSSProperties}
    >
      <div className="journey-section-nav__rail" aria-hidden="true">
        <span />
      </div>
      <ol className="journey-section-nav__list">
        {JOURNEY_SECTIONS.map((section, index) => {
          const active = index === activeIndex;

          return (
            <li key={section.id}>
              <button
                type="button"
                className={`journey-section-nav__button${active ? " is-active" : ""}`}
                aria-label={`Go to ${section.label} section`}
                aria-current={active ? "location" : undefined}
                disabled={!navVisible || navigationLocked}
                onClick={() => navigateToJourneySection(section)}
              >
                <span className="journey-section-nav__label">
                  {section.label}
                </span>
                <span className="journey-section-nav__icon" aria-hidden="true">
                  <SectionIcon id={section.id} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
