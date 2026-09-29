import { useCallback } from 'react';
import type { Howl } from 'howler';
import { SOUND_SOURCES, SOUND_VOLUME } from '@/config/sound';
import { useUiStore } from '@/store/uiStore';
import type { SoundName } from '@/types';

/**
 * Optional engine sounds. Howler is loaded with a dynamic `import('howler')` the first time a
 * sound actually plays (never while sounds are off), each `Howl` is created once and cached,
 * and every failure — missing file, blocked autoplay, decode error — is swallowed silently.
 */

type HowlerModule = typeof import('howler');

let howlerPromise: Promise<HowlerModule | null> | null = null;
const howls = new Map<SoundName, Howl>();
/** Sounds that failed to load — never retried this session. */
const broken = new Set<SoundName>();

function loadHowler(): Promise<HowlerModule | null> {
  howlerPromise ??= import('howler').catch(() => {
    // Offline / chunk error: allow a retry on the next play.
    howlerPromise = null;
    return null;
  });
  return howlerPromise;
}

function getHowl(module: HowlerModule, name: SoundName): Howl | null {
  const cached = howls.get(name);
  if (cached) return cached;
  try {
    const howl = new module.Howl({
      src: [SOUND_SOURCES[name]],
      volume: SOUND_VOLUME[name],
      preload: true,
      onloaderror: () => {
        broken.add(name);
        howls.delete(name);
      },
      onplayerror: () => {
        // Autoplay was blocked — Howler retries after the next user gesture; nothing to do.
      },
    });
    howls.set(name, howl);
    return howl;
  } catch {
    broken.add(name);
    return null;
  }
}

/**
 * Plays a sound if sounds are enabled in preferences (reads the store at call time, so it is
 * safe right after `toggleSound()`). No-op on the server, when disabled, or when the file is
 * missing. Usable outside React.
 */
export function playSound(name: SoundName): void {
  if (typeof window === 'undefined') return;
  if (!useUiStore.getState().soundEnabled || broken.has(name)) return;
  void loadHowler()
    .then((module) => {
      if (!module || !useUiStore.getState().soundEnabled) return;
      const howl = getHowl(module, name);
      if (!howl) return;
      if (howl.playing()) howl.stop();
      howl.play();
    })
    .catch(() => undefined);
}

/**
 * Returns a stable `play(name)` function for the optional engine sounds (`rev`, `click`, `start`).
 * Silent unless the user switched sounds on (nav toggle; off by default).
 * @example const play = useSound(); <button onClick={() => { play('click'); add(); }}>
 */
export function useSound(): (name: SoundName) => void {
  return useCallback((name: SoundName) => playSound(name), []);
}
