'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { createRoughSVG, drawRoughLine, getHandDrawnStyle } from '@/utils/roughUtils';
import { aboutData } from '@/data/personal';

export const AboutSection: React.FC = () => {
  const { theme, colors } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [showLine, setShowLine] = useState(false);

  useEffect(() => {
    // Trigger the line animation after a short delay
    const timer = setTimeout(() => {
      setShowLine(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showLine) return;

    const svg = svgRef.current;
    const textElement = textRef.current;
    if (!svg || !textElement) return;

    // Clear previous content
    svg.innerHTML = '';

    // Get text dimensions
    const textRect = textElement.getBoundingClientRect();
    const textWidth = textElement.offsetWidth;

    // Set SVG dimensions
    svg.setAttribute('width', textWidth.toString());
    svg.setAttribute('height', '10');
    svg.setAttribute('viewBox', `0 0 ${textWidth} 10`);

    // Create rough instance
    const rc = createRoughSVG(svg);
    const style = getHandDrawnStyle(theme === 'dark');

    // Draw the line with animation
    const lineNode = drawRoughLine(rc, 0, 0, textWidth, 1, {
      ...style,
      strokeWidth: 1.5,
      roughness: 1,
    });

    if (lineNode) {
      // Add animation to the line
      const path = lineNode.querySelector('path');
      if (path) {
        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = pathLength.toString();
        path.style.strokeDashoffset = pathLength.toString();
        path.style.animation = 'drawLine 1s ease-out forwards';

        // Add CSS animation keyframes
        if (!document.querySelector('#drawLineAnimation')) {
          const style = document.createElement('style');
          style.id = 'drawLineAnimation';
          style.textContent = `
            @keyframes drawLine {
              to {
                stroke-dashoffset: 0;
              }
            }
          `;
          document.head.appendChild(style);
        }
      }

      svg.appendChild(lineNode as Node);
    }
  }, [showLine, theme]);

  return (
    <div className="mb-4">
      <p
        className="text-lg leading-relaxed"
        style={{
          color: colors.textSecondary,
          lineHeight: '1.6'
        }}
      >
        I'm {aboutData.name}, a <span className="relative inline-block">
          <span ref={textRef}>{aboutData.title}</span>
          <svg
            ref={svgRef}
            className="absolute left-0 top-full pointer-events-none"
            style={{ zIndex: 1 }}
          />
        </span> {aboutData.description.replace(`I'm ${aboutData.name}, a ${aboutData.title} `, '')}
      </p>
    </div>
  );
};