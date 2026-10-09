import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Move3d } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CarImage } from '@/components/product';
import { IconButton } from '@/components/ui';
import { DURATION } from '@/lib/animations';
import { useScrollFadeEnd } from '@/hooks/useScrollFadeEnd';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import { isSoldOut } from '@/lib/product';
import type { Product } from '@/types';
import { buildMediaItems, wrapIndex, type ModelAsset } from './mediaItems';
import { MediaViewer } from './MediaViewer';
import { useTilt } from './useTilt';

export interface ProductMediaProps {
  product: Product;
  /** Optional 3D assets (none in the catalogue yet — see `ModelViewerSlot`). */
  models?: readonly ModelAsset[];
  className?: string;
}

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 100;
/** Horizontal travel (px) that turns a touch drag on the stage into a swipe to the next/previous view. */
const SWIPE_THRESHOLD = 40;

/**
 * Product gallery: a large showroom stage (LCP image, spring 3D tilt that follows the mouse —
 * off for touch and reduced motion) and a thumbnail strip using the WAI-ARIA tabs pattern
 * (←/→/Home/End, roving tabindex, `aria-selected` + `aria-controls` → the stage panel).
 * Items come from `buildMediaItems`, so a future `model` (3D) item drops in without changes.
 */
export function ProductMedia({ product, models, className }: ProductMediaProps) {
  const baseId = useId();
  const panelId = `${baseId}-stage`;
  const tabIdFor = (index: number): string => `${baseId}-view-${index}`;

  const items = useMemo(() => buildMediaItems(product, models), [product, models]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const thumbsFadeEnd = useScrollFadeEnd(thumbsRef);
  const swipeRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const index = Math.min(activeIndex, items.length - 1);
  const active = items[index] ?? items[0];
  const hasMany = items.length > 1;
  const soldOut = isSoldOut(product.stock);
  const tilt = useTilt(undefined, active?.kind === 'image');

  if (!active) return null;

  const select = (next: number, options: { focus?: boolean; announce?: boolean } = {}): void => {
    const target = wrapIndex(next, items.length);
    setActiveIndex(target);
    if (options.announce) setAnnouncement(items[target]?.label ?? '');
    if (options.focus) tabRefs.current[target]?.focus();
  };

  /* Touch / pen swipe on the stage (CA-08). `touch-pan-y` keeps vertical page scrolling native
     while horizontal drags reach us; mouse users keep the tilt + arrows. */
  const handleSwipeStart = (event: PointerEvent<HTMLDivElement>): void => {
    if (!hasMany || event.pointerType === 'mouse') return;
    swipeRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const handleSwipeEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    select(index + (dx < 0 ? 1 : -1), { announce: true });
  };
  const cancelSwipe = (): void => {
    swipeRef.current = null;
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const keyMap: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    const next = keyMap[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, { focus: true });
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="relative">
        <div
          id={panelId}
          role={hasMany ? 'tabpanel' : undefined}
          aria-labelledby={hasMany ? tabIdFor(index) : undefined}
          onPointerMove={tilt.enabled ? tilt.onPointerMove : undefined}
          onPointerLeave={tilt.enabled ? tilt.onPointerLeave : undefined}
          onPointerDown={hasMany ? handleSwipeStart : undefined}
          onPointerUp={hasMany ? handleSwipeEnd : undefined}
          onPointerCancel={hasMany ? cancelSwipe : undefined}
          className={cn(
            'group/stage relative isolate overflow-hidden rounded-2xl border border-line bg-card shadow-card',
            hasMany && 'touch-pan-y',
          )}
        >
          {/* Showroom: floor grid, spotlight, racing stripe */}
          <span
            aria-hidden="true"
            className="bg-grid bg-grid-fade pointer-events-none absolute inset-x-0 bottom-0 top-1/3 -z-10 opacity-70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,rgb(var(--text)/0.08),transparent_65%)]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-1 w-24 bg-accent-gradient"
          />

          <motion.div
            className="relative aspect-[16/10] [transform-style:preserve-3d]"
            style={
              tilt.enabled
                ? { rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformPerspective: 1100 }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className="absolute bottom-[13%] left-1/2 h-[7%] w-[64%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-lg dark:bg-black/70"
            />
            <AnimatePresence initial={false}>
              <motion.div
                key={active.id}
                className="absolute inset-x-[5%] inset-y-[8%]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.base }}
              >
                <MediaViewer item={active} priority={index === 0} dimmed={soldOut} />
              </motion.div>
            </AnimatePresence>
            {tilt.enabled ? (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/stage:opacity-100"
                style={{ backgroundImage: tilt.glare }}
              />
            ) : null}
          </motion.div>

          {/* HUD overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5"
          >
            <span className="hud text-2xs text-muted">
              VIEW{' '}
              <span className="text-fg">
                {padNumber(index + 1)}/{padNumber(items.length)}
              </span>
            </span>
            {product.isNew && !soldOut ? (
              <span className="rounded-sm bg-danger px-1.5 py-1 font-mono text-2xs font-bold uppercase leading-none tracking-[0.14em] text-white">
                New
              </span>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 sm:inset-x-5 sm:bottom-4"
          >
            <span className="hud text-2xs text-muted">
              SCALE <span className="text-fg">{product.scale}</span>
            </span>
            {tilt.enabled ? (
              <span className="hud hidden items-center gap-1.5 text-2xs text-muted sm:inline-flex">
                <Move3d className="h-3.5 w-3.5 text-accent-ink" />
                Move to tilt
              </span>
            ) : null}
          </div>

          {soldOut ? (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded border-2 border-fg/70 bg-bg/70 px-4 py-2 font-display text-sm font-bold tracking-hud text-fg backdrop-blur-sm sm:text-base"
            >
              Sold out
            </span>
          ) : null}
        </div>

        {hasMany ? (
          <>
            <IconButton
              label="Previous image"
              icon={<ChevronLeft />}
              variant="outline"
              size="sm"
              onClick={() => select(index - 1, { announce: true })}
              aria-controls={panelId}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-surface/80 backdrop-blur-sm touch:h-11 touch:w-11 sm:left-3"
            />
            <IconButton
              label="Next image"
              icon={<ChevronRight />}
              variant="outline"
              size="sm"
              onClick={() => select(index + 1, { announce: true })}
              aria-controls={panelId}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-surface/80 backdrop-blur-sm touch:h-11 touch:w-11 sm:right-3"
            />
          </>
        ) : null}
      </div>

      {hasMany ? (
        <div
          role="tablist"
          aria-label={`${product.name} images`}
          aria-orientation="horizontal"
          ref={thumbsRef}
          className={cn(
            'scrollbar-none -mx-1 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 sm:gap-3',
            thumbsFadeEnd && 'scroll-fade-x',
          )}
        >
          {items.map((item, itemIndex) => {
            const selected = itemIndex === index;
            const thumb = item.kind === 'image' ? item.image : item.poster;
            return (
              <button
                key={item.id}
                ref={(element) => {
                  tabRefs.current[itemIndex] = element;
                }}
                type="button"
                role="tab"
                id={tabIdFor(itemIndex)}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={item.label}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(itemIndex)}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  'group/thumb relative w-24 shrink-0 snap-start overflow-hidden rounded-lg border bg-card p-1.5 transition-[border-color,background-color,transform] duration-200 ease-race active:scale-[0.97] sm:w-28',
                  selected
                    ? 'border-accent bg-card-hover shadow-glow-accent'
                    : 'border-line hover:border-metal/60 hover:bg-card-hover',
                )}
              >
                <CarImage
                  image={thumb}
                  alt=""
                  width={THUMB_WIDTH}
                  height={THUMB_HEIGHT}
                  className={cn(
                    'transition-opacity duration-200',
                    selected ? 'opacity-100' : 'opacity-70 group-hover/thumb:opacity-100',
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-300 ease-race',
                    selected ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
