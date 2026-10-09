import { useMemo } from 'react';
import type { Variants } from 'framer-motion';
import { motionSafe } from '@/lib/animations';
import { MEDIA_QUERIES, useMediaQuery } from './useMediaQuery';

/**
 * True when the user prefers reduced motion. Gate Framer Motion transitions, confetti, engine
 * shake, auto-scrolling and parallax on this.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(MEDIA_QUERIES.reducedMotion);
}

/** Returns `variants`, or a fade-only copy when reduced motion is preferred. */
export function useMotionSafeVariants(variants: Variants): Variants {
  const reduce = useReducedMotion();
  return useMemo(() => motionSafe(variants, reduce), [variants, reduce]);
}
