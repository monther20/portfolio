'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileSection } from './ProfileSection';
import { AboutSection } from './AboutSection';
import { ContactSection } from './ContactSection';

export const Sidebar: React.FC = () => {
  const { colors } = useTheme();

  return (
    <aside
      className="sticky top-0 h-screen overflow-hidden p-6"
      style={{
        zIndex: 10
      }}
    >
      <div className="h-full flex justify-start flex-col border-r border-gray-200 pr-4">
        <ProfileSection />
        <AboutSection />
        <ContactSection />
      </div>
    </aside>
  );
};