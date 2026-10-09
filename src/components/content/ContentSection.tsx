import { Link2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import { Prose } from './Prose';

export interface ContentSectionProps {
  /** Anchor id (deep-linkable: `/privacy#cookies`). Also the TOC target. */
  id: string;
  title: string;
  /** Decorative section number (`01`). */
  index?: number;
  children: ReactNode;
  /** Wrap children in `<Prose>` (default true). */
  prose?: boolean;
  className?: string;
}

/**
 * A titled, deep-linkable block of a static page: `<section id aria-labelledby>` with an
 * Orbitron h2, a permalink button and prose-styled content.
 */
export function ContentSection({
  id,
  title,
  index,
  children,
  prose = true,
  className,
}: ContentSectionProps) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        'group/section border-t border-line pt-10 first:border-t-0 first:pt-0',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} tabIndex={-1} className="text-xl leading-snug text-fg sm:text-2xl">
          {index !== undefined ? (
            <span
              aria-hidden="true"
              className="mr-3 inline-block align-[0.15em] font-mono text-xs font-semibold tracking-hud text-accent-ink sm:text-sm"
            >
              {padNumber(index)}
            </span>
          ) : null}
          {title}
        </h2>
        <Link
          to={{ hash: id }}
          aria-label={`Link to section: ${title}`}
          title="Link to this section"
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-transparent text-muted opacity-70 transition-[color,border-color,opacity] duration-150 hover:border-line hover:text-accent-ink hover:opacity-100 focus-visible:opacity-100 active:scale-95 group-hover/section:opacity-100 touch:-mr-2 touch:-mt-1.5 touch:h-11 touch:w-11 touch:opacity-100"
        >
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-5">{prose ? <Prose>{children}</Prose> : children}</div>
    </section>
  );
}
