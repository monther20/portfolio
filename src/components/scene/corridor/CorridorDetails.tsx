"use client";

import CorridorGreeter from "./CorridorGreeter";
import CorridorLights from "./CorridorLights";
import CorridorStations from "./CorridorStations";

/** Corridor content that is hidden by the closed entrance door. */
export default function CorridorDetails() {
  return (
    <group name="Corridor Deferred Details">
      <CorridorLights />
      <CorridorGreeter />
      <CorridorStations part="near" />
    </group>
  );
}
