"use client";

import SketchPreloader from "../components/SketchPreloader";

/** loading.tsx — Next.js route-level loading UI. */
export default function Loading() {
  return <SketchPreloader auto lineProgress={100} percentageText="100%" />;
}
