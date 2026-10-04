import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FilterGroupProps {
  /** Unique id prefix (button `${id}-button`, panel `${id}-panel`). */
  id: string;
  title: string;
  /** Selected options in this group (orange count badge). */
  selectedCount?: number;
  /** Shows a dot instead of a count (e.g. price). */
  active?: boolean;
  defaultOpen?: boolean;
  /** Opens the group whenever this turns true (default: when it gains a selection). */
  openWhen?: boolean;
  /** Small helper line above the options. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Collapsible rail group (WAI-ARIA disclosure): an h3 button with `aria-expanded` /
 * `aria-controls`, a selected-count badge, and a labelled `role="group"` panel.
 */
export function FilterGroup({
  id,
  title,
  selectedCount = 0,
  active = false,
  defaultOpen = true,
  openWhen,
  hint,
  children,
  className,
}: FilterGroupProps) {
  const [open, setOpen] = useState(defaultOpen || selectedCount > 0 || active);
  const buttonId = `${id}-button`;
  const titleId = `${id}-title`;
  const panelId = `${id}-panel`;

  const shouldOpen = openWhen ?? (selectedCount > 0 || active);
  const previousRef = useRef(shouldOpen);
  useEffect(() => {
    if (shouldOpen && !previousRef.current) setOpen(true);
    previousRef.current = shouldOpen;
  }, [shouldOpen]);

  return (
    <section className={cn('border-b border-line last:border-b-0', className)}>
      <h3 className="font-sans normal-case tracking-normal">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="group flex min-h-12 w-full items-center gap-2.5 rounded-sm py-3 text-left transition-colors duration-150 active:opacity-80"
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-3 w-0.5 rounded-full transition-colors duration-150',
              selectedCount > 0 || active ? 'bg-accent' : 'bg-line group-hover:bg-fg/40',
            )}
          />
          <span id={titleId} className="font-mono text-xs font-bold uppercase tracking-hud text-fg">
            {title}
          </span>
          {selectedCount > 0 ? (
            <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold tabular-nums leading-none text-on-accent">
              {selectedCount}
              <span className="sr-only"> selected</span>
            </span>
          ) : active ? (
            <span className="h-1.5 w-1.5 rounded-full bg-accent">
              <span className="sr-only">(active)</span>
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'ml-auto h-4 w-4 shrink-0 text-muted transition-[transform,color] duration-200 ease-race group-hover:text-fg',
              open && 'rotate-180',
            )}
          />
        </button>
      </h3>
      <div id={panelId} role="group" aria-labelledby={titleId} hidden={!open} className="pb-5">
        {hint ? <p className="mb-3 text-xs leading-snug text-muted">{hint}</p> : null}
        {children}
      </div>
    </section>
  );
}
