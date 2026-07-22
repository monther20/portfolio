"use client";

import CorridorShell from "./corridor/CorridorShell";
import CorridorWindow from "./corridor/CorridorWindow";
import CorridorGreeter from "./corridor/CorridorGreeter";
import CorridorStations from "./corridor/CorridorStations";

/**
 * CorridorScene — the walkable hallway behind the front door: the avatar
 * welcome, info stations about me, and the window + table at the far end
 * where the paper airplane takes off.
 */
export default function CorridorScene() {
  return (
    <group name="Corridor Scene">
      <CorridorShell />
      <CorridorGreeter />
      <CorridorStations />
      <CorridorWindow />
    </group>
  );
}
