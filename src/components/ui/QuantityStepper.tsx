import { Minus, Plus } from 'lucide-react';
import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Lowest allowed value (default 1). */
  min?: number;
  /** Highest allowed value (e.g. `min(stock, MAX_QTY_PER_ITEM)`). */
  max: number;
  /** Accessible name of the stepper, e.g. "Quantity of Porsche 911 GT3". */
  label: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Pending update (e.g. a garage mutation): shows a spinner and blocks input. */
  loading?: boolean;
  /** Accessible name of the − button (default "Decrease quantity"). */
  decrementLabel?: string;
  /** Accessible name of the + button (default "Increase quantity"). */
  incrementLabel?: string;
  id?: string;
  className?: string;
}

const SIZES = {
  sm: { button: 'h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5', input: 'h-8 w-10 text-sm' },
  md: { button: 'h-10 w-10 [&_svg]:h-4 [&_svg]:w-4', input: 'h-10 w-12 text-base' },
} as const;

const BUTTON =
  'grid shrink-0 place-items-center text-fg transition-[color,background-color,transform] duration-150 ease-race hover:bg-fg/[0.07] hover:text-accent-ink active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-fg disabled:active:scale-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:hover:text-fg aria-disabled:active:scale-100';

/**
 * − [ 2 ] + quantity control. Values are always clamped to `min..max`; typing commits on
 * blur / Enter, ↑/↓ step, Home/End jump, Esc reverts. Boundary buttons use `aria-disabled`
 * so keyboard focus is not lost when a limit is reached.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label,
  size = 'md',
  disabled = false,
  loading = false,
  decrementLabel = 'Decrease quantity',
  incrementLabel = 'Increase quantity',
  id,
  className,
}: QuantityStepperProps) {
  const lower = Number.isFinite(min) ? Math.floor(min) : 1;
  const upper = Number.isFinite(max) ? Math.max(lower, Math.floor(max)) : lower;
  const clamp = (next: number): number => Math.min(upper, Math.max(lower, Math.round(next)));
  const current = clamp(Number.isFinite(value) ? value : lower);
  const [draft, setDraft] = useState<string | null>(null);
  const blocked = disabled || loading;
  const atMin = current <= lower;
  const atMax = current >= upper;
  const sizes = SIZES[size];

  const commit = (next: number): void => {
    const clamped = clamp(next);
    if (clamped !== value) onChange(clamped);
  };

  const step = (delta: number): void => {
    if (blocked) return;
    setDraft(null);
    commit(current + delta);
  };

  const commitDraft = (): void => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    if (!Number.isNaN(parsed)) commit(parsed);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value.replace(/\D/g, '').slice(0, 4));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        commitDraft();
        break;
      case 'Escape':
        if (draft !== null) {
          event.preventDefault();
          setDraft(null);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        step(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        step(-1);
        break;
      case 'Home':
        event.preventDefault();
        setDraft(null);
        commit(lower);
        break;
      case 'End':
        event.preventDefault();
        setDraft(null);
        commit(upper);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="group"
      aria-label={label}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-stretch rounded-md border border-line bg-surface shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)]',
        disabled && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        aria-label={decrementLabel}
        aria-disabled={!disabled && (atMin || loading) ? true : undefined}
        disabled={disabled}
        onClick={() => {
          if (!atMin) step(-1);
        }}
        className={cn(BUTTON, sizes.button, 'rounded-l-[5px]')}
      >
        <Minus aria-hidden="true" strokeWidth={2.5} />
      </button>
      <span className="relative flex border-x border-line">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          role="spinbutton"
          aria-label={label}
          aria-valuemin={lower}
          aria-valuemax={upper}
          aria-valuenow={current}
          value={draft ?? String(current)}
          disabled={disabled}
          readOnly={loading}
          onChange={handleInputChange}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            'min-w-0 bg-transparent text-center font-mono font-bold tabular-nums text-fg focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed',
            sizes.input,
            loading && 'opacity-0',
          )}
        />
        {loading ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <Spinner size="sm" label="Updating quantity" />
          </span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={incrementLabel}
        aria-disabled={!disabled && (atMax || loading) ? true : undefined}
        disabled={disabled}
        onClick={() => {
          if (!atMax) step(1);
        }}
        className={cn(BUTTON, sizes.button, 'rounded-r-[5px]')}
      >
        <Plus aria-hidden="true" strokeWidth={2.5} />
      </button>
    </div>
  );
}
