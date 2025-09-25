'use client';

import React, { useEffect, useRef, ReactNode } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { createRoughSVG, drawRoughRectangle, getHandDrawnStyle, getSkillBorderStyle } from '@/utils/roughUtils';

interface RoughCardProps {
  children: ReactNode;
  className?: string;
  padding?: number;
  styleType?: 'card' | 'skill';
}

export const RoughCard: React.FC<RoughCardProps> = ({
  children,
  className = '',
  padding = 20,
  styleType = 'card'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;

    if (!svg || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();

      svg.setAttribute('width', width.toString());
      svg.setAttribute('height', height.toString());

      svg.innerHTML = '';

      const rc = createRoughSVG(svg);

      if (styleType === 'skill') {
        const style = getSkillBorderStyle(theme === 'dark');
        drawRoughRectangle(rc, 2, 2, width - 4, height - 4, style);
      } else {
        const style = getHandDrawnStyle(theme === 'dark');
        drawRoughRectangle(rc, 2, 2, width - 4, height - 4, {
          ...style,
          fill: theme === 'dark' ? '#2d2d2d' : '#ffffff',
          fillStyle: 'solid',
        });
      }
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [theme, styleType]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ padding: `${padding}px` }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <div className="relative" style={{ zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
};