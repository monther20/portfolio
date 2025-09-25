export const colors = {
  light: {
    background: '#faf9f6',
    sidebarBg: '#ffffff',
    cardBg: '#ffffff',
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#3498db',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    border: '#2c3e50',
    skillBg: '#ecf0f1',
    skillBorder: '#34495e',
  },
  dark: {
    background: '#1a1a1a',
    sidebarBg: '#2d2d2d',
    cardBg: '#3d3d3d',
    primary: '#ecf0f1',
    secondary: '#bdc3c7',
    accent: '#5dade2',
    text: '#ecf0f1',
    textSecondary: '#95a5a6',
    border: '#ecf0f1',
    skillBg: '#34495e',
    skillBorder: '#ecf0f1',
  }
} as const;

export type ThemeType = 'light' | 'dark';
export type ColorScheme = typeof colors.light | typeof colors.dark;