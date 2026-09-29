import { ChevronDown } from 'lucide-react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FIELD_ICON_PADDING, fieldClasses, type FieldSize } from './fieldStyles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: readonly SelectOption[];
  /** Disabled first option with value `""`, shown until the user picks. */
  placeholder?: string;
  invalid?: boolean;
  size?: FieldSize;
  /** Decorative icon inside the left edge. */
  leftIcon?: ReactNode;
  /** Classes for the wrapper `div` (put layout classes like `flex-1` here). */
  containerClassName?: string;
}

/** Native `<select>` with the garage field styling and a chevron (forwardRef, RHF-friendly). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options,
    placeholder,
    invalid = false,
    size = 'md',
    leftIcon,
    className,
    containerClassName,
    children,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  return (
    <div className={cn('group/field relative', containerClassName)}>
      {leftIcon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted group-focus-within/field:text-accent-ink [&_svg]:h-4 [&_svg]:w-4"
        >
          {leftIcon}
        </span>
      ) : null}
      <select
        {...rest}
        ref={ref}
        aria-invalid={invalid || ariaInvalid || undefined}
        className={fieldClasses({
          size,
          className: cn(
            'cursor-pointer appearance-none pr-10',
            leftIcon ? FIELD_ICON_PADDING[size] : null,
            className,
          ),
        })}
      >
        {placeholder !== undefined ? (
          <option value="" disabled className="bg-surface text-muted">
            {placeholder}
          </option>
        ) : null}
        {options?.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="bg-surface text-fg"
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within/field:text-accent-ink"
      />
    </div>
  );
});
