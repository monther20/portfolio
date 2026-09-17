"use client";

import CorridorShell from "./corridor/CorridorShell";
import CorridorGreeter from "./corridor/CorridorGreeter";
import CorridorStations from "./corridor/CorridorStations";
import CorridorLights from "./corridor/CorridorLights";

/** Critical entrance: mount behind the closed door during the initial load.
 * Far corridor props and the window have independent background boundaries.
 */
export default function CorridorScene() {
  return (
    <group name="Corridor Scene">
      <CorridorShell />
      <CorridorLights />
      <CorridorGreeter />
      <CorridorStations part="near" />
    </group>
  );
}
