"use client";

import { lazy, useEffect } from "react";

import CorridorScene from "./CorridorScene";
import ScrollCameraManager from "./ScrollCameraManager";
import JourneyAssetStage from "./JourneyAssetStage";
import NightSky from "./dayNight/NightSky";
import { useJourneyLoading } from "./JourneyLoadingProvider";
import { JOURNEY } from "./journeyConfig";

const CorridorStations = lazy(() => import("./corridor/CorridorStations"));
const CorridorCabinet = lazy(() => import("./corridor/CorridorCabinet"));
const CorridorWindow = lazy(() => import("./corridor/CorridorWindow"));
const PaperAirplaneActor = lazy(() => import("./PaperAirplaneActor"));
const FlightClouds = lazy(() => import("./FlightClouds"));
const JourneySection = lazy(() => import("./sections/JourneySection"));
const SkillsSection = lazy(() => import("./sections/SkillsSection"));
const ProjectsSection = lazy(() => import("./sections/ProjectsSection"));
const BeachContactSection = lazy(
  () => import("./sections/BeachContactSection"),
);

export default function JourneyScene({
  scrollEnabled,
  backgroundEnabled,
}: {
  scrollEnabled: boolean;
  backgroundEnabled: boolean;
}) {
  const { requestStagesThrough } = useJourneyLoading();

  useEffect(() => {
    // The entrance is the only cold-load work. Start the first distant section
    // after the visitor opens the door; the camera manager preloads later
    // sections as the visitor approaches them.
    if (backgroundEnabled) requestStagesThrough(1);
  }, [backgroundEnabled, requestStagesThrough]);

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
