import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Chip } from '@/components/ui/Chip';
import type { ActiveFilter } from '@/hooks/useProductFilters';
import { cn } from '@/lib/cn';

export interface ActiveFilterChipsProps {
  filters: readonly ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
  /** Maps a chip to a nicer label (e.g. series id → series name). */
  getLabel?: (filter: ActiveFilter) => string;
  /**
   * Extra chips before the filters (e.g. the shop's text query). Mark each `<li>` with
   * `data-filter-chip` so focus management treats it like the filter chips.
   */
  leading?: ReactNode;
  /** Where keyboard focus goes once the last chip is gone (e.g. the results heading). */
  onFocusFallback?: () => void;
  className?: string;
}

/** Remove buttons of every chip (leading + filters), in DOM order. */
const CHIP_BUTTON_SELECTOR = '[data-filter-chip] button';
/** A removal that hasn't re-rendered within this window is dropped (no surprise focus jumps). */
const PENDING_FOCUS_TTL_MS = 3000;

interface PendingFocus {
  /** Index of the removed chip's button. */
  index: number;
  /** Chip buttons when it was removed (the URL update renders later, in a transition). */
  count: number;
  at: number;
}

/**
 * Removable chips for every active filter + "Clear all". Renders nothing when idle.
 * Removing a chip moves focus to the next chip (or the previous one); when none are left, or
 * after "Clear all", `onFocusFallback` takes it — focus never drops to `<body>`.
 */
export function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
  getLabel,
  leading,
  onFocusFallback,
  className,
}: ActiveFilterChipsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const pendingRef = useRef<PendingFocus | null>(null);

  // Runs after every render: once the removal has rendered (the chip count changed), hand focus
  // on. Event delegation below also covers `leading` chips rendered by the page.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (Date.now() - pending.at > PENDING_FOCUS_TTL_MS) {
      pendingRef.current = null;
      return;
    }
    const buttons = listRef.current
      ? Array.from(listRef.current.querySelectorAll<HTMLElement>(CHIP_BUTTON_SELECTOR))
      : [];
    if (buttons.length === pending.count) return;
    pendingRef.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const target = buttons[pending.index] ?? buttons[pending.index - 1];
    if (target) target.focus();
    else onFocusFallback?.();
  });

  const trackRemoval = (event: MouseEvent<HTMLUListElement>): void => {
    const list = listRef.current;
    if (!list || !(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button || !button.matches(CHIP_BUTTON_SELECTOR)) return;
    const buttons = Array.from(list.querySelectorAll<HTMLElement>(CHIP_BUTTON_SELECTOR));
    const index = buttons.indexOf(button);
    if (index !== -1) pendingRef.current = { index, count: buttons.length, at: Date.now() };
  };

  if (filters.length === 0 && !leading) return null;

  // The click capture only records which chip is being removed; the buttons handle activation.
  return (
    <ul
      ref={listRef}
      aria-label="Active filters"
      onClickCapture={trackRemoval}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {leading}
      {filters.map((filter) => {
        const label = getLabel?.(filter) ?? filter.label;
        return (
          <li key={filter.id} data-filter-chip="" className="max-w-full">
            <Chip
              size="md"
              variant="outline"
              onRemove={() => onRemove(filter)}
              removeLabel={`Remove ${filter.groupLabel.toLowerCase()} filter: ${label}`}
              title={`${filter.groupLabel}: ${label}`}
              className="max-w-full bg-card/60"
            >
              <span className="text-muted">{filter.groupLabel}</span>
              <span aria-hidden="true" className="px-1 text-muted">
                ·
              </span>
              {label}
            </Chip>
          </li>
        );
      })}
      <li>
        <button
          type="button"
          onClick={() => {
            onClearAll();
            onFocusFallback?.();
          }}
          className="inline-flex min-h-8 items-center rounded-sm px-1 font-mono text-[11px] font-bold uppercase tracking-hud text-accent-ink underline-offset-4 transition-opacity hover:underline hover:opacity-90 active:opacity-70"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
