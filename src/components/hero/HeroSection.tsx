import { ArrowDown, Gem } from 'lucide-react';
import type { MouseEvent } from 'react';
import {
  HOME_SECTION_IDS,
  scrollToSection,
  sectionHeadingId,
} from '@/components/home/homeSections';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { BRAND_HERO_TITLE, BRAND_PRODUCT_LINE, BRAND_TAGLINE } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { useProducts } from '@/hooks/useProducts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatNumber } from '@/lib/format';
import type { Product } from '@/types';
import { HeroBackdrop } from './HeroBackdrop';
import { HeroCar } from './HeroCar';

const selectCarCount = (products: Product[]): number => products.length;

const TAGLINE_WORDS = BRAND_TAGLINE.trim().split(/\s+/);
const TAGLINE_LEAD = TAGLINE_WORDS.slice(0, -1).join(' ');
const TAGLINE_LAST = TAGLINE_WORDS[TAGLINE_WORDS.length - 1] ?? BRAND_TAGLINE;

/**
 * HERO — a calm, static opening: the brand headline, one line of copy, the two CTAs and the
 * hero car parked on a faint garage-floor grid. Text left / car right from 1024px, stacked
 * below. Nothing is pinned, scroll-linked or animated (the original scroll-driven "car running"
 * sequence was removed at the user's request), the headline is plain markup visible on first
 * paint (LCP) and the section is only as tall as its content, so "Choose your ride" follows
 * right below.
 */
export function HeroSection() {
  const reducedMotion = useReducedMotion();
  const carCount = useProducts(selectCarCount);
  const headingId = sectionHeadingId(HOME_SECTION_IDS.hero);
  const count = carCount.data ?? 0;

  const exploreCollection = (event: MouseEvent<HTMLElement>): void => {
    event.preventDefault();
    scrollToSection(HOME_SECTION_IDS.collection, { reducedMotion });
  };

  return (
    <section
      id={HOME_SECTION_IDS.hero}
      aria-labelledby={headingId}
      className="relative isolate overflow-hidden border-b border-line/60"
    >
      <HeroBackdrop />

      <Container className="py-10 sm:py-14 lg:py-16 xl:py-20">
        <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-6">
            {/* One line from 320px up, before and after the count loads (no reflow). */}
            <p className="hud flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap text-muted">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span className="text-fg">Digital garage</span>
              <span aria-hidden="true">·</span>
              {count > 0 ? (
                <span>
                  {formatNumber(count)} machines
                  <span className="max-[359px]:hidden"> parked</span>
                </span>
              ) : (
                <span>
                  <span className="max-[359px]:hidden">Doors </span>open 24/7
                </span>
              )}
            </p>
            <h1
              id={headingId}
              className="mt-4 font-black leading-[0.95] tracking-[0.04em] text-fg sm:tracking-display"
            >
              <span className="block text-[clamp(2.05rem,9.4vw,3.75rem)] lg:text-[clamp(3rem,4.6vw,4.25rem)]">
                {BRAND_HERO_TITLE}
              </span>
              <span className="sr-only"> — </span>
              <span className="mt-2 block text-[clamp(1.2rem,5.5vw,2.25rem)] font-bold text-fg/90 lg:mt-3 lg:text-[clamp(1.75rem,2.75vw,2.5rem)]">
                {TAGLINE_LEAD ? `${TAGLINE_LEAD} ` : null}
                <span className="relative inline-block">
                  {TAGLINE_LAST}
                  <span
                    aria-hidden="true"
                    className="racing-stripe racing-stripe-bottom is-active -bottom-[0.2em] h-[0.12em] min-h-[3px]"
                  />
                </span>
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted sm:text-lg">
              Rare 1:64 castings and numbered vault drops for Indian {BRAND_PRODUCT_LINE}{' '}
              collectors.
            </p>
            {/* 1024–1279px: the half-width column can't fit both CTAs side by side, so they stack at one equal width. */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-xl:w-fit lg:max-xl:flex-col">
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

          <div className="lg:col-span-6">
            {/* Static car; the aspect box reserves its height before the SVG paints (no CLS). */}
            <div
              data-hero="car"
              className="relative mx-auto aspect-[800/270] w-full max-w-[36rem] lg:w-[112%] lg:max-w-none"
            >
              <div
                aria-hidden="true"
                className="absolute -inset-x-[8%] -inset-y-[30%] -z-10 bg-[radial-gradient(closest-side,rgb(var(--surface))_0%,transparent_100%)] dark:bg-[radial-gradient(closest-side,rgb(var(--text)/0.07)_0%,transparent_100%)]"
              />
              <HeroCar className="h-full w-full" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
