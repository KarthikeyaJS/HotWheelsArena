/** Engine sound sources (generated into public/sounds by `npm run sounds`). */
import type { SoundName } from '@/types';

export const SOUND_SOURCES: Readonly<Record<SoundName, string>> = {
  rev: '/sounds/rev.wav',
  click: '/sounds/click.wav',
  start: '/sounds/start.wav',
};

/** Per-sound playback volume (0–1). */
export const SOUND_VOLUME: Readonly<Record<SoundName, number>> = {
  rev: 0.45,
  click: 0.35,
  start: 0.5,
};
