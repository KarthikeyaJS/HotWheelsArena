import { CarFront } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  /** Icon element (default: a car). Pass `null` to hide it. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Call to action, e.g. `<Button to="/shop">Explore the garage</Button>`. */
  action?: ReactNode;
  /** `default` = dashed "empty parking bay" panel with grid; `plain` = no frame (inside cards). */
  variant?: 'default' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  /** Heading element for the title (default `h3`). */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
  className?: string;
}

const PADDING = {
  sm: 'px-5 py-8',
  md: 'px-6 py-14',
  lg: 'px-6 py-20',
} as const;

const TITLE_SIZES = {
  sm: 'text-base',
  md: 'text-lg sm:text-xl',
  lg: 'text-xl sm:text-2xl',
} as const;

/** Friendly empty view ("Your pit stop is empty") with optional icon and action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  size = 'md',
  titleAs: Title = 'h3',
  className,
}: EmptyStateProps) {
  const resolvedIcon = icon === undefined ? <CarFront /> : icon;
  const framed = variant === 'default';

  return (
    <div
      className={cn(
        'relative isolate flex flex-col items-center justify-center overflow-hidden text-center',
        PADDING[size],
        framed && 'rounded-xl border border-dashed border-line bg-card/40',
        className,
      )}
    >
      {framed ? (
        <div
          aria-hidden="true"
          className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-80"
        />
      ) : null}
      {resolvedIcon ? (
        <div aria-hidden="true" className="relative mb-5">
          <span className="absolute inset-0 -m-2 rounded-full border border-dashed border-accent/30" />
          <span className="relative grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-accent-ink shadow-card [&_svg]:h-6 [&_svg]:w-6">
            {resolvedIcon}
          </span>
        </div>
      ) : null}
      <Title
        className={cn(
          'font-display font-bold uppercase leading-tight tracking-display text-fg',
          TITLE_SIZES[size],
        )}
      >
        {title}
      </Title>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted sm:text-base">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>
      ) : null}
    </div>
  );
}
