/**
 * Lazy GSAP loaders for the home page's scroll sequences. GSAP is only ever reached through
 * these dynamic imports, so it stays out of the entry chunk (and out of every other route).
 * Plugins are registered once; a failed chunk load clears the cache so a later mount can retry.
 */
import type { gsap as GsapCore } from 'gsap';
import type { MotionPathPlugin as MotionPathPluginType } from 'gsap/MotionPathPlugin';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

export type Gsap = typeof GsapCore;
export type ScrollTriggerStatic = typeof ScrollTriggerType;
export type MotionPathPluginStatic = typeof MotionPathPluginType;

export interface ScrollGsap {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerStatic;
}

export interface MotionPathGsap extends ScrollGsap {
  MotionPathPlugin: MotionPathPluginStatic;
}

let scrollGsapPromise: Promise<ScrollGsap> | null = null;
let motionPathPromise: Promise<MotionPathGsap> | null = null;

/** `gsap` + `ScrollTrigger` (registered). */
export function loadScrollGsap(): Promise<ScrollGsap> {
  scrollGsapPromise ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
    .then(([core, scrollTrigger]) => {
      core.gsap.registerPlugin(scrollTrigger.ScrollTrigger);
      return { gsap: core.gsap, ScrollTrigger: scrollTrigger.ScrollTrigger };
    })
    .catch((error: unknown) => {
      scrollGsapPromise = null;
      throw error;
    });
  return scrollGsapPromise;
}

/** `gsap` + `ScrollTrigger` + `MotionPathPlugin` (registered) — for the page scroll-track. */
export function loadMotionPathGsap(): Promise<MotionPathGsap> {
  motionPathPromise ??= Promise.all([loadScrollGsap(), import('gsap/MotionPathPlugin')])
    .then(([base, motionPath]) => {
      base.gsap.registerPlugin(motionPath.MotionPathPlugin);
      return { ...base, MotionPathPlugin: motionPath.MotionPathPlugin };
    })
    .catch((error: unknown) => {
      motionPathPromise = null;
      throw error;
    });
  return motionPathPromise;
}
