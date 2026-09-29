import { Check, Minus } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { joinIds } from './formFieldIds';
import { mergeRefs } from './mergeRefs';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  label: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
  /** Mixed state (e.g. "select all" with some selected). */
  indeterminate?: boolean;
  /** Visually hide the label text (still read by screen readers). */
  hideLabel?: boolean;
  /** Classes for the outer `<label>`. */
  containerClassName?: string;
}

/** Checkbox with label + optional description (forwardRef — works with react-hook-form). */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    invalid = false,
    indeterminate = false,
    hideLabel = false,
    id,
    disabled,
    className,
    containerClassName,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `checkbox-${generatedId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const innerRef = useRef<HTMLInputElement | null>(null);
  const setRef = useMemo(() => mergeRefs(ref, innerRef), [ref]);

  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group/checkbox inline-flex items-start gap-3',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        containerClassName,
      )}
    >
      <span className="relative mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center">
        <input
          {...rest}
          ref={setRef}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={invalid || ariaInvalid || undefined}
          aria-describedby={joinIds(descriptionId, ariaDescribedBy)}
          className={cn(
            'peer h-5 w-5 cursor-[inherit] appearance-none rounded-[5px] border-2 border-fg/30 bg-surface transition-[background-color,border-color] duration-150 ease-race checked:!border-accent checked:!bg-accent indeterminate:!border-accent indeterminate:!bg-accent group-hover/checkbox:border-fg/55 aria-[invalid=true]:border-danger',
            className,
          )}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3.5}
          className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-on-accent opacity-0 transition-[opacity,transform] duration-150 ease-race peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:opacity-0"
        />
        <Minus
          aria-hidden="true"
          strokeWidth={3.5}
          className="pointer-events-none absolute h-3.5 w-3.5 text-on-accent opacity-0 peer-indeterminate:opacity-100"
        />
      </span>
      <span className={cn('flex min-w-0 flex-col gap-0.5', hideLabel && 'sr-only')}>
        <span className="text-sm font-medium leading-snug text-fg">{label}</span>
        {description ? (
          <span id={descriptionId} className="text-xs leading-snug text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
});
