"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/** Place inside the same Suspense boundary as the content being prepared. */
export default function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const renderedFrames = useRef(0);
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    renderedFrames.current += 1;
    if (renderedFrames.current >= 2) {
      reported.current = true;
      onReady();
    }
  });

  return null;
}
