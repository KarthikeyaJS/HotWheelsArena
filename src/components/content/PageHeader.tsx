import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

export type PageHeaderTone = 'accent' | 'highlight';

export interface PageHeaderProps {
  breadcrumbs: readonly BreadcrumbItem[];
  /** Mono HUD line above the title. */
  eyebrow: string;
  /** Decorative icon before the eyebrow text. */
  eyebrowIcon?: ReactNode;
  /** The page's only `<h1>`. */
  title: ReactNode;
  /** Id for the `<h1>` (for `aria-labelledby`). */
  titleId?: string;
  /** Lead paragraph (inline content). */
  lead?: ReactNode;
  /** Extra row under the lead (e.g. "last updated", CTA buttons). */
  meta?: ReactNode;
  /** Right column on desktop (HUD panel, stats); stacks under the text on mobile. */
  aside?: ReactNode;
  /** Full-width row under the heading block. */
  children?: ReactNode;
  /**
   * `accent` = orange stripe + glow (default). `highlight` = the vault's restrained yellow
   * (limited / rare pages only).
   */
  tone?: PageHeaderTone;
  className?: string;
}

const TONE = {
  accent: {
    eyebrow: 'text-accent-ink',
    tick: 'bg-accent',
    tickSoft: 'bg-accent/60',
    stripe: 'from-accent via-accent/40',
    glow: 'bg-accent/10',
  },
  highlight: {
    eyebrow: 'text-highlight-ink',
    tick: 'bg-highlight',
    tickSoft: 'bg-highlight/60',
    stripe: 'from-highlight via-highlight/40',
    glow: 'bg-highlight/10',
  },
} as const;

/**
 * Page header shared by the content, vault and collections pages: breadcrumbs, HUD eyebrow,
 * Orbitron h1, lead copy and an optional HUD aside over a faint garage-floor grid with a racing
 * stripe on the left edge.
 */
export function PageHeader({
  breadcrumbs,
  eyebrow,
  eyebrowIcon,
  title,
  titleId,
  lead,
  meta,
  aside,
  children,
  tone = 'accent',
  className,
}: PageHeaderProps) {
  const t = TONE[tone];
  return (
    <header className={cn('relative isolate overflow-hidden border-b border-line', className)}>
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden="true"
        className={cn('absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full blur-3xl', t.glow)}
      />
      <Container className="pb-8 pt-6 sm:pt-8 lg:pb-12 lg:pt-10">
        <Breadcrumbs items={breadcrumbs} />
        <div
          className={cn(
            'mt-6 grid gap-8 lg:mt-8 lg:items-end lg:gap-10',
            aside ? 'lg:grid-cols-12' : undefined,
          )}
        >
          <div className={cn('relative min-w-0', aside ? 'lg:col-span-7' : 'max-w-4xl')}>
            <span
              aria-hidden="true"
              className={cn(
                'absolute -left-4 top-1 hidden h-[calc(100%-0.5rem)] w-1 rounded-full bg-gradient-to-b to-transparent sm:-left-6 sm:block lg:-left-8',
                t.stripe,
              )}
            />
            <p
              className={cn(
                'flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.2em]',
                t.eyebrow,
              )}
            >
              <span aria-hidden="true" className="flex items-center gap-1">
                <span className={cn('h-0.5 w-6', t.tick)} />
                <span className={cn('h-0.5 w-1.5', t.tickSoft)} />
              </span>
              {eyebrowIcon ? (
                <span aria-hidden="true" className="[&_svg]:h-3.5 [&_svg]:w-3.5">
                  {eyebrowIcon}
                </span>
              ) : null}
              <span>{eyebrow}</span>
            </p>
            <h1
              id={titleId}
              className="mt-3 break-words text-[clamp(1.25rem,6.5vw,1.875rem)] text-fg sm:text-4xl lg:text-5xl"
            >
              {title}
            </h1>
            {lead ? <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">{lead}</p> : null}
            {meta ? <div className="mt-5">{meta}</div> : null}
          </div>
          {aside ? <div className="min-w-0 lg:col-span-5">{aside}</div> : null}
        </div>
        {children ? <div className="mt-8">{children}</div> : null}
      </Container>
    </header>
  );
}
