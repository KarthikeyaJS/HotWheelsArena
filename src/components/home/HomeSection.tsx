import type { HTMLAttributes, ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';
import { sectionHeadingId, type HomeSectionId } from './homeSections';

export interface HomeSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'id'> {
  id: HomeSectionId;
  children: ReactNode;
  /** Full-bleed decorative layer rendered behind the container (aria-hidden by the caller). */
  decoration?: ReactNode;
  containerClassName?: string;
}

/**
 * Home page section shell: `<section id aria-labelledby="<id>-title">` with the standard
 * vertical rhythm and content container. Programmatically focusable (`tabIndex=-1`) so the
 * hero's "Explore Collection" CTA can move keyboard focus to it after scrolling.
 */
export function HomeSection({
  id,
  children,
  decoration,
  className,
  containerClassName,
  ...rest
}: HomeSectionProps) {
  return (
    <section
      {...rest}
      id={id}
      aria-labelledby={sectionHeadingId(id)}
      tabIndex={-1}
      className={cn('relative isolate py-12 focus:outline-none sm:py-16 lg:py-24', className)}
    >
      {decoration}
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
