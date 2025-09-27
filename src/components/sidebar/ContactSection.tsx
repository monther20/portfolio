'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export const ContactSection: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div>
      <h2
        className="text-2xl mb-4 font-bold"
        style={{
          color: colors.text,
          fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
        }}
      >
        Contact
      </h2>
      <div className="flex justify-between">

        <div
          className="text-lg"
          style={{
            color: colors.textSecondary,
            fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
          }}
        >
          monther.aloufi20@gmail.com
        </div>
        <div
          className="text-lg"
          style={{
            color: colors.textSecondary,
            fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
          }}
        >
          +962 780672010
        </div>

        <div
          className="text-lg"
          style={{
            color: colors.textSecondary,
            fontFamily: "'Shadows Into Light', 'Comic Sans MS', cursive, sans-serif"
          }}
        >
          Amman, Jordan
        </div>
      </div>
    </div>
  );
};