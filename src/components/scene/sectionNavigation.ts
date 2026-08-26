import { JOURNEY, corridorStationZ } from "./journeyConfig";

export const JOURNEY_NAVIGATE_EVENT = "portfolio:journey-navigate";
export const JOURNEY_PROGRESS_EVENT = "portfolio:journey-progress";

export const JOURNEY_SECTIONS = [
  {
    id: "about",
    label: "About",
    /** Stop just before the first corridor story panel. */
    z: corridorStationZ(0) + 7,
  },
  {
    id: "journey",
    label: "Journey",
    z: JOURNEY.journeyAnchorZ + 5,
  },
  {
    id: "skills",
    label: "Skills",
    z: JOURNEY.skillsAnchorZ + 5,
  },
  {
    id: "projects",
    label: "Projects",
    z: JOURNEY.projectsAnchorZ + 5,
  },
  {
    id: "contact",
    label: "Contact",
    z: JOURNEY.farBound,
  },
] as const;

export type JourneySectionId = (typeof JOURNEY_SECTIONS)[number]["id"];

export type JourneyNavigateDetail = {
  id: JourneySectionId;
  z: number;
};

export type JourneyProgressDetail = {
  z: number;
};

/** Ask the R3F camera manager to animate to a portfolio section. */
export function navigateToJourneySection(
  section: (typeof JOURNEY_SECTIONS)[number],
) {
  window.dispatchEvent(
    new CustomEvent<JourneyNavigateDetail>(JOURNEY_NAVIGATE_EVENT, {
      detail: { id: section.id, z: section.z },
    }),
  );
}

export function sectionIndexAtZ(z: number): number {
  for (let index = 0; index < JOURNEY_SECTIONS.length - 1; index += 1) {
    const current = JOURNEY_SECTIONS[index];
    const next = JOURNEY_SECTIONS[index + 1];
    const midpoint = (current.z + next.z) / 2;

    if (z > midpoint) return index;
  }

  return JOURNEY_SECTIONS.length - 1;
}

export function sectionProgressAtZ(z: number): number {
  const startZ = JOURNEY_SECTIONS[0].z;
  const endZ = JOURNEY_SECTIONS[JOURNEY_SECTIONS.length - 1].z;
  return Math.min(1, Math.max(0, (startZ - z) / (startZ - endZ)));
}
