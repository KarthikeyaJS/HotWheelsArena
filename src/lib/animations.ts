/**
 * Framer Motion presets. AppProviders wraps the app in `<MotionConfig reducedMotion="user">`,
 * so transform animations are already dropped for reduced-motion users; `motionSafe()` gives an
 * explicit fade-only fallback where a component wants full control.
 *
 * Variant key convention: `hidden` / `visible` / `exit` for enter-exit, `rest` / `hover` for
 * hover states, `idle` / `rev` for the engine shake.
 */
import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

/* --------------------------------- Easing -------------------------------- */

export type CubicBezier = [number, number, number, number];

/** Fast out, long settle — the default "arrive from the track" feel. */
export const EASE_OUT_EXPO: CubicBezier = [0.16, 1, 0.3, 1];
/** Racing ease used by stripes / hovers. */
export const EASE_RACE: CubicBezier = [0.22, 1, 0.36, 1];
/** Slow start, hard acceleration (exits, launches). */
export const EASE_ACCELERATE: CubicBezier = [0.7, 0, 0.84, 0];
/** Quick launch then brake — used by `accelerateIn`. */
export const EASE_LAUNCH: CubicBezier = [0.12, 0.85, 0.18, 1];
export const EASE_IN_OUT: CubicBezier = [0.65, 0, 0.35, 1];

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.35,
  slow: 0.6,
  slower: 0.9,
} as const;

export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 220, damping: 26 };

/** Max 3D tilt in degrees for product imagery (ProductCard / detail gallery). */
export const TILT_MAX_DEG = 8;

/* -------------------------------- Variants ------------------------------- */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, y: -12, transition: { duration: DURATION.fast, ease: EASE_IN_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: 'easeIn' } },
};

/** Parent that staggers `hidden → visible` of its children. */
export function staggerContainer(stagger = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
    exit: { transition: { staggerChildren: stagger / 2, staggerDirection: -1 } },
  };
}

/**
 * Cars entering from the side with a quick acceleration ease (new arrivals rail).
 * Pass the item index via `custom={index}` for a per-item delay.
 */
export const accelerateIn: Variants = {
  hidden: { opacity: 0, x: 96, skewX: -8, filter: 'blur(4px)' },
  visible: (index: number = 0) => ({
    opacity: 1,
    x: 0,
    skewX: 0,
    filter: 'blur(0px)',
    transition: { duration: DURATION.slow, ease: EASE_LAUNCH, delay: Math.min(index, 8) * 0.06 },
  }),
  exit: { opacity: 0, x: -64, transition: { duration: DURATION.fast, ease: EASE_ACCELERATE } },
};

/** 1–2px engine vibration: animate from `idle` to `rev`. */
export const engineShake: Variants = {
  idle: { x: 0, y: 0 },
  rev: {
    x: [0, -1.5, 1.5, -1, 1, -0.5, 0],
    y: [0, 1, -1, 0.5, -0.5, 0.5, 0],
    transition: { duration: 0.42, ease: 'linear' },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: SPRING_SNAPPY },
  exit: { opacity: 0, scale: 0.96, transition: { duration: DURATION.fast } },
};

/** Racing stripe: `rest` → `hover` scales in from the left. Use on an element with origin-left. */
export const stripeSlide: Variants = {
  rest: { scaleX: 0, originX: 0 },
  hover: { scaleX: 1, originX: 0, transition: { duration: DURATION.base, ease: EASE_RACE } },
};

/** Side drawer from the right (MobileDrawer uses `drawerLeft`). */
export const drawerRight: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
  exit: { x: '100%', transition: { duration: DURATION.fast, ease: EASE_IN_OUT } },
};

export const drawerLeft: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
  exit: { x: '-100%', transition: { duration: DURATION.fast, ease: EASE_IN_OUT } },
};

/** Modal / overlay backdrop. */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Viewport options for `whileInView` section reveals. */
export const inViewOnce = { once: true, amount: 0.2 } as const;

/* ----------------------------- Reduced motion ----------------------------- */

const REDUCED_TRANSITION: Transition = { duration: DURATION.fast, ease: 'easeOut' };

function fadeOnlyTarget(target: TargetAndTransition): TargetAndTransition {
  return target.opacity !== undefined
    ? { opacity: target.opacity, transition: REDUCED_TRANSITION }
    : { transition: REDUCED_TRANSITION };
}

/** Strips transforms from every variant, keeping only opacity fades. */
export function reduceVariants(variants: Variants): Variants {
  const reduced: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'function') {
      reduced[key] = (...args: Parameters<typeof value>) => {
        const resolved = value(...args);
        return typeof resolved === 'string' ? resolved : fadeOnlyTarget(resolved);
      };
    } else {
      reduced[key] = fadeOnlyTarget(value);
    }
  }
  return reduced;
}

/** `motionSafe(fadeUp, prefersReducedMotion)` → the variants, or a fade-only copy. */
export function motionSafe(variants: Variants, reduce: boolean | null | undefined): Variants {
  return reduce ? reduceVariants(variants) : variants;
}
