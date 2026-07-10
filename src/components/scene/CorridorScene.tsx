"use client";

import React, { useRef } from "react";
import * as THREE from "three";

import CorridorShell from "./corridor/CorridorShell";
import CorridorWindow from "./corridor/CorridorWindow";
import CorridorGreeter from "./corridor/CorridorGreeter";
import CorridorStations from "./corridor/CorridorStations";
import { useCorridorDebugGui } from "./CorridorDebugGui";

/**
 * CorridorScene — the walkable hallway behind the front door: the avatar
 * welcome, info stations about me, and the window + table at the far end
 * where the paper airplane takes off.
 */
export default function CorridorScene() {
  const rootRef = useRef<THREE.Group>(null);
  useCorridorDebugGui(rootRef);

  return (
    <group ref={rootRef} name="Corridor Scene">
      <CorridorShell />
      <CorridorGreeter />
      <CorridorStations />
      <CorridorWindow />
    </group>
  );
}
