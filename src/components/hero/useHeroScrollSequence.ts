import { useEffect, type RefObject } from 'react';
import { computeCarMotion } from './carMotion';
import { HERO_CAR_HEADLIGHT, HERO_CAR_WHEELS, svgPoint } from './heroCarGeometry';
import { loadScrollGsap } from './loadGsap';
import { SEQUENCE_EXIT_AT, quantizeProgress, type ProgressStore } from './telemetry';

/** CSS `top` of the sticky stage (the condensed header height). */
export const HERO_STICKY_TOP = 60;

export interface HeroScrollSequenceOptions {
  /** Desktop (≥1024px) and no reduced-motion preference. */
  enabled: boolean;
  /** The tall hero `<section>` (scroll distance = its height − the stage height). */
  sectionRef: RefObject<HTMLElement | null>;
  /** The sticky, viewport-high stage that stays pinned while the sequence scrubs. */
  stageRef: RefObject<HTMLElement | null>;
  /** Receives the (smoothed) timeline progress for the HUD. */
  store: ProgressStore;
  /** GSAP could not be loaded — the caller falls back to the static hero. */
  onUnavailable?: () => void;
}

/**
 * GSAP ScrollTrigger sequence for the hero ("camera follows"). While the stage is pinned (CSS
 * `position: sticky`, so there is no pin-spacer and no layout shift) the scrubbed timeline:
 * accelerates the car to the right with an ease that keeps speeding up, spins the wheels in
 * proportion to the distance, flares the headlights, parallaxes the garage layers the opposite
 * way, intensifies the speed lines, climbs the HUD, slides the headline away and finally fades
 * the stage out as the car leaves — handing off to the collection section.
 *
 * GSAP is imported dynamically inside the effect; everything runs in a `gsap.context()` that is
 * reverted on unmount / route change / media change (React 18 StrictMode double-mount safe).
 * All targets start from the static markup's values, so nothing moves until the user scrolls.
 */
