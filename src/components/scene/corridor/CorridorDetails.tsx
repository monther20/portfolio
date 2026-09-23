"use client";

import CorridorGreeter from "./CorridorGreeter";
import CorridorStations from "./CorridorStations";

/** Corridor content that is hidden by the closed entrance door. */
export default function CorridorDetails() {
  return (
    <group name="Corridor Deferred Details">
      <CorridorGreeter />
      <CorridorStations part="near" />
    </group>
  );
}
