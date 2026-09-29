import { cn } from '@/lib/cn';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Screen-reader text (default "Loading"). Pass `''` for a purely decorative spinner. */
  label?: string;
  /** `accent` = orange wheel (default); `current` inherits the text colour (inside buttons). */
  tone?: 'accent' | 'current';
  className?: string;
}

const SIZES: Readonly<Record<SpinnerSize, string>> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

/**
 * Racing-wheel spinner: a spinning orange arc around a hub with spokes.
 * With a label it is a polite `status`; with `label=""` it is hidden from assistive tech.
 */
export function Spinner({
  size = 'md',
  label = 'Loading',
  tone = 'accent',
  className,
}: SpinnerProps) {
  const decorative = label === '';
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        tone === 'accent' ? 'text-accent' : 'text-current',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn('animate-spin', SIZES[size])}
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2.5"
        />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.25" fill="currentColor" fillOpacity="0.55" />
        <path
          d="M12 9.75V6M13.95 13.1l3.25 1.9M10.05 13.1 6.8 15"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}
