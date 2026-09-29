import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge taught about our custom theme keys so conflicting classes resolve correctly
 * (e.g. `shadow-card shadow-glow-accent`, `tracking-wide tracking-display`, `z-header z-modal`).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      colors: [
        'bg',
        'surface',
        'card',
        'card-hover',
        'fg',
        'muted',
        'line',
        'accent',
        'accent-ink',
        'on-accent',
        'accent-2',
        'danger',
        'danger-ink',
        'metal',
        'highlight',
        'highlight-ink',
        'on-highlight',
        'success',
        'ring',
      ],
    },
    classGroups: {
      shadow: [{ shadow: ['glow-accent', 'glow-highlight', 'card', 'card-hover'] }],
      tracking: [{ tracking: ['display', 'hud'] }],
      z: [
        { z: ['track', 'header', 'overlay', 'drawer', 'modal', 'palette', 'toast', 'scanlines'] },
      ],
      'max-w': [{ 'max-w': ['content'] }],
      'font-family': [{ font: ['display', 'sans', 'mono'] }],
      animate: [
        {
          animate: [
            'fade-in',
            'fade-in-delayed',
            'shimmer',
            'engine-shake',
            'engine-idle',
            'stripe-slide',
            'speed-line',
            'glow-pulse',
            'float',
            'headlight-flicker',
          ],
        },
      ],
      ease: [{ ease: ['race', 'accelerate', 'out-expo'] }],
    },
  },
});

/** Compose class names: clsx conditionals + Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
