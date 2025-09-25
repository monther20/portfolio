'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { colors, ThemeType, ColorScheme } from './colors';

interface ThemeContextType {
  theme: ThemeType;
  colors: ColorScheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [mounted, setMounted] = useState(false);

  // Mark component as mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load theme from localStorage only after mounting
  useEffect(() => {
    if (!mounted) return;
    
    const savedTheme = localStorage.getItem('portfolio-theme') as ThemeType;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    }
  }, [mounted]);

  // Update CSS variables and localStorage only after mounting
  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('portfolio-theme', theme);
    const root = document.documentElement;
    const currentColors = colors[theme];
    
    Object.entries(currentColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    colors: colors[theme],
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};