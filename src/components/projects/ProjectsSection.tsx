'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectCard } from './ProjectCard';
import { projects } from '@/data/projects';

export const ProjectsSection: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div>
      <h2
        className="text-2xl mb-4 font-bold"
        style={{
          color: colors.text,
        }}
      >
        My Projects
      </h2>

      <div className="space-y-1">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};