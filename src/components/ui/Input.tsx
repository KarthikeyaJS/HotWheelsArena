import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FIELD_ICON_PADDING, fieldClasses, type FieldSize } from './fieldStyles';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Error state → `aria-invalid="true"` + red border / ring. */
  invalid?: boolean;
  /** Decorative icon inside the left edge. */
  leftIcon?: ReactNode;
  /** Interactive slot inside the right edge (clear button, unit, show-password…). */
  rightSlot?: ReactNode;
  size?: FieldSize;
  /** Classes for the wrapper (only rendered when `leftIcon` / `rightSlot` is used). */
  containerClassName?: string;
}

/** Text input (forwardRef — works with react-hook-form `register`). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    invalid = false,
    leftIcon,
    rightSlot,
    size = 'md',
    className,
    containerClassName,
    type = 'text',
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const input = (
    <input
      {...rest}
      ref={ref}
      type={type}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={fieldClasses({
        size,
        className: cn(
          leftIcon ? FIELD_ICON_PADDING[size] : null,
          rightSlot ? 'pr-12' : null,
          className,
        ),
      })}
    />
  );

  if (!leftIcon && !rightSlot) return input;

  return (
    <div className={cn('group/field relative', containerClassName)}>
      {leftIcon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted transition-colors duration-150 group-focus-within/field:text-accent-ink [&_svg]:h-4 [&_svg]:w-4"
        >
          {leftIcon}
        </span>
      ) : null}
      {input}
      {rightSlot ? (
        <div className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</div>
      ) : null}
    </div>
  );
});
