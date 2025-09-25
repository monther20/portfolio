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

    svg.innerHTML = '';
    
    const rc = createRoughSVG(svg);
    const style = getHandDrawnStyle(theme === 'dark');
    
    const centerX = 75;
    const centerY = 75;
    const radius = 65;
    
    drawRoughCircle(rc, centerX, centerY, radius * 2, {
      ...style,
      strokeWidth: 3,
      roughness: 2,
    });
  }, [theme]);

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative w-32 h-32 mb-4">
        <svg
          ref={svgRef}
          width="150"
          height="150"
          className="absolute -top-2 -left-2 pointer-events-none"
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