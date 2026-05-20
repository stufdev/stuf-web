'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  getSystemTheme,
  isThemeMode,
  resolveTheme,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from './theme';

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (value: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readThemeModeFromDocument(): ThemeMode | null {
  if (typeof document === 'undefined') return null;

  const documentMode = document.documentElement.dataset.themeMode;
  return isThemeMode(documentMode) ? documentMode : null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';

    return (
      readThemeModeFromDocument() ??
      (() => {
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        return isThemeMode(storedTheme) ? storedTheme : 'system';
      })()
    );
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    return getSystemTheme();
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);

    const syncSystemTheme = (event?: MediaQueryListEvent) => {
      setSystemTheme(event ? (event.matches ? 'dark' : 'light') : mediaQuery.matches ? 'dark' : 'light');
    };

    syncSystemTheme();
    mediaQuery.addEventListener('change', syncSystemTheme);

    return () => {
      mediaQuery.removeEventListener('change', syncSystemTheme);
    };
  }, []);

  const resolvedTheme = resolveTheme(themeMode, systemTheme);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyTheme(resolvedTheme, themeMode);
  }, [resolvedTheme, themeMode]);

  const value = useMemo(
    () => ({
      resolvedTheme,
      setThemeMode,
      themeMode,
    }),
    [resolvedTheme, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return value;
}
