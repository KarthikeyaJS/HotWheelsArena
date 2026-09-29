import { useSyncExternalStore } from 'react';

/**
 * Shared, rAF-throttled window scroll store. One set of listeners (scroll, resize and a
 * ResizeObserver for content height changes) serves every subscriber, and each hook re-renders
 * only when its own derived snapshot changes.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let progress = 0;
let scrollY = 0;
let frame = 0;
let resizeObserver: ResizeObserver | null = null;

function measure(): boolean {
  const doc = document.documentElement;
  const y = Math.max(0, window.scrollY || doc.scrollTop || 0);
  const max = Math.max(0, doc.scrollHeight - window.innerHeight);
  // 3 decimals: smooth enough for a 1440px bar, avoids re-rendering on sub-pixel noise.
  const nextProgress = max > 0 ? Math.round(Math.min(1, y / max) * 1000) / 1000 : 0;
  const changed = nextProgress !== progress || y !== scrollY;
  progress = nextProgress;
  scrollY = y;
  return changed;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function schedule(): void {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    if (measure()) notify();
  });
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (typeof ResizeObserver === 'function' && document.body) {
      resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(document.body);
    }
    if (measure()) queueMicrotask(notify);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }
  };
}

const getProgress = (): number => progress;
const getServerProgress = (): number => 0;

/**
 * Page scroll progress `0..1` (0 when the page doesn't scroll), rAF-throttled.
 * @example const p = useScrollProgress(); <div style={{ transform: `scaleX(${p})` }} />
 */
export function useScrollProgress(): number {
  return useSyncExternalStore(subscribe, getProgress, getServerProgress);
}

/**
 * Whether the window is scrolled more than `threshold` px. Re-renders only when the boolean
 * flips (cheap enough for a sticky header).
 */
export function useIsScrolled(threshold = 8): boolean {
  return useSyncExternalStore(
    subscribe,
    () => scrollY > threshold,
    () => false,
  );
}
