"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type SketchPoint = [number, number];

type SketchPreloaderProps = {
  lineProgress?: number;
  isSketching?: boolean;
  auto?: boolean;
  percentageText?: string;
};

function createSketchPoints(): SketchPoint[] {
  const points: SketchPoint[] = [[50, 0]];
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

/** Shared sketch-style loading surface used by both the route loading UI and the scene loader. */
export default function SketchPreloader({
  lineProgress = 0,
  isSketching = false,
  auto = false,
  percentageText = `${Math.round(lineProgress)}%`,
}: SketchPreloaderProps) {
  const [sketchPoints, setSketchPoints] = useState<SketchPoint[]>([[50, 0], [50, 100]]);

  useEffect(() => {
    setSketchPoints(createSketchPoints());
  }, []);

  const svgPathData = useMemo(
    () => sketchPoints.map((point, i) => `${i === 0 ? "M" : "L"} ${point[0]} ${point[1]}`).join(" "),
    [sketchPoints],
  );

  const leftClipPoly = useMemo(() => {
    const middle = sketchPoints.map((point) => `${point[0]}% ${point[1]}%`).join(", ");
    return `polygon(0% 0%, ${middle}, 0% 100%)`;
  }, [sketchPoints]);

  const rightClipPoly = useMemo(() => {
    const middle = [...sketchPoints]
      .reverse()
      .map((point) => `${point[0]}% ${point[1]}%`)
      .join(", ");
    return `polygon(100% 0%, 100% 100%, ${middle})`;
  }, [sketchPoints]);

  const className = [
    "sketch-preloader",
    isSketching ? "is-sketching" : "",
    auto ? "sketch-preloader--auto" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={className}
      style={{ "--line-progress": lineProgress } as CSSProperties & Record<"--line-progress", number>}
    >
      <div className="sketch-preloader__half sketch-preloader__half--left" style={{ clipPath: leftClipPoly }}>
        <div className="sketch-preloader__content">
          <span>{percentageText}</span>
          <span className="sketch-preloader__ring" aria-hidden="true" />
        </div>
        <svg className="sketch-preloader__overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d={svgPathData} />
        </svg>
      </div>

      <div className="sketch-preloader__half sketch-preloader__half--right" style={{ clipPath: rightClipPoly }}>
        <div className="sketch-preloader__content">
          <span>{percentageText}</span>
          <span className="sketch-preloader__ring" aria-hidden="true" />
        </div>
        <svg className="sketch-preloader__overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d={svgPathData} />
        </svg>
      </div>
    </div>
  );
}
