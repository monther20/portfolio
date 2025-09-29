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

    const centerX = 90;
    const centerY = 90;
    const radius = 85;

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
    <div className="flex flex-col items-center mb-8">
      <div className="w-40 relative">
        <svg
          ref={svgRef}
          width="190"
          height="190"
          className="absolute -top-1 -left-2 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <div
          className="relative w-36 h-36 overflow-hidden"
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