import { AnimatePresence } from 'framer-motion';
import { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Portal } from '@/components/ui/Portal';
import { useHotkey } from '@/hooks/useHotkey';
import { useUiStore } from '@/store/uiStore';

/** Shortcut that toggles the palette from anywhere (Ctrl+K / ⌘K). */
export const PALETTE_HOTKEY = 'mod+k';
/** Shortcut that opens the palette when not typing in a field. */
export const PALETTE_SLASH_HOTKEY = '/';

/* The dialog (search index, option rows, car thumbnails) is code-split out of the entry chunk
   and prefetched when the browser is idle, so the first open is still instant. */
const loadDialog = () => import('./CommandPaletteDialog');
const CommandPaletteDialog = lazy(() =>
  loadDialog().then((module) => ({ default: module.CommandPaletteDialog })),
);

/**
 * Global "Search the garage…" command palette. Mounted once in `AppLayout`; open state lives
 * in `uiStore.searchOpen` (`openSearch()` from anywhere). Ctrl/⌘+K toggles it (even while
 * typing), `/` opens it when focus isn't in a text field. Closes on navigation.
 */
export function CommandPalette() {
  const open = useUiStore((state) => state.searchOpen);
  const toggleSearch = useUiStore((state) => state.toggleSearch);
  const openSearch = useUiStore((state) => state.openSearch);
  const closeSearch = useUiStore((state) => state.closeSearch);
  const location = useLocation();

  useHotkey(PALETTE_HOTKEY, () => toggleSearch(), { allowInInputs: true });
  useHotkey(PALETTE_SLASH_HOTKEY, () => openSearch(), { enabled: !open });

  useEffect(() => {
    closeSearch();
  }, [location.pathname, location.search, closeSearch]);

  // Warm the dialog chunk once the page is idle.
  useEffect(() => {
    const prefetch = (): void => {
      void loadDialog().catch(() => undefined);
    };
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(prefetch, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {open ? (
        <Portal key="command-palette">
          <Suspense fallback={null}>
            <CommandPaletteDialog onClose={closeSearch} />
          </Suspense>
        </Portal>
      ) : null}
    </AnimatePresence>
  );
}
