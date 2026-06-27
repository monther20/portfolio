"use client";

import { useEffect, useMemo, useState } from "react";

function createSketchPoints() {
  const points: number[][] = [[50, 0]];
  const segments = 20;

  for (let i = 1; i < segments; i++) {
    const y = (i / segments) * 100;
    const scribble = Math.sin(i * 12) * 2;
    const jitter = (Math.random() - 0.5) * 3;
    points.push([50 + scribble + jitter, y]);
  }

  points.push([50, 100]);
  return points;
}

/**
 * loading.tsx — Next.js route-level loading UI.
 * Auto version of the sketch preloader.
 */
export default function Loading() {
  const [sketchPoints, setSketchPoints] = useState<number[][]>([[50, 0], [50, 100]]);

  useEffect(() => {
    setSketchPoints(createSketchPoints());
  }, []);

  const svgPathData = useMemo(
    () => sketchPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" "),
    [sketchPoints]
  );

  const leftClipPoly = useMemo(() => {
    const middle = sketchPoints.map((p) => `${p[0]}% ${p[1]}%`).join(", ");
    return `polygon(0% 0%, ${middle}, 0% 100%)`;
  }, [sketchPoints]);

  const rightClipPoly = useMemo(() => {
    const middle = [...sketchPoints]
      .reverse()
      .map((p) => `${p[0]}% ${p[1]}%`)
      .join(", ");
    return `polygon(100% 0%, 100% 100%, ${middle})`;
  }, [sketchPoints]);

  return (
    <div className="sketch-preloader sketch-preloader--auto">
      <div
        className="sketch-preloader__half sketch-preloader__half--left"
        style={{ clipPath: leftClipPoly }}
      >
        <div className="sketch-preloader__content">
          <span>100%</span>
          <span className="sketch-preloader__ring" aria-hidden="true" />
        </div>
        <svg className="sketch-preloader__overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d={svgPathData} />
        </svg>
      </div>

      <div
        className="sketch-preloader__half sketch-preloader__half--right"
        style={{ clipPath: rightClipPoly }}
      >
        <div className="sketch-preloader__content">
          <span>100%</span>
          <span className="sketch-preloader__ring" aria-hidden="true" />
        </div>
        <svg className="sketch-preloader__overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d={svgPathData} />
        </svg>
      </div>
    </div>
  );
}
