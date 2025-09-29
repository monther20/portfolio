'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export const ContactSection: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div>
      <h2
        className="text-2xl font-bold mb-2"
        style={{
          color: colors.text,
        }}
      >
        Contact
      </h2>
      <div className="flex justify-between">
        <div
          className="text-lg"
          style={{
            color: colors.textSecondary,
          }}
        >
          monther.aloufi20@gmail.com
        </div>
        <div
          className="text-lg"
          style={{
            color: colors.textSecondary,
          }}
        >
          +962 780672010
        </div>
      </div>
    </div>
  );
};