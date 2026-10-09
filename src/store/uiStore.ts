/**
 * UI preferences + transient UI state.
 * Persisted (localStorage `hwa-prefs-v1`, persist version 2): `theme` (only once the user
 * explicitly picks one) and `scanlines`. Everything else is session-only.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getDocumentTheme } from '@/lib/theme';
import type { ScanlineMode, SignInPromptState, Theme } from '@/types';

export const PREFS_STORAGE_KEY = 'hwa-prefs-v1';
/**
 * zustand persist version of {@link PREFS_STORAGE_KEY}. v1 also stored `soundEnabled` (the
 * engine-sound preference, removed with the sound feature); `migratePrefs` upgrades it.
 */
export const PREFS_VERSION = 2;

export interface UiState {
  theme: Theme;
  /** True once the user chose a theme (then OS changes are ignored). Derived from storage. */
  themeExplicit: boolean;
  /** CRT scanlines: `auto` = on in dark, off in light. */
  scanlines: ScanlineMode;

  mobileNavOpen: boolean;
  searchOpen: boolean;
  signInPrompt: SignInPromptState;

  /** Explicit user choice (persisted). */
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Follow the OS preference — ignored once the user chose explicitly. */
  syncSystemTheme: (theme: Theme) => void;

  setScanlines: (mode: ScanlineMode) => void;
  /** auto → on → off → auto. */
  cycleScanlines: () => void;

  setMobileNavOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;

  setSearchOpen: (open: boolean) => void;
  /** Opens the command palette (closes the mobile drawer). */
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  /** Opens the SignInPrompt modal with an optional reason. */
  openSignInPrompt: (reason?: string) => void;
  closeSignInPrompt: () => void;
}

export interface PersistedPrefs {
  theme?: Theme;
  scanlines?: ScanlineMode;
}

const SCANLINE_MODES: readonly ScanlineMode[] = ['auto', 'on', 'off'];

const isTheme = (value: unknown): value is Theme => value === 'dark' || value === 'light';
const isScanlineMode = (value: unknown): value is ScanlineMode =>
  typeof value === 'string' && (SCANLINE_MODES as readonly string[]).includes(value);

/**
 * Upgrades a stored prefs payload from an older persist version: keeps a valid `theme` and
 * `scanlines` and drops everything else (e.g. the legacy v1 `soundEnabled` key), so the
 * index.html no-flash script keeps reading `state.theme` from the same key.
 */
export function migratePrefs(persisted: unknown): PersistedPrefs {
  const stored =
    typeof persisted === 'object' && persisted !== null
      ? (persisted as Record<string, unknown>)
      : {};
  return {
    ...(isTheme(stored.theme) ? { theme: stored.theme } : {}),
    ...(isScanlineMode(stored.scanlines) ? { scanlines: stored.scanlines } : {}),
  };
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: getDocumentTheme(),
      themeExplicit: false,
      scanlines: 'auto',
      mobileNavOpen: false,
      searchOpen: false,
      signInPrompt: { open: false },

      setTheme: (theme) => set({ theme, themeExplicit: true }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark', themeExplicit: true })),
      syncSystemTheme: (theme) =>
        set((state) => (state.themeExplicit || state.theme === theme ? state : { theme })),

      setScanlines: (scanlines) => set({ scanlines }),
      cycleScanlines: () =>
        set((state) => {
          const index = SCANLINE_MODES.indexOf(state.scanlines);
          return { scanlines: SCANLINE_MODES[(index + 1) % SCANLINE_MODES.length] ?? 'auto' };
        }),

      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openMobileNav: () => set({ mobileNavOpen: true }),
      closeMobileNav: () => set({ mobileNavOpen: false }),
      toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),

      setSearchOpen: (searchOpen) =>
        set(searchOpen ? { searchOpen, mobileNavOpen: false } : { searchOpen }),
      openSearch: () => set({ searchOpen: true, mobileNavOpen: false }),
      closeSearch: () => set({ searchOpen: false }),
      toggleSearch: () =>
        set((state) =>
          state.searchOpen ? { searchOpen: false } : { searchOpen: true, mobileNavOpen: false },
        ),

      openSignInPrompt: (reason) =>
        set({
          signInPrompt: reason ? { open: true, reason } : { open: true },
          mobileNavOpen: false,
        }),
      closeSignInPrompt: () => set({ signInPrompt: { open: false } }),
    }),
    {
      name: PREFS_STORAGE_KEY,
      version: PREFS_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedPrefs => ({
        ...(state.themeExplicit ? { theme: state.theme } : {}),
        scanlines: state.scanlines,
      }),
      migrate: (persisted) => migratePrefs(persisted),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as PersistedPrefs;
        return {
          ...current,
          ...(isTheme(stored.theme) ? { theme: stored.theme, themeExplicit: true } : {}),
          scanlines: isScanlineMode(stored.scanlines) ? stored.scanlines : current.scanlines,
        };
      },
    },
  ),
);

/** Whether the scanlines overlay should render right now (resolves `auto`). */
export const useScanlinesActive = (): boolean =>
  useUiStore(
    (state) => state.scanlines === 'on' || (state.scanlines === 'auto' && state.theme === 'dark'),
  );