export function useHeroScrollSequence({
  enabled,
  sectionRef,
  stageRef,
  store,
  onUnavailable,
}: HeroScrollSequenceOptions): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return undefined;

    let cancelled = false;
    let revert: (() => void) | null = null;

    loadScrollGsap()
      .then(({ gsap }) => {
        if (cancelled) return;
        const carArea = stage.querySelector<HTMLElement>('[data-hero="car-area"]');
        const carBox = stage.querySelector<HTMLElement>('[data-hero="car-box"]');

        // Layout-only measurements (offset*/client*): unaffected by the transforms GSAP applies.
        const motion = () => {
          const areaLeft = carArea
            ? carArea.getBoundingClientRect().left - stage.getBoundingClientRect().left
            : 0;
          return computeCarMotion({
            left: areaLeft + (carBox?.offsetLeft ?? 0),
            width: carBox?.clientWidth ?? stage.clientWidth,
            height: carBox?.clientHeight ?? stage.clientHeight * 0.4,
            stageWidth: stage.clientWidth,
          });
        };
        const viewportWidth = () => window.innerWidth;

        const context = gsap.context(() => {
          const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 0,
              end: () => {
                const top = section.getBoundingClientRect().top + window.scrollY;
                return Math.max(
                  1,
                  top + section.offsetHeight - stage.offsetHeight - HERO_STICKY_TOP,
                );
              },
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
            onUpdate: () => store.set(quantizeProgress(timeline.progress())),
          });

          // Car: launch squat, then an ever-accelerating run off the right edge.
          timeline
            .fromTo(
              '[data-hero="car"]',
              { x: 0 },
              { x: () => motion().travel, ease: 'power3.in', duration: SEQUENCE_EXIT_AT },
              0,
            )
            .fromTo(
              '[data-hero="car-tilt"]',
              { rotation: 0 },
              { rotation: -1.2, transformOrigin: '30% 85%', duration: 0.08, ease: 'power2.out' },
              0,
            )
            .to(
              '[data-hero="car-tilt"]',
              { rotation: 0, duration: 0.16, ease: 'power2.inOut' },
              0.08,
            )
            .fromTo(
              '[data-car="wheel-rear"]',
              { rotation: 0, svgOrigin: svgPoint(HERO_CAR_WHEELS.rear) },
              {
                rotation: () => motion().wheelDegrees,
                svgOrigin: svgPoint(HERO_CAR_WHEELS.rear),
                ease: 'power3.in',
                duration: SEQUENCE_EXIT_AT,
              },
              0,
            )
            .fromTo(
              '[data-car="wheel-front"]',
              { rotation: 0, svgOrigin: svgPoint(HERO_CAR_WHEELS.front) },
              {
                rotation: () => motion().wheelDegrees,
                svgOrigin: svgPoint(HERO_CAR_WHEELS.front),
                ease: 'power3.in',
                duration: SEQUENCE_EXIT_AT,
              },
              0,
            )
            .fromTo(
              '[data-car="wheel-blur"]',
              { opacity: 0 },
              { opacity: 0.9, duration: 0.3 },
              0.24,
            )
            // Headlights flare.
            .fromTo(
              '[data-car="glow"]',
              { opacity: 0.7, scale: 1, svgOrigin: svgPoint(HERO_CAR_HEADLIGHT) },
              {
                opacity: 1,
                scale: 1.5,
                svgOrigin: svgPoint(HERO_CAR_HEADLIGHT),
                duration: 0.28,
                ease: 'power2.out',
              },
              0,
            )
            .fromTo(
              '[data-car="beam"]',
              { opacity: 0.55, scaleX: 1, svgOrigin: svgPoint(HERO_CAR_HEADLIGHT) },
              {
                opacity: 1,
                scaleX: 1.6,
                svgOrigin: svgPoint(HERO_CAR_HEADLIGHT),
                duration: 0.3,
                ease: 'power2.out',
              },
              0,
            )
            .fromTo(
              '[data-car="flare"]',
              { opacity: 0 },
              { opacity: 1, duration: 0.16, ease: 'power2.out' },
              0.03,
            )
            .to('[data-car="flare"]', { opacity: 0.5, duration: 0.3 }, 0.3)
            // Camera follows: the garage streams past the opposite way (deeper = slower).
            .fromTo(
              '[data-hero-layer="far"]',
              { x: 0 },
              { x: () => -0.08 * viewportWidth(), ease: 'power2.in', duration: 1 },
              0,
            )
            .fromTo(
              '[data-hero-layer="mid"]',
              { x: 0 },
              { x: () => -0.3 * viewportWidth(), ease: 'power2.in', duration: 1 },
              0,
            )
            .fromTo(
              '[data-hero-layer="floor"]',
              { x: 0 },
              { x: () => -0.45 * viewportWidth(), ease: 'power2.in', duration: 1 },
              0,
            )
            // Speed lines intensify.
            .fromTo(
              '[data-hero-layer="racing"]',
              { opacity: 0.7 },
              { opacity: 1, duration: 0.5 },
              0.1,
            )
            .fromTo(
              '[data-hero-layer="speed-base"]',
              { opacity: 0.6 },
              { opacity: 0.2, duration: 0.5 },
              0.2,
            )
            .fromTo(
              '[data-hero-layer="speed-rush"]',
              { opacity: 0 },
              { opacity: 1, duration: 0.55, ease: 'power1.in' },
              0.16,
            )
            // Headline and CTAs slide away; the scroll cue goes first.
            .fromTo('[data-hero="cue"]', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.06 }, 0)
            .fromTo(
              '[data-hero="headline"]',
              { x: 0, opacity: 1 },
              { x: () => -0.06 * viewportWidth(), opacity: 0, duration: 0.42, ease: 'power1.in' },
              0.02,
            )
            .fromTo(
              '[data-hero="ctas"]',
              { x: 0, autoAlpha: 1 },
              { x: () => -0.08 * viewportWidth(), autoAlpha: 0, duration: 0.32, ease: 'power1.in' },
              0.02,
            )
            // Hand-off: HUD dims and the stage fades into the page as the car exits.
            .fromTo('[data-hero="hud"]', { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0.86)
            .fromTo(
              '[data-hero="exit-fade"]',
              { opacity: 0 },
              { opacity: 1, duration: 0.14 },
              0.86,
            );
        }, stage);

        revert = () => context.revert();
      })
      .catch(() => {
        if (!cancelled) onUnavailable?.();
      });

    return () => {
      cancelled = true;
      revert?.();
      store.set(0);
    };
  }, [enabled, sectionRef, stageRef, store, onUnavailable]);
}
