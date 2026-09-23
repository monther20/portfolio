"use client";

import { lazy, useEffect } from "react";
import { useGLTF } from "@react-three/drei";

import CorridorScene from "./CorridorScene";
import ScrollCameraManager from "./ScrollCameraManager";
import JourneyAssetStage from "./JourneyAssetStage";
import NightSky from "./dayNight/NightSky";
import { useJourneyLoading } from "./JourneyLoadingProvider";
import { JOURNEY } from "./journeyConfig";
import { JOURNEY_LOAD_STAGES } from "./journeyLoading";
import {
  CABINET_MODEL_URL,
  PAPER_AIRPLANE_MODEL_URL,
} from "./assetPaths";
import { prefetchProgressiveStage } from "./progressiveTextureLoading";

const loadCorridorStations = () => import("./corridor/CorridorStations");
const loadCorridorCabinet = () => import("./corridor/CorridorCabinet");
const loadCorridorWindow = () => import("./corridor/CorridorWindow");
const loadPaperAirplaneActor = () => import("./PaperAirplaneActor");
const loadFlightClouds = () => import("./FlightClouds");
const loadJourneySection = () => import("./sections/JourneySection");
const loadSkillsSection = () => import("./sections/SkillsSection");
const loadProjectsSection = () => import("./sections/ProjectsSection");
const loadBeachContactSection = () =>
  import("./sections/BeachContactSection");

const CorridorStations = lazy(loadCorridorStations);
const CorridorCabinet = lazy(loadCorridorCabinet);
const CorridorWindow = lazy(loadCorridorWindow);
const PaperAirplaneActor = lazy(loadPaperAirplaneActor);
const FlightClouds = lazy(loadFlightClouds);
const JourneySection = lazy(loadJourneySection);
const SkillsSection = lazy(loadSkillsSection);
const ProjectsSection = lazy(loadProjectsSection);
const BeachContactSection = lazy(loadBeachContactSection);

const JOURNEY_STAGE_MODULE_LOADERS = [
  () => loadCorridorStations(),
  () =>
    Promise.all([
      loadCorridorCabinet(),
      loadCorridorWindow(),
      loadPaperAirplaneActor(),
    ]),
  () => loadFlightClouds(),
  () => loadJourneySection(),
  () => loadSkillsSection(),
  () => loadProjectsSection(),
  () => loadBeachContactSection(),
] as const;

export default function JourneyScene({
  scrollEnabled,
  backgroundEnabled,
}: {
  scrollEnabled: boolean;
  backgroundEnabled: boolean;
}) {
  const { requestedStages, requestStagesThrough } = useJourneyLoading();

  useEffect(() => {
    // The entrance is the only cold-load work. Start the first distant section
    // after the visitor opens the door; the camera manager preloads later
    // sections as the visitor approaches them.
    if (backgroundEnabled) requestStagesThrough(1);
  }, [backgroundEnabled, requestStagesThrough]);

  useEffect(() => {
    if (!backgroundEnabled) return;

    // Discover every requested code chunk at once instead of waiting for each
    // preceding Suspense boundary. Originals still use a two-request queue.
    for (let index = 0; index < requestedStages; index += 1) {
      const stage = JOURNEY_LOAD_STAGES[index];
      prefetchProgressiveStage(stage.id);
      void JOURNEY_STAGE_MODULE_LOADERS[index]();
    }

    // Drei's own cache is also used by the mounted model components, so this
    // parse/download cannot create a second GLTF result.
    if (requestedStages >= 2) {
      useGLTF.preload(CABINET_MODEL_URL);
      useGLTF.preload(PAPER_AIRPLANE_MODEL_URL);
    }
  }, [backgroundEnabled, requestedStages]);

  return (
    <group name="Journey Scene">
      <ScrollCameraManager enabled={scrollEnabled} />

      {/* The lightweight shell is entrance-critical; hidden details load on entry. */}
      <CorridorScene detailsEnabled={backgroundEnabled} />
      <NightSky />

      {backgroundEnabled ? (
        <>
          <JourneyAssetStage id="corridor-far">
            <CorridorStations part="far" />
          </JourneyAssetStage>
          <JourneyAssetStage id="window">
            <CorridorCabinet />
            <CorridorWindow />
            <PaperAirplaneActor />
          </JourneyAssetStage>
          <JourneyAssetStage id="flight">
            <FlightClouds />
          </JourneyAssetStage>
          <JourneyAssetStage id="journey">
            <JourneySection zStart={JOURNEY.journeyAnchorZ} />
          </JourneyAssetStage>
          <JourneyAssetStage id="skills">
            <SkillsSection zStart={JOURNEY.skillsAnchorZ} />
          </JourneyAssetStage>
          <JourneyAssetStage id="projects">
            <ProjectsSection zStart={JOURNEY.projectsAnchorZ} />
          </JourneyAssetStage>
          <JourneyAssetStage id="contact">
            <BeachContactSection />
          </JourneyAssetStage>
        </>
      ) : null}
    </group>
  );
}
