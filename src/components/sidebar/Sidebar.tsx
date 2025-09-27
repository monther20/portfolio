'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileSection } from './ProfileSection';
import { AboutSection } from './AboutSection';
import { SkillsSection } from './SkillsSection';

export const Sidebar: React.FC = () => {
  const { colors } = useTheme();

  return (
    <aside
      className="sticky top-0 h-screen w-1/3 max-w-[500px] overflow-y-auto p-6"
      style={{
        zIndex: 10
      }}
    >
      <div className="h-full flex justify-center flex-col border-r border-gray-200 pr-4 relative">
        <div className="absolute top-1 left-4 ">
          <div className="flex flex-col space-y-1 text-lg" style={{ color: colors.textSecondary, fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif" }}>
            <div>monther.aloufi20@gmail.com</div>
            <div>+962 780672010</div>
            <div>Amman, Jordan</div>
          </div>
        </div>
        <ProfileSection />
        <AboutSection />
        <SkillsSection />
      </div>
    </aside>
  );
};