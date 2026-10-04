import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { loadMotionPathGsap } from '@/components/hero/loadGsap';
import {
  TRACK_STATIONS,
  scrollToSection,
  type HomeSectionId,
} from '@/components/home/homeSections';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import {
  TRACK_WIDTH,
  pointAtFraction,
  sampleTrackPoints,
  sectionScrollFraction,
  toSmoothPath,
} from './trackGeometry';
import { useActiveSection } from './useActiveSection';

const STATION_IDS: readonly HomeSectionId[] = TRACK_STATIONS.map((station) => station.id);

/** Reads each station's scroll fraction from the live layout. */
function measureStationFractions(): number[] {
  const root = document.documentElement;
  const maxScroll = root.scrollHeight - window.innerHeight;
  const padding = Number.parseFloat(window.getComputedStyle(root).scrollPaddingTop) || 0;
  return STATION_IDS.map((id) => {
    const element = document.getElementById(id);
    if (!element) return 0;
    const top = element.getBoundingClientRect().top + window.scrollY;
    return sectionScrollFraction(top, padding, maxScroll);
  });
}

const sameFractions = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((value, index) => Math.abs(value - (b[index] ?? 0)) < 0.001);

export interface ScrollTrackProps {
  className?: string;
}

/**
 * SCROLL-TRACK — a Hot Wheels track down the left page gutter. A small car follows the track as
 * the whole page scrolls (GSAP ScrollTrigger + MotionPathPlugin, scrubbed) while the travelled
 * part of the track lights up; station markers HERO → COLLECTION → NEW ARRIVALS → VAULT →
 * GARAGE → ABOUT light up when their section is in view.
 *
 * The track art is decorative (`aria-hidden`); the markers are a real, visually subtle
 * "jump to section" navigation (buttons with `aria-current`). The parent renders this only on
 * wide desktops (≥1360px, where the gutter has room) and without reduced motion.
 */
