'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { contactData } from '@/data/personal';

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
          {contactData.email}
        </div>
        <div
          className="text-lg"
          style={{
            color: colors.textSecondary,
          }}
        >
          {contactData.phone}
        </div>
      </div>
    </div>
  );
};