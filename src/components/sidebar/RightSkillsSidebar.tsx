'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { RoughButton } from '@/components/ui/RoughButton';

const skillsData = {
  languages: ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
  frontend: ['React', 'React-Native', 'NextJS', 'React Query', 'Tailwind', 'Framer Motion', 'GSAP', 'RoughJS'],
  cloudDevOps: ['Firebase', 'AWS', 'Git', 'GitHub'],
  devTools: ['Figma', 'SVG', 'PhyJS'],
  currentlyLearning: ['Docker', 'Kubernetes', 'GraphQL']
};

interface SkillCategoryProps {
  title: string;
  skills: string[];
  colors: any;
}

const SkillCategory: React.FC<SkillCategoryProps> = ({ title, skills, colors }) => (
  <div className="mb-6">
    <h3
      className="text-lg mb-3 font-bold"
      style={{
        color: colors.text,
      }}
    >
      {title}
    </h3>
    <div className="grid gap-1" style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
      justifyItems: 'center'
    }}>
      {skills.map((skill, index) => (
        <RoughButton key={index}>
          <span
            style={{
              fontSize: '11px'
            }}
          >
            {skill}
          </span>
        </RoughButton>
      ))}
    </div>
  </div>
);

export const RightSkillsSidebar: React.FC = () => {
  const { colors } = useTheme();

  return (
    <aside className="sticky top-0 h-screen overflow-y-auto p-6">
      <div className="h-full">
        <h2
          className="text-2xl mb-6 font-bold"
          style={{
            color: colors.text,
          }}
        >
          Skills & Technologies
        </h2>
        
        <SkillCategory 
          title="Languages" 
          skills={skillsData.languages} 
          colors={colors} 
        />
        
        <SkillCategory 
          title="Frontend" 
          skills={skillsData.frontend} 
          colors={colors} 
        />
        
        <SkillCategory 
          title="Cloud & DevOps" 
          skills={skillsData.cloudDevOps} 
          colors={colors} 
        />
        
        <SkillCategory 
          title="Development Tools" 
          skills={skillsData.devTools} 
          colors={colors} 
        />
        
        <SkillCategory 
          title="Currently Learning" 
          skills={skillsData.currentlyLearning} 
          colors={colors} 
        />
      </div>
    </aside>
  );
};