"use client";

import { Component, Suspense, useCallback, type ReactNode } from "react";
import SceneReadySignal from "./SceneReadySignal";
import { canLoadJourneyStage, type JourneyLoadStageId } from "./journeyLoading";
import { useJourneyLoading } from "./JourneyLoadingProvider";

class StageErrorBoundary extends Component<
  {
    onError: () => void;
    children: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Mount real scenes ahead of the visitor, not a second list of cached URLs.
 * A distant suspension/error must never hide the entrance or a ready section.
 */
export default function JourneyAssetStage({
  id,
  children,
}: {
  id: JourneyLoadStageId;
  children: ReactNode;
}) {
  const { completedStages, markReady, markFailed } = useJourneyLoading();
  const onReady = useCallback(() => markReady(id), [id, markReady]);
  const onError = useCallback(() => markFailed(id), [id, markFailed]);
  if (!canLoadJourneyStage(id, completedStages)) return null;

  return (
    <StageErrorBoundary onError={onError}>
      <Suspense fallback={null}>
        {children}
        <SceneReadySignal onReady={onReady} />
      </Suspense>
    </StageErrorBoundary>
  );
}
