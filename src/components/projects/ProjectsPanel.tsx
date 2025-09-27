'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectsSection } from './ProjectsSection';

export const ProjectsPanel: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div className="p-6">
      <ProjectsSection />
    </div>
  );
};