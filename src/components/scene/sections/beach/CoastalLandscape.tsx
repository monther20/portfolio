"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useResponsiveExperience } from "../../../ResponsiveExperience";
import { useDayNightTransition } from "../../dayNight/DayNightProvider";
import { coastVisibility, createCoastalLandscape } from "./coastalLandscapeModel";

/** Static, distant land: no camera-following, extra lights, textures or animations. */
export default function CoastalLandscape() {
  const coast = useMemo(createCoastalLandscape, []);
  const { cameraFov, aspect } = useResponsiveExperience();
  useLayoutEffect(() => {
    coast.layout(cameraFov, aspect);
  }, [coast, cameraFov, aspect]);
  useDayNightTransition(useCallback((amount) => coast.applyNight(amount), [coast]));
  useEffect(() => () => coast.dispose(), [coast]);
  useFrame(({ camera }) => coast.setVisibility(coastVisibility(camera.position.z)));
  return <primitive object={coast.group} dispose={null} />;
}
