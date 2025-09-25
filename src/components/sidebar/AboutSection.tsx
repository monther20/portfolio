'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export const AboutSection: React.FC = () => {
  const { theme, colors } = useTheme();

  return (
    <div className="mb-8">
      <h2 
        className="text-2xl mb-4 font-bold"
        style={{ 
          color: colors.text,
          fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
        }}
      >
        about me
      </h2>
      <p 
        className="text-sm leading-relaxed"
        style={{ 
          color: colors.textSecondary,
          fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif",
          lineHeight: '1.6'
        }}
      >
        I'm a computer science student with a strong passion for 
        frontend development and game design. I've gained practical 
        experience creating web and mobile interfaces. Previously, 
        I worked as a frontend freelancer at Alphaworks, and I'm 
        currently a graduate trainee there, where I'm continuing 
        to sharpen my skills and build real-world experience
      </p>
    </div>
  );
};