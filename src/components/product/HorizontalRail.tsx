import { motion, useInView } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { IconButton } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { accelerateIn } from '@/lib/animations';
import { cn } from '@/lib/cn';

type RailLabelProps =
  | {
      /** Accessible name of the carousel region (ARCHITECTURE contract name). */
      ariaLabel: string;
      label?: string;
    }
  | {
      /** Accessible name of the carousel region. */
      label: string;
      ariaLabel?: string;
    };

interface RailItemsProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  /** Stable React key per item (default: `item.id` when present, else the index). */
  getItemKey?: (item: T, index: number) => Key;
  children?: undefined;
}

interface RailChildrenProps {
  /** One slide per child. */
  children: ReactNode;
  items?: undefined;
  renderItem?: undefined;
  getItemKey?: undefined;
}

export type HorizontalRailGap = 'sm' | 'md' | 'lg';

interface RailBaseProps {
  /** Header content left of the controls (e.g. a `SectionHeading` or an `h2`). */
  title?: ReactNode;
  /** Extra header content next to the controls (e.g. a "View all" link). */
  action?: ReactNode;
  /** Slide width: px number or any CSS length (default `clamp(15rem, 74vw, 18.5rem)`). */
  itemWidth?: number | string;
  gap?: HorizontalRailGap;
  /** Prev/next buttons (default true; hidden automatically when nothing overflows). */
  showControls?: boolean;
  /** Slide label for screen readers (default `"3 of 12"`). */
  slideLabel?: (index: number, total: number) => string;
  className?: string;
  /** Classes for the scrolling track. */
  trackClassName?: string;
}

export type HorizontalRailProps<T = unknown> = RailBaseProps &
  RailLabelProps &
  (RailItemsProps<T> | RailChildrenProps);

const GAP_CLASSES: Readonly<Record<HorizontalRailGap, string>> = {
  sm: 'gap-3',
  md: 'gap-4 sm:gap-5',
  lg: 'gap-5 sm:gap-6',
};

const DEFAULT_ITEM_WIDTH = 'clamp(15rem, 74vw, 18.5rem)';
/** Pixels of mouse movement before a press becomes a drag (below that it stays a click). */
const DRAG_THRESHOLD = 6;
/** Edge tolerance when deciding whether the rail is at the start / end. */
const EDGE_EPSILON = 2;
const FADE_PX = 36;
const RAIL_VIEWPORT = { once: true, amount: 0.25 } as const;

const defaultSlideLabel = (index: number, total: number): string => `${index + 1} of ${total}`;

