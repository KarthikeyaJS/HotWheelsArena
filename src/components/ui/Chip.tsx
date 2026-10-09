import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ChipTone = 'neutral' | 'accent' | 'danger' | 'highlight' | 'success' | 'metal';
export type ChipVariant = 'solid' | 'soft' | 'outline';
export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipProps {
  children: ReactNode;
  /** `highlight` (yellow) is reserved for limited / vault / rare. `danger` = "hot". */
  tone?: ChipTone;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: ReactNode;
  /** Selected state of a toggle chip (`onClick` given) → `aria-pressed` + orange styling. */
  selected?: boolean;
  /** Makes the chip a toggle `<button>` (filter chips). */
  onClick?: () => void;
  /** Adds a remove (×) button. */
  onRemove?: () => void;
  /** Accessible name of the remove button (default "Remove <label>"). */
  removeLabel?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
}

const BASE =
  'inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded border font-mono font-bold uppercase leading-none tracking-[0.12em]';

const SIZES: Readonly<Record<ChipSize, string>> = {
  sm: 'h-6 gap-1 px-2 text-2xs [&_svg]:h-3 [&_svg]:w-3',
  md: 'h-7 gap-1.5 px-2.5 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5',
  lg: 'h-9 gap-2 px-3.5 text-xs [&_svg]:h-4 [&_svg]:w-4',
};

/** Literal class strings (Tailwind JIT) — every combination keeps AA contrast in both themes. */
const TONES: Readonly<Record<ChipVariant, Readonly<Record<ChipTone, string>>>> = {
  solid: {
    neutral: 'border-transparent bg-fg text-bg',
    accent: 'border-transparent bg-accent text-on-accent',
    danger: 'border-transparent bg-danger text-white',
    highlight: 'border-transparent bg-highlight text-on-highlight',
    success: 'border-transparent bg-success text-bg',
    metal: 'metal-surface border-metal/30 text-fg',
  },
  soft: {
    neutral: 'border-transparent bg-fg/[0.07] text-fg',
    accent: 'border-transparent bg-accent/10 text-accent-ink',
    danger: 'border-transparent bg-danger/10 text-danger-ink',
    highlight: 'border-highlight/25 bg-highlight/10 text-highlight-ink',
    success: 'border-success/30 bg-success/[0.06] text-fg [&_svg]:text-success',
    metal: 'border-transparent bg-metal/15 text-fg',
  },
  outline: {
    neutral: 'border-line bg-transparent text-fg',
    accent: 'border-accent/50 bg-transparent text-accent-ink',
    danger: 'border-danger/50 bg-transparent text-danger-ink',
    highlight: 'border-highlight/60 bg-transparent text-highlight-ink',
    success: 'border-success/50 bg-transparent text-success',
    metal: 'border-metal/50 bg-transparent text-fg',
  },
};

const INTERACTIVE =
  'relative cursor-pointer transition-[color,background-color,border-color,transform] duration-150 ease-race touch:after:absolute touch:after:inset-x-0 touch:after:-inset-y-2.5 hover:border-fg/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const SELECTED = 'border-accent bg-accent/10 text-accent-ink hover:border-accent';

/**
 * Tag / filter chip (mono, uppercase). Static by default; `onClick` turns it into a toggle
 * button (`aria-pressed`), `onRemove` adds an accessible × button.
 */
export function Chip({
  children,
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  icon,
  selected = false,
  onClick,
  onRemove,
  removeLabel,
  disabled = false,
  title,
  className,
}: ChipProps) {
  const toggle = onClick !== undefined;
  const leadingIcon = icon ?? (toggle && selected ? <Check strokeWidth={3} /> : null);
  const classes = cn(BASE, SIZES[size], TONES[variant][tone], selected && toggle && SELECTED);

  const inner = (
    <>
      {leadingIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {leadingIcon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </>
  );

  if (!onRemove) {
    if (toggle) {
      return (
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          title={title}
          onClick={onClick}
          className={cn(classes, INTERACTIVE, className)}
        >
          {inner}
        </button>
      );
    }
    return (
      <span title={title} className={cn(classes, className)}>
        {inner}
      </span>
    );
  }

  const resolvedRemoveLabel =
    removeLabel ?? (typeof children === 'string' ? `Remove ${children}` : 'Remove');

  return (
    <span title={title} className={cn(classes, 'pr-1', className)}>
      {toggle ? (
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onClick}
          className="inline-flex min-w-0 items-center gap-[inherit] rounded-sm disabled:cursor-not-allowed"
        >
          {inner}
        </button>
      ) : (
        inner
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={resolvedRemoveLabel}
        title={resolvedRemoveLabel}
        className="relative ml-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-sm opacity-70 touch:after:absolute touch:after:-inset-3 transition-[opacity,background-color] duration-150 hover:bg-fg/15 hover:opacity-100 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X aria-hidden="true" strokeWidth={2.5} />
      </button>
    </span>
  );
}
