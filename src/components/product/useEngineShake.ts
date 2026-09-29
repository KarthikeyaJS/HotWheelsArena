import { useAnimationControls, type AnimationControls, type Variants } from 'framer-motion';
import { useCallback } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { engineShake } from '@/lib/animations';

export interface EngineShake {
  /** Attach to a `motion.*` element: `<motion.span animate={controls} variants={variants} initial="idle">`. */
  controls: AnimationControls;
  variants: Variants;
  /** Replays the 1–2px engine vibration (no-op for reduced-motion users). */
  shake: () => void;
}

/**
 * One-shot "engine shake" micro-vibration for key interactions (add to cart / garage).
 * Internal to the product components; replayable on every call.
 */
export function useEngineShake(): EngineShake {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const shake = useCallback(() => {
    if (reduceMotion) return;
    controls.set('idle');
    void controls.start('rev');
  }, [controls, reduceMotion]);

  return { controls, variants: engineShake, shake };
}
