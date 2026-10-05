/**
 * Vitest setup for the `web` (jsdom) project: jest-dom matchers, RTL cleanup and
 * small browser API shims jsdom lacks (matchMedia, IntersectionObserver, ResizeObserver).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// findBy* / waitFor default to 1s, which is too tight when the whole suite runs in parallel
// (≈70 jsdom files on every core): lazy chunks, debounced URL syncs and transition renders then
// time out intermittently. 5s keeps genuine failures fast enough while removing load flakes.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

class MockMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches = false;
  readonly media: string;
  onchange: MediaQueryList['onchange'] = null;

  constructor(media: string) {
    super();
    this.media = media;
  }

  addListener(): void {
    /* deprecated API — no-op */
  }

  removeListener(): void {
    /* deprecated API — no-op */
  }
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => new MockMediaQueryList(query);
}

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  disconnect(): void {
    /* no-op */
  }
  observe(): void {
    /* no-op */
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(): void {
    /* no-op */
  }
}

if (typeof window.IntersectionObserver !== 'function') {
  window.IntersectionObserver = MockIntersectionObserver;
}

class MockResizeObserver implements ResizeObserver {
  disconnect(): void {
    /* no-op */
  }
  observe(): void {
    /* no-op */
  }
  unobserve(): void {
    /* no-op */
  }
}

if (typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = MockResizeObserver;
}

if (
  typeof window.scrollTo !== 'function' ||
  window.scrollTo.toString().includes('notImplemented')
) {
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
}
