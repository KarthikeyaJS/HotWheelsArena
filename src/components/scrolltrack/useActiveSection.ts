import { useEffect, useState } from 'react';
import { pickActiveIndex } from './trackGeometry';

/**
 * Scroll-spy for the scroll-track stations: returns the id of the section currently "in view"
 * (its top has passed `thresholdRatio` of the viewport height). rAF-throttled scroll/resize
 * listeners. Pass a stable `ids` array (module constant or memoized).
 */
export function useActiveSection(ids: readonly string[], thresholdRatio = 0.42): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) return undefined;
    let frame = 0;

    const measure = (): void => {
      frame = 0;
      const tops = ids.map(
        (id) =>
          document.getElementById(id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      );
      const scroller = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= scroller.scrollHeight - 4;
      const index = pickActiveIndex(tops, window.innerHeight * thresholdRatio, atBottom);
      setActive(ids[index] ?? null);
    };
    const schedule = (): void => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ids, thresholdRatio]);

  return active;
}
