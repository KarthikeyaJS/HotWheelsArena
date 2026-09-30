import {
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useCallback, type PointerEvent } from 'react';
import { useCanHover } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TILT_MAX_DEG } from '@/lib/animations';

const TILT_SPRING = { stiffness: 170, damping: 18, mass: 0.7 } as const;

export interface TiltControls {
  /** False on touch / coarse pointers, with reduced motion, or when disabled by the caller. */
  enabled: boolean;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  /** Radial glare background following the cursor. */
  glare: MotionValue<string>;
  /** Attach to the element that tracks the pointer (mouse only). */
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

/**
 * Spring 3D tilt that follows the mouse across an element (framer motion values — no React
 * re-renders while moving). Disabled for touch, coarse pointers and reduced motion.
 */
export function useTilt(maxDeg: number = TILT_MAX_DEG, active = true): TiltControls {
  const canHover = useCanHover();
  const reduceMotion = useReducedMotion();
  const enabled = active && canHover && !reduceMotion;

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const springX = useSpring(pointerX, TILT_SPRING);
  const springY = useSpring(pointerY, TILT_SPRING);
  const rotateY = useTransform(springX, [0, 1], [-maxDeg, maxDeg]);
  const rotateX = useTransform(springY, [0, 1], [maxDeg, -maxDeg]);
  const glareX = useTransform(springX, [0, 1], ['20%', '80%']);
  const glareY = useTransform(springY, [0, 1], ['10%', '65%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.12), transparent 55%)`;

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (!enabled || event.pointerType !== 'mouse') return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointerX.set((event.clientX - rect.left) / rect.width);
      pointerY.set((event.clientY - rect.top) / rect.height);
    },
    [enabled, pointerX, pointerY],
  );

  const onPointerLeave = useCallback((): void => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }, [pointerX, pointerY]);

  return { enabled, rotateX, rotateY, glare, onPointerMove, onPointerLeave };
}