export function ScrollTrack({ className }: ScrollTrackProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  const [height, setHeight] = useState(0);
  const [fractions, setFractions] = useState<number[]>(() => STATION_IDS.map(() => 0));
  const activeId = useActiveSection(STATION_IDS);

  const points = useMemo(
    () => (height > 0 ? sampleTrackPoints(TRACK_WIDTH, height) : []),
    [height],
  );
  const pathData = useMemo(() => toSmoothPath(points), [points]);

  // Rail size (the track is regenerated for the new height).
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const update = (): void => setHeight(Math.round(rail.clientHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  // Station positions follow the page layout (data loading grows the sections).
  useEffect(() => {
    let frame = 0;
    const measure = (): void => {
      frame = 0;
      const next = measureStationFractions();
      setFractions((current) => (sameFractions(current, next) ? current : next));
    };
    const schedule = (): void => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // Hide the "travelled" overlay until GSAP drives it (so the static fallback isn't all lit).
  useLayoutEffect(() => {
    const progress = progressRef.current;
    if (!progress || !pathData || typeof progress.getTotalLength !== 'function') return;
    const length = progress.getTotalLength();
    progress.style.strokeDasharray = `${length}`;
    progress.style.strokeDashoffset = `${length}`;
  }, [pathData]);

  // Car + progress scrubbed to the whole page scroll.
  useEffect(() => {
    const car = carRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    const rail = railRef.current;
    if (!pathData || !car || !track || !progress || !rail) return undefined;

    let cancelled = false;
    let revert: (() => void) | null = null;
    let observer: ResizeObserver | null = null;
    let refreshTimer = 0;

    loadMotionPathGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;
        const length = progress.getTotalLength();
        const scrollTrigger = {
          trigger: document.documentElement,
          start: 0,
          end: 'max',
          scrub: 0.5,
          invalidateOnRefresh: true,
        };
        const context = gsap.context(() => {
          gsap.to(car, {
            motionPath: { path: track, align: track, alignOrigin: [0.5, 0.5], autoRotate: true },
            ease: 'none',
            immediateRender: true,
            scrollTrigger,
          });
          gsap.fromTo(
            progress,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: 0, ease: 'none', scrollTrigger },
          );
        }, rail);
        revert = () => context.revert();

        // `end: 'max'` depends on the document height, which grows as sections load.
        observer = new ResizeObserver(() => {
          window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
        });
        observer.observe(document.body);
      })
      .catch(() => {
        // GSAP unavailable: the static track and the station navigation still work.
      });

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      observer?.disconnect();
      revert?.();
    };
  }, [pathData]);

  const jumpTo = useCallback((id: HomeSectionId) => {
    scrollToSection(id, { reducedMotion: false });
  }, []);

  return (
    <div
      ref={railRef}
      className={cn(
        'pointer-events-none fixed bottom-6 left-3 top-[92px] z-track min-[1440px]:left-6',
        className,
      )}
      style={{ width: TRACK_WIDTH }}
      data-testid="scroll-track"
    >
      {height > 0 ? (
        <svg
          aria-hidden="true"
          focusable="false"
          width={TRACK_WIDTH}
          height={height}
          viewBox={`0 0 ${TRACK_WIDTH} ${height}`}
          className="absolute inset-0 overflow-visible [mask-image:linear-gradient(to_bottom,transparent,#000_3%,#000_97%,transparent)]"
        >
          {/* Rail edges, orange track bed, lane dashes, travelled glow. */}
          <path
            d={pathData}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
            className="stroke-line"
          />
          <path
            ref={trackRef}
            d={pathData}
            fill="none"
            strokeWidth={8}
            strokeLinecap="round"
            className="stroke-accent/20"
          />
          <path
            d={pathData}
            fill="none"
            strokeWidth={1}
            strokeDasharray="3 7"
            className="stroke-fg/25"
          />
          <path
            ref={progressRef}
            d={pathData}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            className="stroke-accent"
          />
          {/* Top-down car (drawn facing +x; MotionPath rotates it along the track). */}
          <g ref={carRef}>
            <rect x={-10} y={-5.5} width={20} height={11} rx={3.5} className="fill-fg" />
            <rect x={-10} y={-1.1} width={20} height={2.2} className="fill-accent" />
            <rect x={1.5} y={-4} width={4.5} height={8} rx={1.2} className="fill-bg/85" />
            <rect x={-7.5} y={-3.5} width={3} height={7} rx={1} className="fill-bg/60" />
            <circle cx={9.2} cy={-3.2} r={1.1} className="fill-accent" />
            <circle cx={9.2} cy={3.2} r={1.1} className="fill-accent" />
          </g>
        </svg>
      ) : null}

      <nav aria-label="Page sections" className="absolute inset-0">
        <ol>
          {TRACK_STATIONS.map((station, index) => {
            const point = pointAtFraction(points, fractions[index] ?? 0);
            const active = station.id === activeId;
            return (
              <li
                key={station.id}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: point.x, top: point.y }}
              >
                <button
                  type="button"
                  aria-label={`Jump to ${station.name}`}
                  aria-current={active ? 'location' : undefined}
                  onClick={() => jumpTo(station.id)}
                  className="group/station relative grid h-7 w-7 place-items-center rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-3 w-3 rounded-full border-2 transition-[transform,background-color,border-color,box-shadow] duration-300',
                      active
                        ? 'scale-110 border-accent bg-accent shadow-glow-accent'
                        : 'border-metal/70 bg-bg group-hover/station:border-accent group-active/station:scale-90',
                    )}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded border border-line bg-surface/95 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-hud text-fg opacity-0 shadow-card transition-opacity duration-200 group-hover/station:opacity-100 group-focus-visible/station:opacity-100"
                  >
                    <span className="text-muted">{padNumber(index + 1)}</span>
                    {station.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
