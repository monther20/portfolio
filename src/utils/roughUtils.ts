import rough from 'roughjs';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { RoughSVG } from 'roughjs/bin/svg';

export interface RoughOptions {
  roughness?: number;
  bowing?: number;
  stroke?: string;
  fill?: string;
  fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'sunburst' | 'dashed';
  strokeWidth?: number;
  hachureAngle?: number;
  hachureGap?: number;
}

export const defaultRoughOptions: RoughOptions = {
  roughness: 1,
  bowing: 1,
  strokeWidth: 2,
  fillStyle: 'hachure',
  hachureGap: 4,
};

export const createRoughCanvas = (canvas: HTMLCanvasElement): RoughCanvas => {
  return rough.canvas(canvas);
};

export const createRoughSVG = (svg: SVGSVGElement): RoughSVG => {
  return rough.svg(svg);
};

export const drawRoughRectangle = (
  rc: RoughCanvas | RoughSVG,
  x: number,
  y: number,
  width: number,
  height: number,
  options: RoughOptions = {}
) => {
  const opts = { ...defaultRoughOptions, ...options };
  const element = rc.rectangle(x, y, width, height, opts);

  // For SVG, the element should be automatically added to the parent
  // But let's make sure we return it properly
  return element;
};

export const drawRoughCircle = (
  rc: RoughCanvas | RoughSVG,
  x: number,
  y: number,
  diameter: number,
  options: RoughOptions = {}
) => {
  const opts = { ...defaultRoughOptions, ...options };
  return rc.circle(x, y, diameter, opts);
};

export const drawRoughEllipse = (
  rc: RoughCanvas | RoughSVG,
  x: number,
  y: number,
  width: number,
  height: number,
  options: RoughOptions = {}
) => {
  const opts = { ...defaultRoughOptions, ...options };
  return rc.ellipse(x, y, width, height, opts);
};

export const drawRoughLine = (
  rc: RoughCanvas | RoughSVG,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: RoughOptions = {}
) => {
  const opts = { ...defaultRoughOptions, ...options };
  return rc.line(x1, y1, x2, y2, opts);
};

export const getHandDrawnStyle = (isDark: boolean = false): RoughOptions => ({
  roughness: 1.5,
  bowing: 2,
  strokeWidth: 2,
  stroke: isDark ? '#ecf0f1' : '#2c3e50',
  fillStyle: 'hachure',
  hachureGap: 3,
  hachureAngle: 45,
});

export const getSkillBadgeStyle = (isDark: boolean = false): RoughOptions => ({
  roughness: 1,
  bowing: 1,
  strokeWidth: 2, // Increased stroke width for better visibility
  stroke: isDark ? '#ecf0f1' : '#34495e',
  fill: isDark ? 'rgba(52, 73, 94, 0.1)' : 'rgba(236, 240, 241, 0.1)', // Light fill for better visibility
  fillStyle: 'hachure',
  hachureGap: 8, // Increased gap for lighter fill
  hachureAngle: 45,
});

export const getSkillBorderStyle = (isDark: boolean = false): RoughOptions => ({
  roughness: 1.2,
  bowing: 1.5,
  strokeWidth: 2,
  stroke: isDark ? '#ecf0f1' : '#34495e',
  fill: 'none',
  fillStyle: 'solid',
});