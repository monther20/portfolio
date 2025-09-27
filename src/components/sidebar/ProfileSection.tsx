'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from '@/theme/ThemeProvider';
import { createRoughSVG, drawRoughCircle, getHandDrawnStyle } from '@/utils/roughUtils';

export const ProfileSection: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous content first
    svg.innerHTML = '';

    // Create rough instance AFTER clearing
    const rc = createRoughSVG(svg);
    const style = getHandDrawnStyle(theme === 'dark');

    const centerX = 70;
    const centerY = 70;
    const radius = 65;

    // drawRoughCircle returns a DOM node that must be appended
    const circleNode = drawRoughCircle(rc, centerX, centerY, radius * 2, {
      ...style,
      strokeWidth: 1,
      roughness: 1,
    });

    // Manually append the returned node to the SVG
    if (circleNode) {
      svg.appendChild(circleNode as Node);
    }
  }, [theme]);

  return (
    <div className="flex flex-col items-center mb-4 mt-20">
      <div className="w-32 relative">
        <svg
          ref={svgRef}
          width="150"
          height="150"
          className="absolute -top-3 -left-2 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <div
          className="relative w-28 h-28 rounded-full overflow-hidden"
          style={{
            zIndex: 2,
            top: '8px',
            left: '8px'
          }}
        >
          <Image
            src="/profile.png"
            alt="Profile"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
};