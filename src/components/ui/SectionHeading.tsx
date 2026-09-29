import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';

export type SectionHeadingSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SectionHeadingProps {
  /** Mono HUD eyebrow, e.g. `CHOOSE YOUR RIDE` (or a full `// 02 — CHOOSE YOUR RIDE`). */
  eyebrow?: string;
  /** Section number → decorative `// 02 —` prefix before the eyebrow. */
  index?: number;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned slot on desktop (below the text on mobile), e.g. a "View all" button. */
  action?: ReactNode;
  /** Heading level (default `h2`). */
  as?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center';
  /** Heading id (use it for `aria-labelledby` on the section). */
  id?: string;
  /** Title scale; defaults by level (h1 → lg, h2 → md, h3 → sm). */
  size?: SectionHeadingSize;
  className?: string;
  titleClassName?: string;
}

const TITLE_SIZES: Readonly<Record<SectionHeadingSize, string>> = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-3xl lg:text-4xl',
  lg: 'text-3xl sm:text-4xl lg:text-5xl',
  xl: 'text-4xl sm:text-5xl lg:text-6xl',
};

const DEFAULT_SIZE: Readonly<Record<'h1' | 'h2' | 'h3', SectionHeadingSize>> = {
  h1: 'lg',
  h2: 'md',
  h3: 'sm',
};

/**
 * Section header: small orange HUD eyebrow with a racing tick, big Orbitron title, optional
 * description and an action slot.
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  action,
  as: Heading = 'h2',
  align = 'left',
  id,
  size,
  className,
  titleClassName,
}: SectionHeadingProps) {
  const centered = align === 'center';
  const hasEyebrow = Boolean(eyebrow) || index !== undefined;

  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        centered ? 'items-center text-center' : action && 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className={cn('flex min-w-0 max-w-3xl flex-col gap-3', centered && 'items-center')}>
        {hasEyebrow ? (
          <p className="eyebrow flex items-center gap-3">
            <span aria-hidden="true" className="flex items-center gap-1">
              <span className="h-0.5 w-6 bg-accent" />
              <span className="h-0.5 w-1.5 bg-accent/60" />
            </span>
            <span>
              {index !== undefined ? (
                <span aria-hidden="true">{`// ${padNumber(index)} — `}</span>
              ) : null}
              {eyebrow}
            </span>
          </p>
        ) : null}
        <Heading id={id} className={cn('text-fg', TITLE_SIZES[size ?? DEFAULT_SIZE[Heading]], titleClassName)}>
          {title}
        </Heading>
        {description ? (
          <p className={cn('max-w-2xl text-base text-muted sm:text-lg', centered && 'mx-auto')}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}
