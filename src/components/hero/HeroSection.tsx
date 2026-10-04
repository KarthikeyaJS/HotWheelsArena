import { ArrowDown, ChevronsDown, Gem } from 'lucide-react';
import { useCallback, useRef, useState, type MouseEvent } from 'react';
import {
  HOME_SECTION_IDS,
  scrollToSection,
  sectionHeadingId,
} from '@/components/home/homeSections';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { BRAND_HERO_TITLE, BRAND_PRODUCT_LINE, BRAND_TAGLINE } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useProducts } from '@/hooks/useProducts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { Product } from '@/types';
import { HeroBackdrop } from './HeroBackdrop';
import { HeroCar } from './HeroCar';
import { HeroGauges, HeroReadouts } from './HeroHud';
import { createProgressStore } from './telemetry';
import { useHeroScrollSequence } from './useHeroScrollSequence';

const selectCarCount = (products: Product[]): number => products.length;

const TAGLINE_WORDS = BRAND_TAGLINE.trim().split(/\s+/);
const TAGLINE_LEAD = TAGLINE_WORDS.slice(0, -1).join(' ');
const TAGLINE_LAST = TAGLINE_WORDS[TAGLINE_WORDS.length - 1] ?? BRAND_TAGLINE;

/**
 * HERO / DIGITAL GARAGE — full-viewport garage scene (night garage in dark mode, bright showroom
 * in light mode) with the inline hero car, headline, CTAs and racing HUD.
 *
 * Desktop (≥1024px) without reduced motion: the section grows to ~135% of the viewport of
 * extra scroll and its stage sticks under the header while the GSAP sequence scrubs
 * (`useHeroScrollSequence`). Otherwise: a static hero with simple fades. The headline and CTAs
 * are plain markup, visible on first paint (LCP), and GSAP only animates from those values.
 */
export function HeroSection() {
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [gsapUnavailable, setGsapUnavailable] = useState(false);
  const sequence = isDesktop && !reducedMotion && !gsapUnavailable;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [store] = useState(() => createProgressStore(0));
  const handleUnavailable = useCallback(() => setGsapUnavailable(true), []);
  useHeroScrollSequence({
    enabled: sequence,
    sectionRef,
    stageRef,
    store,
    onUnavailable: handleUnavailable,
  });

  const carCount = useProducts(selectCarCount);
  const headingId = sectionHeadingId(HOME_SECTION_IDS.hero);

  const exploreCollection = (event: MouseEvent<HTMLElement>): void => {
    event.preventDefault();
    scrollToSection(HOME_SECTION_IDS.collection, { reducedMotion });
  };

  return (
    <section
      id={HOME_SECTION_IDS.hero}
      ref={sectionRef}
      aria-labelledby={headingId}
      tabIndex={-1}
      data-sequence={sequence ? 'scroll' : 'static'}
      className={cn('relative focus:outline-none', sequence && 'h-[calc(235svh-60px)]')}
    >
      <div
        ref={stageRef}
        className={cn(
          'relative isolate flex flex-col overflow-hidden',
          sequence
            ? 'sticky top-[60px] h-[calc(100svh-60px)] min-h-[600px]'
            : 'min-h-[calc(100svh-76px)]',
        )}
      >
        <HeroBackdrop sequence={sequence} />

        <Container className="relative pt-8 sm:pt-12 lg:pt-14">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-8">
              <div data-hero="headline">
                <p className="hud flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-accent shadow-glow-accent motion-safe:animate-glow-pulse"
                  />
                  <span className="text-fg">Digital garage</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {carCount.data !== undefined && carCount.data > 0
                      ? `${formatNumber(carCount.data)} machines parked`
                      : 'Doors open 24/7'}
                  </span>
                </p>
                <h1
                  id={headingId}
                  className="mt-4 font-black leading-[0.95] tracking-[0.04em] text-fg sm:tracking-display"
                >
                  <span className="block text-[clamp(2.05rem,9.4vw,3.75rem)] lg:text-[clamp(3.75rem,6.5vw,6.1rem)]">
                    {BRAND_HERO_TITLE}
                  </span>
                  <span className="sr-only"> — </span>
                  <span className="mt-2 block text-[clamp(1.2rem,5.5vw,2.25rem)] font-bold text-fg/90 lg:mt-3 lg:text-[clamp(2.25rem,3.95vw,3.7rem)]">
                    {TAGLINE_LEAD ? `${TAGLINE_LEAD} ` : null}
                    <span className="relative inline-block">
                      {TAGLINE_LAST}
                      <span
                        aria-hidden="true"
                        className="racing-stripe racing-stripe-bottom is-active -bottom-[0.2em] h-[0.12em] min-h-[3px] animate-stripe-slide [animation-delay:350ms]"
                      />
                    </span>
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
                  Rare 1:64 castings, numbered vault drops and a virtual garage that levels up with
                  every car you park — built for Indian {BRAND_PRODUCT_LINE} collectors.
                </p>
              </div>
              <div data-hero="ctas" className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  href={`#${HOME_SECTION_IDS.collection}`}
                  onClick={exploreCollection}
                  rightIcon={<ArrowDown />}
                >
                  Explore Collection
                </Button>
                <Button size="lg" variant="secondary" to={ROUTES.vault} leftIcon={<Gem />}>
                  Enter the Vault
                </Button>
              </div>
            </div>
            <div
              data-hero="hud"
              className="hidden lg:col-span-4 lg:flex lg:items-start lg:justify-end"
            >
              <HeroGauges store={store} live={sequence} />
            </div>
          </div>
        </Container>

        <div
          data-hero="car-area"
          className="relative mt-4 min-h-[140px] flex-1 animate-fade-in-delayed sm:min-h-[180px]"
        >
          <div data-hero="car-box" className="absolute inset-0 mx-auto w-full max-w-[1120px]">
            <div data-hero="car" className="h-full w-full">
              <div data-hero="car-tilt" className="h-full w-full">
                <HeroCar className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>

        <Container className="relative pb-5 pt-2">
          <div className="flex items-center justify-between gap-4 border-t border-line/70 pt-3">
            <div data-hero="hud">
              <HeroReadouts store={store} live={sequence} />
            </div>
            <p
              data-hero="cue"
              aria-hidden="true"
              className="hud hidden items-center gap-2 text-muted md:flex"
            >
              <ChevronsDown className="h-4 w-4 text-accent-ink motion-safe:animate-float" />
              {sequence ? 'Scroll to launch' : 'Scroll to explore'}
            </p>
            <p aria-hidden="true" className="hud hidden text-muted lg:block">
              Bay 07 · Level B2
            </p>
          </div>
        </Container>

        {sequence ? (
          <div
            data-hero="exit-fade"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg opacity-0"
          />
        ) : null}
      </div>
    </section>
  );
}
