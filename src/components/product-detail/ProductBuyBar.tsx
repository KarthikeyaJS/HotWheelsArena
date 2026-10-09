import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { AddToCartButton, WishlistButton } from '@/components/product';
import { PriceTag } from '@/components/ui';
import { MEDIA_QUERIES, useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION } from '@/lib/animations';
import { isSoldOut } from '@/lib/product';
import type { Product } from '@/types';

/** CSS custom property the bar sets on `<html>` while shown (its height), so bottom toasts can sit above it. */
export const BOTTOM_BAR_VAR = '--hwa-bottom-bar';

export interface ProductBuyBarProps {
  product: Product;
  /** The in-page purchase actions; the bar appears once they have scrolled up out of view. */
  anchorRef: RefObject<HTMLElement>;
}

const isTextEntry = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches('input, textarea, select'));

/**
 * Phones and small tablets (< 768px) only: a compact bottom bar with the car's name, price,
 * wishlist and ADD TO CART, shown once the page's own purchase buttons have scrolled away
 * (CA-07) — so a collector who read the specs and reviews can buy without scrolling back up.
 * It hides again over the footer and while a text field has focus (the on-screen keyboard),
 * respects the bottom safe-area inset, sits under drawers/modals/toasts, and publishes its
 * height as `--hwa-bottom-bar` for the toaster. Not rendered for sold-out cars.
 */
export function ProductBuyBar({ product, anchorRef }: ProductBuyBarProps) {
  const compact = !useMediaQuery(MEDIA_QUERIES.md);
  const reduceMotion = useReducedMotion();
  const soldOut = isSoldOut(product.stock);
  const enabled = compact && !soldOut;

  const [pastActions, setPastActions] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const [typing, setTyping] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!enabled || !anchor || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      // Only once the actions are *above* the viewport (not while they are still below it).
      setPastActions(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef, enabled]);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!enabled || !footer || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) =>
      setOverFooter(Boolean(entry?.isIntersecting)),
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onFocusIn = (event: FocusEvent): void => setTyping(isTextEntry(event.target));
    const onFocusOut = (): void => setTyping(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [enabled]);

  const visible = enabled && pastActions && !overFooter && !typing;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!visible || !bar) {
      root.style.removeProperty(BOTTOM_BAR_VAR);
      return undefined;
    }
    root.style.setProperty(BOTTOM_BAR_VAR, `${bar.offsetHeight}px`);
    return () => {
      root.style.removeProperty(BOTTOM_BAR_VAR);
    };
  }, [visible]);

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="buy-bar"
          ref={barRef}
          role="region"
          aria-label={`Quick buy: ${product.name}`}
          initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
          transition={{ duration: DURATION.fast, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-header border-t border-line bg-surface/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 shadow-[0_-12px_32px_-16px_rgb(0_0_0/0.45)] backdrop-blur-md md:hidden"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-0.5 w-20 bg-accent-gradient"
          />
          <div className="mx-auto flex max-w-xl items-center gap-2.5">
            <div className="flex min-w-[5rem] flex-1 flex-col gap-1">
              <p className="truncate font-display text-xs font-bold uppercase tracking-display text-fg">
                {product.name}
              </p>
              <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
            </div>
            <WishlistButton
              product={product}
              size="md"
              iconVariant="outline"
              className="h-11 w-11 shrink-0"
            />
            <AddToCartButton
              product={product}
              size="md"
              compactLabel
              label={
                <>
                  <span className="max-[379px]:hidden">Add to cart</span>
                  <span className="min-[380px]:hidden">Cart</span>
                </>
              }
              className="shrink-0"
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
