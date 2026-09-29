import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fieldDescribedBy, fieldErrorId, fieldHintId } from './formFieldIds';

/** Props handed to a render-function child so the control can wire up its ARIA attributes. */
export interface FormFieldRenderProps {
  /** The control id (= `htmlFor`). */
  id: string;
  /** Pass to the control's `aria-describedby` (hint and/or error ids). */
  describedBy: string | undefined;
  /** Pass to the control's `invalid` / `aria-invalid`. */
  invalid: boolean;
  required: boolean;
}

export interface FormFieldProps {
  label: string;
  /** Id of the control inside (hint id `${htmlFor}-hint`, error id `${htmlFor}-error`). */
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Shows a muted "(optional)" tag. */
  optional?: boolean;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  /** Small slot on the label row's right (e.g. a "Use saved address" link). */
  labelAction?: ReactNode;
  className?: string;
  /** The control, or a render function receiving `{ id, describedBy, invalid, required }`. */
  children: ReactNode | ((field: FormFieldRenderProps) => ReactNode);
}

/**
 * Label + control + hint + error. The control must use `id={htmlFor}` and set
 * `aria-describedby` / `aria-invalid` — easiest via the render-function form:
 *
 *   <FormField label="Pincode" htmlFor="pincode" error={errors.pincode?.message}>
 *     {(f) => <Input id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} {...register('pincode')} />}
 *   </FormField>
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  optional = false,
  hideLabel = false,
  labelAction,
  className,
  children,
}: FormFieldProps) {
  const invalid = Boolean(error);
  const describedBy = fieldDescribedBy(htmlFor, { hint, error });

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className={cn('flex items-baseline justify-between gap-3', hideLabel && !labelAction && 'sr-only')}>
        <label htmlFor={htmlFor} className={cn('text-sm font-medium text-fg', hideLabel && 'sr-only')}>
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="ml-0.5 text-accent-ink">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
          {optional && !required ? (
            <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>
          ) : null}
        </label>
        {labelAction}
      </div>
      {typeof children === 'function'
        ? children({ id: htmlFor, describedBy, invalid, required })
        : children}
      {hint ? (
        <p id={fieldHintId(htmlFor)} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={fieldErrorId(htmlFor)}
          className="flex items-start gap-1.5 text-xs font-medium text-danger-ink"
        >
          <AlertCircle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
