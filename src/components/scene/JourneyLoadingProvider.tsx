"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  completeJourneyStage,
  type JourneyLoadStageId,
} from "./journeyLoading";

type JourneyLoadingState = {
  completedStages: number;
  markReady: (id: JourneyLoadStageId) => void;
  failedStage: JourneyLoadStageId | null;
  markFailed: (id: JourneyLoadStageId) => void;
  waitingFor: string | null;
  setWaitingFor: (label: string | null) => void;
};

const JourneyLoadingContext = createContext<JourneyLoadingState | null>(null);

export function JourneyLoadingProvider({ children }: { children: ReactNode }) {
  const [completedStages, setCompletedStages] = useState(0);
  const [failedStage, markFailed] = useState<JourneyLoadStageId | null>(null);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const markReady = useCallback((id: JourneyLoadStageId) => {
    setCompletedStages((current) => completeJourneyStage(id, current));
  }, []);
  const value = useMemo(
    () => ({
      completedStages,
      markReady,
      failedStage,
      markFailed,
      waitingFor,
      setWaitingFor,
    }),
    [completedStages, markReady, failedStage, waitingFor],
  );

  return (
    <JourneyLoadingContext.Provider value={value}>
      {children}
    </JourneyLoadingContext.Provider>
  );
}

export function useJourneyLoading() {
  const value = useContext(JourneyLoadingContext);
  if (!value)
    throw new Error("Journey loading requires JourneyLoadingProvider.");
  return value;
}

/** Only appears if a visitor actually catches up with background loading. */
export function JourneyLoadingNotice({ visible }: { visible: boolean }) {
  const { waitingFor, failedStage } = useJourneyLoading();
  if (!visible || !waitingFor) return null;

  return (
    <div className="journey-loading-notice" role="status" aria-live="polite">
      <span>
        {failedStage
          ? "This part couldn’t load. You can still explore the ready sections."
          : `Preparing ${waitingFor}… You can keep exploring.`}
      </span>
      {failedStage ? (
        <button type="button" onClick={() => window.location.reload()}>
          Reload to retry
        </button>
      ) : null}
    </div>
  );
}
