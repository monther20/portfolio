'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileSection } from './ProfileSection';
import { AboutSection } from './AboutSection';
import { SkillsSection } from './SkillsSection';
import { ContactSection } from './ContactSection';

export const Sidebar: React.FC = () => {
  const { colors } = useTheme();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-1/3 overflow-y-auto p-6"
      style={{
        zIndex: 10
      }}
    >
      <div className="h-full flex flex-col border-r border-gray-200 pr-4">
        <ProfileSection />
        <AboutSection />
        <SkillsSection />
        <ContactSection />
      </div>
    </aside>
  );
};