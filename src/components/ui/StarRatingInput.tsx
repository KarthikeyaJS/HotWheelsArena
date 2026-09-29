import { forwardRef, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { cn } from '@/lib/cn';
import { StarShape } from './StarShape';

export interface StarRatingInputProps {
  /** Selected rating 1–5 (0 = none yet). */
  value: number;
  onChange: (value: number) => void;
  /** Group label, e.g. "Your rating". */
  label: string;
  /** Radio group name (auto-generated when omitted). */
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  size?: 'md' | 'lg';
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  /** Show the word for the hovered / selected rating ("Great"). Default true. */
  showValueLabel?: boolean;
  /** Ids of hint / error text (e.g. from `FormField`'s render props). */
  'aria-describedby'?: string;
  className?: string;
}

const STARS = [1, 2, 3, 4, 5] as const;
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Legendary'] as const;

const SIZES = {
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
} as const;

/**
 * Star rating picker with radio-group semantics: native radios (one per star) inside a
 * `role="radiogroup"`; ←/→/↑/↓ change the rating, Home/End jump to 1/5, Space selects.
 * The forwarded ref points at the focusable radio (for react-hook-form `Controller` focus).
 */
export const StarRatingInput = forwardRef<HTMLInputElement, StarRatingInputProps>(
  function StarRatingInput(
    {
      value,
      onChange,
      label,
      name,
      disabled = false,
      invalid = false,
      required = false,
      size = 'md',
      hideLabel = false,
      showValueLabel = true,
      'aria-describedby': ariaDescribedBy,
      className,
    },
    ref,
  ) {
    const generatedId = useId();
    const groupName = name ?? `rating-${generatedId}`;
    const labelId = `${groupName}-label`;
    const [hovered, setHovered] = useState<number | null>(null);
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const current = Math.min(5, Math.max(0, Math.round(value)));
    const preview = hovered ?? current;
    const focusTarget = current > 0 ? current : 1;

    const select = (next: number): void => {
      const clamped = Math.min(5, Math.max(1, next));
      if (clamped !== current) onChange(clamped);
      inputsRef.current[clamped - 1]?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
      if (disabled) return;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          select(current + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          select(current - 1);
          break;
        case 'Home':
          event.preventDefault();
          select(1);
          break;
        case 'End':
          event.preventDefault();
          select(5);
          break;
        default:
          break;
      }
    };

    const assignRef =
      (star: number): Ref<HTMLInputElement> =>
      (element: HTMLInputElement | null) => {
        inputsRef.current[star - 1] = element;
        if (star !== focusTarget) return;
        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
      };

    return (
      <div className={cn('inline-flex flex-col gap-2', className)}>
        <span id={labelId} className={cn('text-sm font-medium text-fg', hideLabel && 'sr-only')}>
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="ml-0.5 text-accent-ink">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-disabled={disabled || undefined}
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
            {STARS.map((star) => {
              const lit = preview >= star;
              return (
                <label
                  key={star}
                  className={cn(
                    'group/star relative inline-flex p-0.5',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                  onMouseEnter={() => {
                    if (!disabled) setHovered(star);
                  }}
                >
                  <input
                    ref={assignRef(star)}
                    type="radio"
                    name={groupName}
                    value={star}
                    checked={current === star}
                    disabled={disabled}
                    onChange={() => onChange(star)}
                    onKeyDown={handleKeyDown}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'block rounded-sm transition-transform duration-150 ease-race peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                      !disabled && 'group-hover/star:scale-110 group-active/star:scale-95',
                    )}
                  >
                    <StarShape
                      className={cn(
                        SIZES[size],
                        'transition-colors duration-150',
                        lit
                          ? 'text-accent drop-shadow-[0_0_6px_rgb(var(--accent)/0.45)]'
                          : invalid
                            ? 'text-danger/35'
                            : 'text-fg/20',
                        disabled && 'opacity-50',
                      )}
                    />
                  </span>
                  <span className="sr-only">
                    {star} {star === 1 ? 'star' : 'stars'}, {RATING_WORDS[star]}
                  </span>
                </label>
              );
            })}
          </div>
          {showValueLabel ? (
            <span
              aria-hidden="true"
              className={cn('hud min-w-[6.5rem]', preview > 0 ? 'text-fg' : 'text-muted')}
            >
              {preview > 0 ? RATING_WORDS[preview] : 'Tap to rate'}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);
