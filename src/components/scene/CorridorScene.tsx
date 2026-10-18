"use client";

import { lazy, Suspense } from "react";

import CorridorShell from "./corridor/CorridorShell";
import CorridorLights from "./corridor/CorridorLights";

const CorridorDetails = lazy(() => import("./corridor/CorridorDetails"));

/** Keep the lightweight corridor shell behind the closed entrance. Content
 * hidden by the door loads only after the visitor chooses to enter.
 */
export default function CorridorScene({
  detailsEnabled,
}: {
  detailsEnabled: boolean;
}) {
  return (
    <group name="Corridor Scene">
      <CorridorShell />
      {/* Keep the point-light count stable before entry. Adding these lights at
       * door-open time forces every standard room material to recompile. */}
      <CorridorLights />
      {detailsEnabled ? (
        <Suspense fallback={null}>
          <CorridorDetails />
        </Suspense>
      ) : null}
    </group>
  );
}
