import { useEffect, useLayoutEffect } from 'react';
import { SYSTEM_LIGHT_QUERY, applyTheme } from '@/lib/theme';
import { useUiStore } from '@/store/uiStore';

/**
 * Applies `uiStore.theme` to <html> (class, color-scheme, theme-color) and follows OS
 * `prefers-color-scheme` changes until the user explicitly picks a theme.
 */
export function ThemeSync() {
  const theme = useUiStore((state) => state.theme);
  const syncSystemTheme = useUiStore((state) => state.syncSystemTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(SYSTEM_LIGHT_QUERY);
    const onChange = (event: MediaQueryListEvent): void =>
      syncSystemTheme(event.matches ? 'light' : 'dark');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [syncSystemTheme]);

  return null;
}
