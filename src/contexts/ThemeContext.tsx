import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from '@/theme';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isSystemTheme: boolean;
  useSystemTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [manualThemeMode, setManualThemeMode] = useState<ThemeMode | null>(null);

  const isSystemTheme = manualThemeMode === null;

  const themeMode: ThemeMode = manualThemeMode ?? (systemColorScheme === 'light' ? 'light' : 'dark');
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setManualThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setManualThemeMode((current) => {
      if (current === null) {
        // If using system theme, switch to opposite of current system theme
        return systemColorScheme === 'light' ? 'dark' : 'light';
      }
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [systemColorScheme]);

  const useSystemTheme = useCallback(() => {
    setManualThemeMode(null);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      setThemeMode,
      toggleTheme,
      isSystemTheme,
      useSystemTheme,
    }),
    [theme, themeMode, setThemeMode, toggleTheme, isSystemTheme, useSystemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
