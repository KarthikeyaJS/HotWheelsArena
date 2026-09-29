import { AlertCircle } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fieldErrorId, fieldHintId, joinIds } from './formFieldIds';

export interface RadioOption<T extends string = string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string = string> {
  name: string;
  /** Selected value (`null`/`undefined` = nothing selected yet). */
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: ReadonlyArray<RadioOption<T>>;
  /** Group label (`<legend>`). */
  legend: string;
  orientation?: 'vertical' | 'horizontal';
  /** `card` = large selectable tiles (payment methods, shipping). */
  variant?: 'default' | 'card';
  /** Grid columns for `variant="card"` on ≥ sm screens. */
  columns?: 1 | 2 | 3;
  hideLegend?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
}

const CARD_COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
} as const;

/**
 * Native radio group in a `<fieldset>` (arrow keys move the selection natively). `card` variant
 * renders tiles with an orange selected state; the focus ring is drawn around the whole tile.
 */
export function RadioGroup<T extends string = string>({
  name,
  value,
  onChange,
  options,
  legend,
  orientation = 'vertical',
  variant = 'default',
  columns = 1,
  hideLegend = false,
  disabled = false,
  invalid = false,
  required = false,
  hint,
  error,
  className,
}: RadioGroupProps<T>) {
  const baseId = `radio-${useId()}`;
  const isInvalid = invalid || Boolean(error);
  const describedBy = joinIds(hint ? fieldHintId(baseId) : null, error ? fieldErrorId(baseId) : null);
  const isCard = variant === 'card';

  return (
    <fieldset className={cn('min-w-0', className)} disabled={disabled}>
      <legend className={cn('mb-3 text-sm font-medium text-fg', hideLegend && 'sr-only')}>
        {legend}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-accent-ink">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </legend>

      <div
        className={cn(
          isCard
            ? cn('grid gap-3', CARD_COLUMNS[columns])
            : orientation === 'horizontal'
              ? 'flex flex-wrap gap-x-6 gap-y-3'
              : 'flex flex-col gap-3',
        )}
      >
        {options.map((option) => {
          const checked = value === option.value;
          const optionDisabled = disabled || option.disabled === true;
          const input = (
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              disabled={optionDisabled}
              required={required}
              aria-describedby={describedBy}
              onChange={() => onChange(option.value)}
              className={
                isCard
                  ? 'peer sr-only'
                  : cn(
                      'peer h-5 w-5 cursor-[inherit] appearance-none rounded-full border-2 bg-surface transition-colors duration-150 checked:!border-accent',
                      isInvalid ? 'border-danger' : 'border-fg/30 group-hover/radio:border-fg/55',
                    )
              }
            />
          );

          if (isCard) {
            return (
              <label
                key={option.value}
                className={cn(
                  'group/radio relative flex items-start gap-3 rounded-lg border p-4 transition-[border-color,background-color,box-shadow] duration-150 ease-race',
                  checked
                    ? 'border-accent bg-accent/[0.06] shadow-[0_0_0_1px_rgb(var(--accent)/0.55)]'
                    : 'border-line bg-card',
                  optionDisabled
                    ? 'cursor-not-allowed opacity-55'
                    : cn('cursor-pointer', !checked && 'hover:border-fg/30 hover:bg-card-hover'),
                  isInvalid && !checked && 'border-danger/60',
                )}
              >
                {input}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                />
                {checked ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-3 left-0 w-1 rounded-r bg-accent"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150',
                    checked ? 'border-accent' : 'border-fg/30',
                  )}
                >
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full bg-accent transition-transform duration-150 ease-race',
                      checked ? 'scale-100' : 'scale-0',
                    )}
                  />
                </span>
                {option.icon ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-md border transition-colors duration-150 [&_svg]:h-[18px] [&_svg]:w-[18px]',
                      checked
                        ? 'border-accent/40 bg-accent/10 text-accent-ink'
                        : 'border-line bg-surface text-muted',
                    )}
                  >
                    {option.icon}
                  </span>
                ) : null}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold leading-snug text-fg">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs leading-snug text-muted">{option.description}</span>
                  ) : null}
                </span>
              </label>
            );
          }

          return (
            <label
              key={option.value}
              className={cn(
                'group/radio inline-flex items-start gap-3',
                optionDisabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
              )}
            >
              <span className="relative mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center">
                {input}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute h-2.5 w-2.5 scale-0 rounded-full bg-accent transition-transform duration-150 ease-race peer-checked:scale-100"
                />
              </span>
              {option.icon ? (
                <span aria-hidden="true" className="mt-0.5 text-muted [&_svg]:h-4 [&_svg]:w-4">
                  {option.icon}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium leading-snug text-fg">{option.label}</span>
                {option.description ? (
                  <span className="text-xs leading-snug text-muted">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {hint ? (
        <p id={fieldHintId(baseId)} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={fieldErrorId(baseId)}
          className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger-ink"
        >
          <AlertCircle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
