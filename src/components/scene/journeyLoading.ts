import { JOURNEY, corridorStationZ } from "./journeyConfig";

/** Later scenes mount in travel order, independently of the entrance loader. */
export const JOURNEY_LOAD_STAGES = [
  {
    id: "corridor-far",
    label: "the rest of the corridor",
    stopZ: corridorStationZ(0) + 2,
  },
  { id: "window", label: "the window", stopZ: JOURNEY.launchTriggerZ + 12 },
  { id: "flight", label: "the flight", stopZ: JOURNEY.launchTriggerZ + 1 },
  { id: "journey", label: "Journey", stopZ: JOURNEY.windowExitZ + 1 },
  { id: "skills", label: "Skills", stopZ: JOURNEY.journeyAnchorZ - 6 },
  { id: "projects", label: "Projects", stopZ: JOURNEY.skillsAnchorZ - 6 },
  { id: "contact", label: "Contact", stopZ: JOURNEY.projectsAnchorZ - 6 },
] as const;

export type JourneyLoadStageId = (typeof JOURNEY_LOAD_STAGES)[number]["id"];

/** Never let the camera pass the first scene that hasn't committed yet. */
export function readyJourneyFarBound(completedStages: number): number {
  return JOURNEY_LOAD_STAGES[completedStages]?.stopZ ?? JOURNEY.farBound;
}

export function canLoadJourneyStage(
  id: JourneyLoadStageId,
  completedStages: number,
  requestedStages: number = JOURNEY_LOAD_STAGES.length,
): boolean {
  const index = JOURNEY_LOAD_STAGES.findIndex((stage) => stage.id === id);
  return index <= completedStages && index < requestedStages;
}

/** Number of ordered stages that must be ready before the camera can reach z. */
export function journeyStagesNeededForZ(z: number): number {
  let completedStages = 0;
  while (
    completedStages < JOURNEY_LOAD_STAGES.length &&
    z < readyJourneyFarBound(completedStages)
  ) {
    completedStages += 1;
  }
  return completedStages;
}

export function completeJourneyStage(
  id: JourneyLoadStageId,
  completedStages: number,
): number {
  return JOURNEY_LOAD_STAGES[completedStages]?.id === id
    ? completedStages + 1
    : completedStages;
}
