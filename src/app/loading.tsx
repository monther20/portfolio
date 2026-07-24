"use client";

import SketchPreloader from "../components/SketchPreloader";

/** Next.js route fallback stays covered until the client scene loader replaces it. */
export default function Loading() {
  return <SketchPreloader lineProgress={0} percentageText="0%" />;
}
