import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';
import type { BreadcrumbItem } from './Breadcrumbs';
import { LastUpdated } from './LastUpdated';
import { PageHeader } from './PageHeader';
import { TableOfContents, type TocItem } from './TableOfContents';
import { useHashScroll } from './useHashScroll';

export interface ContentPageProps {
  /** Trail ending with the current page. */
  breadcrumbs: readonly BreadcrumbItem[];
  /** Mono HUD eyebrow. */
  eyebrow: string;
  eyebrowIcon?: ReactNode;
  /** The page's `<h1>`. */
  title: ReactNode;
  /** Lead paragraph under the title (inline content). */
  lead?: ReactNode;
  /** ISO date (`2026-10-01`) → "Last updated" line in the header. */
  lastUpdated?: string;
  /** Sticky table of contents (desktop) + "On this page" disclosure (mobile). */
  toc?: readonly TocItem[];
  /** Header right column (HUD facts, contact card…). */
  headerAside?: ReactNode;
  /** Extra header row under the lead (CTA buttons…). */
  headerMeta?: ReactNode;
  /** `prose` = reading width column (default when there is no TOC); `wide` = full container. */
  width?: 'prose' | 'wide';
  children: ReactNode;
  className?: string;
}

/**
 * Layout for static pages (About, FAQ, Shipping & Returns, Privacy, Terms, Contact): header with
 * breadcrumbs, HUD eyebrow, h1, lead and "last updated"; then the body with an optional sticky
 * table of contents. Handles `#section` deep links on first load.
 */
export function ContentPage({
  breadcrumbs,
  eyebrow,
  eyebrowIcon,
  title,
  lead,
  lastUpdated,
  toc,
  headerAside,
  headerMeta,
  width,
  children,
  className,
}: ContentPageProps) {
  useHashScroll();
  const hasToc = Boolean(toc && toc.length > 0);
  const resolvedWidth = width ?? (hasToc ? 'wide' : 'prose');

  const meta =
    lastUpdated || headerMeta ? (
      <div className="flex flex-col gap-5">
        {headerMeta}
        {lastUpdated ? <LastUpdated date={lastUpdated} /> : null}
      </div>
    ) : undefined;

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        eyebrow={eyebrow}
        eyebrowIcon={eyebrowIcon}
        title={title}
        lead={lead}
        meta={meta}
        aside={headerAside}
      />
      <Container className={cn('py-10 lg:py-16', className)}>
        {hasToc && toc ? (
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <TableOfContents items={toc} variant="disclosure" className="lg:hidden" />
            <aside className="hidden lg:col-span-3 lg:block">
              <TableOfContents
                items={toc}
                className="sticky top-[calc(var(--header-height)+2rem)] max-h-[calc(100vh-var(--header-height)-4rem)] overflow-y-auto pb-4"
              />
            </aside>
            <div className="flex min-w-0 flex-col gap-10 lg:col-span-9">{children}</div>
          </div>
        ) : (
          <div
            className={cn(
              'flex min-w-0 flex-col gap-10',
              resolvedWidth === 'prose' && 'mx-auto max-w-3xl',
            )}
          >
            {children}
          </div>
        )}
      </Container>
    </>
  );
}
