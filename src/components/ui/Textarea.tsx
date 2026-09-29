import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { fieldClasses } from './fieldStyles';
import { mergeRefs } from './mergeRefs';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error state → `aria-invalid="true"` + red border / ring. */
  invalid?: boolean;
  /** Character counter under the field (`120 / 1,000` with `maxLength`). */
  showCount?: boolean;
  /** Classes for the wrapper (only rendered with `showCount`). */
  containerClassName?: string;
}

function lengthOf(value: TextareaHTMLAttributes<HTMLTextAreaElement>['value']): number {
  if (value === undefined || value === null) return 0;
  return Array.isArray(value) ? value.join(',').length : String(value).length;
}

/** Multi-line input (forwardRef — works with react-hook-form `register`). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    invalid = false,
    showCount = false,
    className,
    containerClassName,
    maxLength,
    onChange,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useMemo(() => mergeRefs(ref, innerRef), [ref]);
  const [typedLength, setTypedLength] = useState(() => lengthOf(rest.defaultValue));
  const isControlled = rest.value !== undefined;
  // Uncontrolled fields (react-hook-form `register`) can be changed outside React (reset /
  // setValue), so the counter reads the live DOM value; typing re-renders via `typedLength`.
  const length = isControlled
    ? lengthOf(rest.value)
    : (innerRef.current?.value.length ?? typedLength);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    if (showCount && !isControlled) setTypedLength(event.target.value.length);
    onChange?.(event);
  };

  const textarea = (
    <textarea
      {...rest}
      ref={setRef}
      maxLength={maxLength}
      aria-invalid={invalid || ariaInvalid || undefined}
      onChange={handleChange}
      className={fieldClasses({ multiline: true, className })}
    />
  );

  if (!showCount) return textarea;

  const nearLimit = maxLength !== undefined && length >= maxLength * 0.9;
  const atLimit = maxLength !== undefined && length >= maxLength;

  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {textarea}
      <p
        className={cn(
          'self-end font-mono text-[11px] tabular-nums',
          atLimit ? 'text-danger-ink' : nearLimit ? 'text-accent-ink' : 'text-muted',
        )}
      >
        {formatNumber(length)}
        {maxLength !== undefined ? ` / ${formatNumber(maxLength)}` : ''}
        <span className="sr-only"> characters</span>
      </p>
    </div>
  );
});
