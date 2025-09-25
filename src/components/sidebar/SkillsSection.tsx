'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { RoughButton } from '@/components/ui/RoughButton';

const skills = [
  'React', 'React-Native', 'NextJS',
  'React Query', 'Tailwind', 'NodeJS',
  'Framer Motion', 'GSAP', 'RoughJS',
  'PhyJS'
];

export const SkillsSection: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div className="mb-8">
      <h2
        className="text-2xl mb-4 font-bold"
        style={{
          color: colors.text,
          fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
        }}
      >
        skills
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {skills.map((skill, index) => (
          <RoughButton
            key={index}
          >
            <span
              style={{
                fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif",
                fontSize: '12px'
              }}
            >
              {skill}
            </span>
          </RoughButton>
        ))}
      </div>
    </div>
  );
};