import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';
import { ShopBreadcrumbs, type BreadcrumbItem } from './ShopBreadcrumbs';

export interface ShopHeaderProps {
  breadcrumbs: readonly BreadcrumbItem[];
  eyebrow: string;
  /** Page title (the page's only h1). */
  title: ReactNode;
  description?: ReactNode;
  /** Right column on desktop (e.g. the telemetry HUD); stacks under the title on mobile. */
  aside?: ReactNode;
  /** Full-width row under the title (e.g. the search field or view tabs). */
  children?: ReactNode;
  className?: string;
}

/**
 * Page header for the shop and search pages: breadcrumbs, HUD eyebrow, Orbitron h1, racing
 * microcopy, an optional telemetry panel, over a faint garage-floor grid with an orange
 * racing stripe on the left edge.
 */
export function ShopHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
}: ShopHeaderProps) {
  return (
    <header className={cn('relative isolate overflow-hidden border-b border-line', className)}>
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-32 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />
      <Container className="pb-6 pt-6 sm:pt-8 lg:pb-8 lg:pt-10">
        <ShopBreadcrumbs items={breadcrumbs} />
        <div className="mt-5 grid gap-6 lg:mt-7 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="relative min-w-0 lg:col-span-8">
            <span
              aria-hidden="true"
              className="absolute -left-4 top-1 hidden h-[calc(100%-0.5rem)] w-1 rounded-full bg-gradient-to-b from-accent via-accent/40 to-transparent sm:-left-6 sm:block lg:-left-8"
            />
            <SectionHeading
              as="h1"
              eyebrow={eyebrow}
              title={title}
              description={description}
              size="lg"
              titleClassName="text-balance break-words"
            />
          </div>
          {aside ? <div className="min-w-0 lg:col-span-4">{aside}</div> : null}
        </div>
        {children ? <div className="mt-6 lg:mt-8">{children}</div> : null}
      </Container>
    </header>
  );
}