function defaultItemKey(item: unknown, index: number): Key {
  if (typeof item === 'object' && item !== null && 'id' in item) {
    const id = (item as { id: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return id;
  }
  return index;
}

interface DragState {
  pointerId: number;
  startX: number;
  startScroll: number;
  moved: boolean;
}

/**
 * Accessible horizontal scroller for card rails ("Just off the track", related cars…).
 * - `section` region with `aria-roledescription="carousel"` + `aria-label`; each slide is a
 *   `role="group"` "n of N".
 * - Native scroll-snap (touch swipe, trackpads, Shift+wheel), keyboard scrolling (the track is
 *   focusable while it overflows; arrow keys scroll it, and tabbing into a card brings it into
 *   view), prev/next IconButtons that disable at the ends.
 * - Mouse drag-to-scroll with click suppression after a drag (so dragging over a card never
 *   opens it), then a smooth settle onto the nearest slide.
 * - Slides accelerate in from the side the first time the rail is seen; none for reduced motion.
 */
export function HorizontalRail<T>(props: HorizontalRailProps<T>) {
  const {
    title,
    action,
    itemWidth = DEFAULT_ITEM_WIDTH,
    gap = 'md',
    showControls = true,
    slideLabel = defaultSlideLabel,
    className,
    trackClassName,
  } = props;
  const label = props.ariaLabel ?? props.label ?? '';

  const slides: Array<{ key: Key; node: ReactNode }> =
    props.items !== undefined
      ? props.items.map((item, index) => ({
          key: (props.getItemKey ?? defaultItemKey)(item, index),
          node: props.renderItem(item, index),
        }))
      : Children.toArray(props.children).map((child, index) => ({
          key:
            typeof child === 'object' && child !== null && 'key' in child && child.key !== null
              ? child.key
              : index,
          node: child,
        }));
  const total = slides.length;

  const reduceMotion = useReducedMotion();
  const trackId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const settleTimer = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const inView = useInView(trackRef, RAIL_VIEWPORT);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true, overflowing: false });
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    frame.current = null;
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const next = {
      atStart: track.scrollLeft <= EDGE_EPSILON,
      atEnd: track.scrollLeft >= max - EDGE_EPSILON,
      overflowing: max > EDGE_EPSILON,
    };
    setEdges((current) =>
      current.atStart === next.atStart &&
      current.atEnd === next.atEnd &&
      current.overflowing === next.overflowing
        ? current
        : next,
    );
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    measure();
    track.addEventListener('scroll', scheduleMeasure, { passive: true });
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', scheduleMeasure);
      observer.disconnect();
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    };
  }, [measure, scheduleMeasure, total]);

  // Keep keyboard focus alive when the focused arrow button disables itself at an edge.
  useEffect(() => {
    const active = document.activeElement;
    if (edges.atEnd && active === nextRef.current && !edges.atStart) prevRef.current?.focus();
    else if (edges.atStart && active === prevRef.current && !edges.atEnd) nextRef.current?.focus();
  }, [edges.atStart, edges.atEnd]);

  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

  const scrollPage = (direction: -1 | 1): void => {
    const track = trackRef.current;
    if (!track) return;
    const firstSlide = track.querySelector<HTMLElement>('[data-rail-slide]');
    const step = Math.max(track.clientWidth * 0.85, firstSlide?.offsetWidth ?? 0);
    track.scrollBy({ left: direction * step, behavior });
  };

  /** After a drag, glide to the closest slide start, then re-enable snapping. */
  const settle = (movedForward: boolean): void => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const current = track.scrollLeft;
    const padding = Number.parseFloat(window.getComputedStyle(track).scrollPaddingLeft) || 0;
    // The track is `relative`, so it is the slides' offsetParent: offsetLeft is track-relative.
    const starts = Array.from(track.querySelectorAll<HTMLElement>('[data-rail-slide]')).map(
      (slide) => Math.min(max, Math.max(0, slide.offsetLeft - padding)),
    );
    let target = current;
    let best = Number.POSITIVE_INFINITY;
    for (const start of starts) {
      // Bias toward the direction of travel so a short flick still advances.
      const distance = Math.abs(start - current) - (movedForward === start > current ? 24 : 0);
      if (distance < best) {
        best = distance;
        target = start;
      }
    }
    track.scrollTo({ left: target, behavior });
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(
      () => {
        settleTimer.current = null;
        track.style.scrollSnapType = '';
      },
      reduceMotion ? 0 : 450,
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !edges.overflowing) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    const track = trackRef.current;
    if (!state || !track || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    if (!state.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      state.moved = true;
      // Suspend snapping synchronously (a state-driven class would lag behind fast moves).
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
      track.style.scrollSnapType = 'none';
      setDragging(true);
      track.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    track.scrollLeft = state.startScroll - dx;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    const track = trackRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    if (!state.moved) return;
    setDragging(false);
    // Swallow the click that follows this pointerup (it would open the card under the cursor).
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    settle(event.clientX < state.startX);
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>): void => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const fadeStart = edges.overflowing && !edges.atStart;
  const fadeEnd = edges.overflowing && !edges.atEnd;
  const mask =
    fadeStart || fadeEnd
      ? `linear-gradient(90deg, ${fadeStart ? 'transparent' : '#000'} 0, #000 ${
          fadeStart ? FADE_PX : 0
        }px, #000 calc(100% - ${fadeEnd ? FADE_PX : 0}px), ${fadeEnd ? 'transparent' : '#000'} 100%)`
      : undefined;
  const trackStyle: CSSProperties | undefined = mask
    ? { WebkitMaskImage: mask, maskImage: mask }
    : undefined;
  const slideWidth = typeof itemWidth === 'number' ? `${itemWidth}px` : itemWidth;
  const controlsVisible = showControls && edges.overflowing;
  const animateEntrance = !reduceMotion;

  const trackClasses = cn(
    'scrollbar-none relative -my-3 flex overflow-x-auto overscroll-x-contain px-1 py-3 [scroll-padding-inline:0.25rem]',
    GAP_CLASSES[gap],
    'snap-x snap-mandatory',
    edges.overflowing && 'cursor-grab',
    dragging && 'cursor-grabbing select-none [&_*]:pointer-events-none',
    trackClassName,
  );

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('min-w-0', className)}
    >
      {title !== undefined || action !== undefined || controlsVisible ? (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-[min(100%,18rem)]">{title}</div>
          <div className="flex shrink-0 items-center gap-3">
            {action}
            {controlsVisible ? (
              <div className="flex items-center gap-2">
                <IconButton
                  ref={prevRef}
                  label="Previous cars"
                  icon={<ChevronLeft />}
                  variant="outline"
                  size="md"
                  disabled={edges.atStart}
                  aria-controls={trackId}
                  onClick={() => scrollPage(-1)}
                />
                <IconButton
                  ref={nextRef}
                  label="Next cars"
                  icon={<ChevronRight />}
                  variant="outline"
                  size="md"
                  disabled={edges.atEnd}
                  aria-controls={trackId}
                  onClick={() => scrollPage(1)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        ref={trackRef}
        id={trackId}
        role="group"
        aria-label={`${label}: ${total} ${total === 1 ? 'car' : 'cars'}`}
        // A scrollable region must be keyboard-focusable (axe "scrollable-region-focusable") so
        // arrow keys can scroll it; it is only focusable while it actually overflows.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={edges.overflowing ? 0 : undefined}
        className={trackClasses}
        style={trackStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        // Links are natively draggable; a native drag would cancel our pointer drag.
        onDragStart={(event) => event.preventDefault()}
      >
        {slides.map((slide, index) => (
          <motion.div
            key={slide.key}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabel(index, total)}
            data-rail-slide=""
            className="min-w-0 shrink-0 snap-start"
            style={{ width: slideWidth }}
            // Each slide follows the rail's in-view state, so slides that arrive after the rail
            // was first seen (loading → data) still accelerate in instead of staying hidden.
            variants={animateEntrance ? accelerateIn : undefined}
            custom={index}
            initial={animateEntrance ? 'hidden' : false}
            animate={animateEntrance ? (inView ? 'visible' : 'hidden') : undefined}
          >
            {slide.node}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
