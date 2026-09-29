import { beforeEach, describe, expect, it } from 'vitest';
import { PREFS_STORAGE_KEY, useUiStore } from './uiStore';

interface StoredPrefs {
  state?: { theme?: string; soundEnabled?: boolean; scanlines?: string; searchOpen?: boolean };
}

const readStored = (): StoredPrefs =>
  JSON.parse(window.localStorage.getItem(PREFS_STORAGE_KEY) ?? '{}') as StoredPrefs;

describe('uiStore persistence (contract with the index.html no-flash script)', () => {
  beforeEach(() => {
    useUiStore.setState({
      theme: 'dark',
      themeExplicit: false,
      soundEnabled: false,
      scanlines: 'auto',
      searchOpen: false,
      mobileNavOpen: false,
      signInPrompt: { open: false },
    });
    window.localStorage.clear();
  });

  it('does not persist a theme until the user explicitly chooses one', () => {
    useUiStore.getState().toggleSound();
    const stored = readStored();
    expect(stored.state?.soundEnabled).toBe(true);
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
