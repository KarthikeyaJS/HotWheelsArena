import { motion, type Variants } from 'framer-motion';
import { SearchX, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';
import { Kbd } from '@/components/ui/Kbd';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOverlayBehavior } from '@/components/ui/useOverlayBehavior';
import { useDebounce } from '@/hooks/useDebounce';
import { useProducts } from '@/hooks/useProducts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASE_IN_OUT, EASE_OUT_EXPO, motionSafe, overlayFade } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { searchPath } from '@/config/routes';
import { buildSearchIndex } from '@/lib/search';
import { useRecentSearchStore, useRecentSearches } from '@/store/recentSearchStore';
import { PaletteOption } from './PaletteOption';
import {
  SEARCH_SUGGESTIONS,
  buildPaletteGroups,
  countPaletteResults,
  type PaletteItem,
} from './paletteModel';
import { SearchInput } from './SearchInput';

export interface CommandPaletteDialogProps {
  onClose: () => void;
}

/** Debounce for catalogue search while typing (ms). */
export const PALETTE_DEBOUNCE_MS = 150;

const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.985,
    transition: { duration: DURATION.fast, ease: EASE_IN_OUT },
  },
};

function LoadingRows() {
  return (
    <div className="space-y-2 px-3 py-2" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <Skeleton className="h-10 w-14 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 rounded-sm" />
            <Skeleton className="h-2.5 w-1/3 rounded-sm" />
          </div>
          <Skeleton className="h-4 w-14 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/**
 * The "Search the garage…" dialog (rendered by `CommandPalette` inside AnimatePresence + Portal).
 * WAI-ARIA combobox: focus stays in the input, `aria-activedescendant` points at the active
 * `role="option"`; ↑/↓ move (wrapping), Home/End jump while navigating the list, Enter selects
 * (or searches the typed text), Esc closes. Search is debounced over the cached catalogue.
 */
export function CommandPaletteDialog({ onClose }: CommandPaletteDialogProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId().replace(/:/g, '');
  const listboxId = `palette-${baseId}-listbox`;
  const hintId = `palette-${baseId}-hint`;
  const titleId = `palette-${baseId}-title`;
  const optionId = (index: number): string => `palette-${baseId}-opt-${index}`;

  const reduceMotion = useReducedMotion();
  const variants = useMemo(() => motionSafe(PANEL_VARIANTS, reduceMotion), [reduceMotion]);
  useOverlayBehavior(panelRef, { onClose, initialFocusRef: inputRef });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, PALETTE_DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();
  const typing = query.trim() !== trimmed;

  const productsQuery = useProducts();
  const products = productsQuery.data;
  const index = useMemo(() => buildSearchIndex(products ?? []), [products]);
  const recent = useRecentSearches();
  const addRecent = useRecentSearchStore((state) => state.addRecent);
  const clearRecent = useRecentSearchStore((state) => state.clearRecent);

  const groups = useMemo(
    () => buildPaletteGroups({ query: debouncedQuery, products: products ?? [], index, recent }),
    [debouncedQuery, products, index, recent],
  );
  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const resultCount = countPaletteResults(groups);
  const catalogueLoading = productsQuery.isPending && trimmed !== '';
  const noMatches =
    trimmed !== '' && !catalogueLoading && !productsQuery.isError && resultCount === 0;

  const [activeIndex, setActiveIndex] = useState(-1);
  const [listMode, setListMode] = useState(false);

  // New result set → the free-text "Search for …" option (index 0) is active; none when blank.
  useEffect(() => {
    setActiveIndex(trimmed ? 0 : -1);
  }, [trimmed, products]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const element = document.getElementById(`palette-${baseId}-opt-${activeIndex}`);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, baseId]);

  const go = (to: string, recentQuery?: string): void => {
    if (recentQuery) addRecent(recentQuery);
    onClose();
    navigate(to);
  };

  const select = (item: PaletteItem): void => {
    if (item.kind === 'search') {
      // Always search the live text, even if the debounced list is a keystroke behind.
      const live = query.trim() || item.recentQuery || '';
      go(searchPath(live), live);
      return;
    }
    const typed = query.trim();
    go(item.to, item.recentQuery ?? (typed || undefined));
  };

  const submitFreeText = (value: string): void => {
    const live = value.trim();
    if (live) go(searchPath(live), live);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.nativeEvent.isComposing) return;
    const count = items.length;
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return;
        event.preventDefault();
        setListMode(true);
        setActiveIndex((current) => (current + 1) % count);
        break;
      case 'ArrowUp':
        if (count === 0) return;
        event.preventDefault();
        setListMode(true);
        setActiveIndex((current) => (current <= 0 ? count - 1 : current - 1));
        break;
      case 'Home':
      case 'End':
        if (!listMode || count === 0) return;
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? 0 : count - 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const item = activeIndex >= 0 ? items[activeIndex] : undefined;
        if (item) select(item);
        else submitFreeText(query);
        break;
      }
      default:
        break;
    }
  };

  const liveMessage = productsQuery.isError
    ? 'Search is unavailable right now.'
    : catalogueLoading
      ? 'Loading the garage…'
      : trimmed === ''
        ? ''
        : resultCount === 0
          ? `No matches for ${trimmed}.`
          : `${resultCount} ${resultCount === 1 ? 'suggestion' : 'suggestions'} available.`;

  let flatIndex = -1;

  return (
    // Short (landscape-phone) viewports keep the full-height phone layout: no 10vh gap, no hint footer.
    <div className="fixed inset-0 z-palette flex items-start justify-center sm:px-6 sm:pt-[10vh] short:px-0 short:pt-0">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm dark:bg-bg/80"
        variants={overlayFade}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-line bg-surface shadow-card-hover outline-none sm:h-auto sm:max-h-[min(40rem,80dvh)] sm:max-w-2xl sm:rounded-xl sm:border short:h-[100dvh] short:max-h-none short:rounded-none short:border-0 short:pl-[env(safe-area-inset-left)] short:pr-[env(safe-area-inset-right)]"
      >
        <span aria-hidden="true" className="racing-stripe is-active" />
        <h2 id={titleId} className="sr-only">
          Search the garage
        </h2>

        {/* Input row */}
        <div className="group/palette relative shrink-0 border-b border-line px-2 pt-1 sm:px-3">
          <SearchInput
            ref={inputRef}
            variant="bare"
            size="lg"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setListMode(false);
            }}
            onSubmit={submitFreeText}
            loading={typing || (productsQuery.isFetching && trimmed !== '')}
            label="Search the garage"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-describedby={hintId}
            onKeyDown={handleKeyDown}
            trailing={
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-md px-1.5 py-1 text-muted transition-colors hover:bg-fg/[0.08] hover:text-fg touch:min-h-10 touch:px-2.5"
                aria-label="Close search"
              >
                {/* Touch screens have no Esc key: they always get the word. */}
                <span className="hud text-xs sm:hidden touch:inline">Close</span>
                <Kbd className="hidden sm:inline-flex touch:hidden">Esc</Kbd>
              </button>
            }
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-300 ease-race group-focus-within/palette:scale-x-100"
          />
        </div>
        <p id={hintId} className="sr-only">
          Use the up and down arrow keys to move through suggestions, Enter to open one, Escape to
          close.
        </p>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </div>

        {/* Recent-search tools live outside the listbox (listboxes may only contain options). */}
        {trimmed === '' && recent.length > 0 ? (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3">
            <p className="hud text-muted">
              {recent.length} recent {recent.length === 1 ? 'search' : 'searches'}
            </p>
            <button
              type="button"
              onClick={() => {
                clearRecent();
                inputRef.current?.focus();
              }}
              className="hud inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-accent-ink transition-colors hover:bg-accent/10"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Clear history
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
          <div id={listboxId} role="listbox" aria-label="Search suggestions">
            {groups.map((group) => (
              <div key={group.id} role="group" aria-label={group.label} className="pb-1">
                {group.heading ? (
                  <div aria-hidden="true" className="hud px-3 pb-1.5 pt-3 text-2xs text-muted">
                    {group.heading}
                  </div>
                ) : null}
                {group.items.map((item) => {
                  flatIndex += 1;
                  const position = flatIndex;
                  return (
                    <PaletteOption
                      key={item.id}
                      item={item}
                      id={optionId(position)}
                      active={position === activeIndex}
                      onSelect={select}
                      onActivate={() => setActiveIndex(position)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {catalogueLoading ? (
            <div role="status" aria-label="Loading cars">
              <div aria-hidden="true" className="hud px-3 pb-1.5 pt-3 text-2xs text-muted">
                Cars
              </div>
              <LoadingRows />
            </div>
          ) : null}

          {productsQuery.isError ? (
            <div className="px-3 py-3">
              <ErrorState
                compact
                title="Search stalled"
                error={productsQuery.error}
                onRetry={() => void productsQuery.refetch()}
                retrying={productsQuery.isFetching}
              />
            </div>
          ) : null}

          {noMatches ? (
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-line text-muted">
                <SearchX aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-sm font-bold text-fg">No cars match</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Nothing in the garage for “{trimmed}”. Check the spelling or try one of these:
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SEARCH_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="hud rounded-full border border-line px-3 py-1.5 text-fg transition-colors hover:border-accent hover:text-accent-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="safe-bottom hidden shrink-0 items-center justify-between gap-4 border-t border-line bg-bg/40 px-5 pt-3 text-muted sm:flex short:hidden">
          <p className="hud flex items-center gap-4 text-2xs">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↵</Kbd> Select
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Esc</Kbd> Close
            </span>
          </p>
          <p
            className={cn('hud text-2xs', productsQuery.isSuccess ? 'text-muted' : 'opacity-0')}
          >
            Garage index · {products?.length ?? 0} cars
          </p>
        </div>
      </motion.div>
    </div>
  );
}
