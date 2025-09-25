'use client';

import React, { useEffect, useRef, ReactNode, useCallback } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { createRoughSVG, drawRoughRectangle, getSkillBadgeStyle } from '@/utils/roughUtils';

interface RoughButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const RoughButton: React.FC<RoughButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();

  const drawRectangle = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;

    if (!svg || !container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    if (width <= 0 || height <= 0) return;

    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    try {
      // Clear content first
      svg.innerHTML = '';

      // Create rough instance AFTER clearing
      const rc = createRoughSVG(svg);
      const style = {
        ...getSkillBadgeStyle(theme === 'dark'),
        strokeWidth: 1 // Override to make it thinner
      };

      const padding = 2;
      const rectWidth = width - (padding * 2);
      const rectHeight = height - (padding * 2);

      const rectangleNode = drawRoughRectangle(
        rc,
        padding,
        padding,
        rectWidth,
        rectHeight,
        style
      );

      // For SVG, we must manually append the returned node
      if (rectangleNode) {
        svg.appendChild(rectangleNode as Node);
      }
    } catch (error) {
      console.error('Error drawing rough rectangle:', error);
    }
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      drawRectangle();
    }, 10);

    return () => clearTimeout(timer);
  }, [drawRectangle, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTimeout(() => {
          drawRectangle();
        }, 10);
      }
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [drawRectangle]);

  return (
    <button
      ref={containerRef}
      className={`relative px-4 py-2 text-sm font-medium transition-opacity duration-200 ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        color: theme === 'dark' ? '#ecf0f1' : '#2c3e50',
        background: 'transparent',
        border: 'none',
        minHeight: '40px',
      }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <span
        className="relative flex items-center justify-center w-full h-full"
        style={{ zIndex: 1 }}
      >
        {children}
      </span>
    </button>
  );
};