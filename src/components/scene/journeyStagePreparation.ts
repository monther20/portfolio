import { createContext, useContext } from "react";

export type JourneyStagePreparationRegistry = {
  pending: Set<Promise<unknown>>;
  register: (preparation: Promise<unknown>) => void;
};

export const JourneyStagePreparationContext =
  createContext<JourneyStagePreparationRegistry | null>(null);

/** Register baseline GPU work only when rendered inside a staged scene. */
export function useJourneyStagePreparation() {
  return useContext(JourneyStagePreparationContext)?.register;
}
