import { useEffect, useState } from 'react';

/**
 * Scroll-spy for a table of contents: returns the id of the section currently being read
 * (the first section, in document order, that crosses the upper reading band of the viewport).
 * Falls back to the first id until something intersects. No-op without IntersectionObserver.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join('|');

  useEffect(() => {
    const sectionIds = key ? key.split('|') : [];
    setActive(sectionIds[0] ?? null);
    if (sectionIds.length === 0 || typeof IntersectionObserver !== 'function') return undefined;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = sectionIds.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      // A band from 15% to 40% of the viewport height counts as "being read".
      { rootMargin: '-15% 0px -60% 0px', threshold: 0 },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}
