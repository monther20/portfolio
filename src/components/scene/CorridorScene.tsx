"use client";

import { lazy, Suspense } from "react";

import CorridorShell from "./corridor/CorridorShell";

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
      {detailsEnabled ? (
        <Suspense fallback={null}>
          <CorridorDetails />
        </Suspense>
      ) : null}
    </group>
  );
}
