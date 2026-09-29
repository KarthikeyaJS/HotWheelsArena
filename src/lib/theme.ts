/** Theme helpers shared by uiStore, ThemeSync and the ThemeToggle. */
import { THEME_COLORS } from '@/config/brand';
import type { Theme } from '@/types';

export const SYSTEM_LIGHT_QUERY = '(prefers-color-scheme: light)';

/** OS preference; `dark` when unknown. */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(SYSTEM_LIGHT_QUERY).matches ? 'light' : 'dark';
}

/** Theme already applied to <html> by the no-flash script, else the OS preference. */
export function getDocumentTheme(): Theme {
  if (typeof document !== 'undefined') {
    const { classList } = document.documentElement;
    if (classList.contains('light')) return 'light';
    if (classList.contains('dark')) return 'dark';
  }
  return getSystemTheme();
}

/** Applies the theme class, `color-scheme` and browser `theme-color` meta. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
  const meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  meta?.setAttribute('content', THEME_COLORS[theme]);
}
