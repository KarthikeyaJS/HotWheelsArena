import { animate, useInView } from 'framer-motion';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { EASE_OUT_EXPO } from '@/lib/animations';

export interface AnimatedNumberOptions {
  /** Animate at all (default true). Reduced-motion users always get the final value. */
  enabled?: boolean;
  /** Seconds (default 1.4). */
  duration?: number;
  /** Start value for the first sweep (default 0). */
  from?: number;
}

/**
 * Tweens a number towards `target` once `ref` scrolls into view, then on every change.
 * Returns the current (fractional) value. Instant under reduced motion or when disabled.
 */
export function useAnimatedNumber(
  target: number,
  ref: RefObject<Element | null>,
  { enabled = true, duration = 1.4, from = 0 }: AnimatedNumberOptions = {},
): number {
  const reduceMotion = useReducedMotion();
  const animated = enabled && !reduceMotion;
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [value, setValue] = useState(animated ? from : target);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!animated) {
      setValue(target);
      return undefined;
    }
    if (!inView) return undefined;
    const controls = animate(valueRef.current, target, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => setValue(latest),
    });
    return () => controls.stop();
  }, [animated, inView, target, duration]);

  return value;
}
