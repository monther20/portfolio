'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { createRoughSVG, drawRoughLine, getHandDrawnStyle } from '@/utils/roughUtils';

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
    <div className="mb-8">
      <h2
        className="text-2xl mb-4 font-bold"
        style={{
          color: colors.text,
          fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
        }}
      >
        About Me
      </h2>
      <p
        className="text-lg leading-relaxed"
        style={{
          color: colors.textSecondary,
          fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif",
          lineHeight: '1.6'
        }}
      >
        I'm Monther Aloufi, a <span className="relative inline-block">
          <span ref={textRef}>frontend developer</span>
          <svg
            ref={svgRef}
            className="absolute left-0 top-full pointer-events-none"
            style={{ zIndex: 1 }}
          />
        </span> passionate about creating seamless web and mobile experiences with React and React Native. Currently in my 4th year of studies, I've progressed from freelancing to working as a graduate trainee at Alphaworks, where I tackle real-world challenges and deliver client solutions. I'm expanding my skill set into backend development and UI/UX design, working toward becoming a versatile full-stack developer who can bring ideas to life from concept to deployment
      </p>
    </div>
  );
};