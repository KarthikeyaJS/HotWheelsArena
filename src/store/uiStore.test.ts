import { beforeEach, describe, expect, it } from 'vitest';
import { PREFS_STORAGE_KEY, PREFS_VERSION, migratePrefs, useUiStore } from './uiStore';

interface StoredPrefs {
  state?: { theme?: string; scanlines?: string; searchOpen?: boolean };
  version?: number;
}

const readStored = (): StoredPrefs =>
  JSON.parse(window.localStorage.getItem(PREFS_STORAGE_KEY) ?? '{}') as StoredPrefs;

describe('uiStore persistence (contract with the index.html no-flash script)', () => {
  beforeEach(() => {
    useUiStore.setState({
      theme: 'dark',
      themeExplicit: false,
      scanlines: 'auto',
      searchOpen: false,
      mobileNavOpen: false,
      signInPrompt: { open: false },
    });
    window.localStorage.clear();
  });

  it('does not persist a theme until the user explicitly chooses one', () => {
    useUiStore.getState().setScanlines('on');
    const stored = readStored();
    expect(stored.state?.scanlines).toBe('on');
    expect(stored.state?.theme).toBeUndefined();
  });

  it('persists an explicit theme under state.theme', () => {
    useUiStore.getState().setTheme('light');
    expect(readStored().state?.theme).toBe('light');
    expect(useUiStore.getState().themeExplicit).toBe(true);
  });

  it('follows the OS only until an explicit choice', () => {
    useUiStore.getState().syncSystemTheme('light');
    expect(useUiStore.getState().theme).toBe('light');
    useUiStore.getState().setTheme('dark');
    useUiStore.getState().syncSystemTheme('light');
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('never persists transient UI state', () => {
    useUiStore.getState().openSearch();
    useUiStore.getState().setScanlines('off');
    const stored = readStored();
    expect(stored.state?.scanlines).toBe('off');
    expect(stored.state?.searchOpen).toBeUndefined();
  });

  it('cycles scanline modes and manages the sign-in prompt', () => {
    const { cycleScanlines, openSignInPrompt, closeSignInPrompt } = useUiStore.getState();
    cycleScanlines();
    expect(useUiStore.getState().scanlines).toBe('on');
    cycleScanlines();
    cycleScanlines();
    expect(useUiStore.getState().scanlines).toBe('auto');
    openSignInPrompt('Sign in to park cars');
    expect(useUiStore.getState().signInPrompt).toEqual({
      open: true,
      reason: 'Sign in to park cars',
    });
    closeSignInPrompt();
    expect(useUiStore.getState().signInPrompt.open).toBe(false);
  });
});

describe('uiStore migration (persist v1 → v2)', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'dark', themeExplicit: false, scanlines: 'auto' });
    window.localStorage.clear();
  });

  const storeV1 = (state: Record<string, unknown>): void => {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ state, version: 1 }));
  };

  it('drops the legacy soundEnabled key and keeps theme + scanlines', async () => {
    storeV1({ theme: 'light', soundEnabled: true, scanlines: 'off' });
    await useUiStore.persist.rehydrate();

    const state = useUiStore.getState();
    expect(state.theme).toBe('light');
    expect(state.themeExplicit).toBe(true);
    expect(state.scanlines).toBe('off');
    expect(state).not.toHaveProperty('soundEnabled');

    // The upgraded payload is written back under the same key the no-flash script reads.
    const stored = readStored();
    expect(stored.version).toBe(PREFS_VERSION);
    expect(stored.state).toEqual({ theme: 'light', scanlines: 'off' });
  });

  it('keeps following the OS when v1 never stored an explicit theme', async () => {
    storeV1({ soundEnabled: false, scanlines: 'on' });
    await useUiStore.persist.rehydrate();

    expect(useUiStore.getState().themeExplicit).toBe(false);
    expect(useUiStore.getState().scanlines).toBe('on');
    expect(readStored().state).toEqual({ scanlines: 'on' });
  });

  it('discards unknown or invalid values', () => {
    expect(migratePrefs({ theme: 'sepia', scanlines: 'loud', soundEnabled: true })).toEqual({});
    expect(migratePrefs(null)).toEqual({});
    expect(migratePrefs('dark')).toEqual({});
    expect(migratePrefs({ theme: 'dark', scanlines: 'auto' })).toEqual({
      theme: 'dark',
      scanlines: 'auto',
    });
  });
});
