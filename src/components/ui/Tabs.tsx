import { LayoutGroup, motion } from 'framer-motion';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SPRING_SNAPPY } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { CountBadge } from './CountBadge';
import { tabId, tabPanelId } from './tabIds';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  /** Count shown after the label (hidden at 0). */
  badge?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: ReadonlyArray<TabItem<T>>;
  /** Selected tab id. */
  value: T;
  onChange: (id: T) => void;
  /** Accessible name of the tablist. */
  label: string;
  /** Prefix for tab / panel ids (`${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}`). */
  idPrefix: string;
  /** `underline` = orange sliding underline (default); `pill` = sliding orange pill. */
  variant?: 'underline' | 'pill';
  size?: 'sm' | 'md';
  /** `automatic` (default): arrows select immediately; `manual`: arrows move focus, Enter/Space select. */
  activation?: 'automatic' | 'manual';
  /** Stretch tabs to fill the row. */
  fullWidth?: boolean;
  className?: string;
}

const SIZES = {
  underline: { sm: 'h-10 px-3 text-[11px]', md: 'h-12 px-4 text-xs' },
  pill: { sm: 'h-8 px-3 text-[11px]', md: 'h-9 px-4 text-xs' },
} as const;

/**
 * Accessible tabs (WAI-ARIA tabs pattern): roving tabindex, ←/→/Home/End (disabled tabs are
 * skipped), `aria-selected` / `aria-controls`, and an orange indicator that slides between tabs
 * (framer `layoutId`; static for reduced-motion users). Pair each tab with a `<TabPanel>`.
 */
export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
  variant = 'underline',
  size = 'md',
  activation = 'automatic',
  fullWidth = false,
  className,
}: TabsProps<T>) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [focusedId, setFocusedId] = useState<T | null>(null);
  const enabled = items.filter((item) => !item.disabled);
  const selectedEnabled = enabled.find((item) => item.id === value);
  const rovingId =
    activation === 'manual' && focusedId !== null && enabled.some((item) => item.id === focusedId)
      ? focusedId
      : (selectedEnabled?.id ?? enabled[0]?.id);
  const isPill = variant === 'pill';

  const focusTab = (id: T): void => {
    tabRefs.current.get(id)?.focus();
    if (activation === 'automatic') {
      if (id !== value) onChange(id);
    } else {
      setFocusedId(id);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentId: T): void => {
    if (enabled.length === 0) return;
    const index = enabled.findIndex((item) => item.id === currentId);
    let next: TabItem<T> | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = enabled[(index + 1) % enabled.length];
        break;
      case 'ArrowLeft':
        next = enabled[(index - 1 + enabled.length) % enabled.length];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next) focusTab(next.id);
  };

  return (
    <LayoutGroup id={idPrefix}>
      {/* Scroll wrapper with inline-size containment: a long tab row scrolls horizontally
          instead of forcing its min-content width onto grid / flex ancestors. */}
      <div className={cn('scrollbar-none w-full overflow-x-auto [contain:inline-size]', className)}>
        <div
          role="tablist"
          aria-label={label}
          aria-orientation="horizontal"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocusedId(null);
          }}
          className={cn(
            isPill
              ? 'inline-flex w-max gap-1 rounded-full border border-line bg-surface p-1'
              : 'flex w-max min-w-full gap-1 border-b border-line',
            fullWidth && 'w-full',
          )}
        >
          {items.map((item) => {
            const selected = item.id === value;
            return (
              <button
                key={item.id}
                ref={(element) => {
                  if (element) tabRefs.current.set(item.id, element);
                  else tabRefs.current.delete(item.id);
                }}
                type="button"
                role="tab"
                id={tabId(idPrefix, item.id)}
                aria-selected={selected}
                aria-controls={tabPanelId(idPrefix, item.id)}
                tabIndex={item.id === rovingId ? 0 : -1}
                disabled={item.disabled}
                onClick={() => onChange(item.id)}
                onKeyDown={(event) => handleKeyDown(event, item.id)}
                onFocus={() => {
                  if (activation === 'manual') setFocusedId(item.id);
                }}
                className={cn(
                  'group/tab relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-display font-bold uppercase tracking-display transition-colors duration-200 ease-race focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-40',
                  SIZES[variant][size],
                  isPill ? 'rounded-full' : 'rounded-t-md',
                  fullWidth && 'flex-1',
                  selected
                    ? isPill
                      ? 'text-on-accent'
                      : 'text-fg'
                    : 'text-muted hover:text-fg enabled:hover:bg-fg/[0.04]',
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId={`${idPrefix}-tab-indicator`}
                    aria-hidden="true"
                    transition={SPRING_SNAPPY}
                    className={
                      isPill
                        ? 'absolute inset-0 rounded-full bg-accent shadow-[0_6px_18px_-8px_rgb(var(--accent)/0.8)]'
                        : 'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent shadow-[0_0_12px_rgb(var(--accent)/0.65)]'
                    }
                  />
                ) : null}
                {item.icon ? (
                  <span aria-hidden="true" className="relative inline-flex [&_svg]:h-4 [&_svg]:w-4">
                    {item.icon}
                  </span>
                ) : null}
                <span className="relative">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <CountBadge
                    count={item.badge}
                    size="sm"
                    tone={selected && !isPill ? 'accent' : 'neutral'}
                    className="relative ring-0"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}
