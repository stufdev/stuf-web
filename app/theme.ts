export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'stuf-theme-mode';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isResolvedTheme(value: string | null | undefined): value is ResolvedTheme {
  return value === 'light' || value === 'dark';
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(themeMode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return themeMode === 'system' ? systemTheme : themeMode;
}

export function applyTheme(theme: ResolvedTheme, themeMode: ThemeMode) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.dataset.themeMode = themeMode;
  root.style.colorScheme = theme;
  document.body.style.colorScheme = theme;

  // Shadcn uses `.dark` class — keep in sync
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const THEME_INIT_SCRIPT = `
(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const mediaQuery = '${THEME_MEDIA_QUERY}';
  const root = document.documentElement;
  const stored = window.localStorage.getItem(storageKey);
  const themeMode =
    stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  const systemTheme = window.matchMedia(mediaQuery).matches ? 'dark' : 'light';
  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = themeMode;
  root.style.colorScheme = resolvedTheme;

  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (document.body) {
    document.body.style.colorScheme = resolvedTheme;
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        document.body.style.colorScheme = resolvedTheme;
      },
      { once: true },
    );
  }
})();
`;

