import { Wrench } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';

export interface PageStubProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Temporary page scaffold used by core's route stubs until the feature agents replace them.
 */
export function PageStub({ title, eyebrow = 'PIT LANE', description, children }: PageStubProps) {
  const headingId = `page-stub-${useId()}`;

  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate overflow-hidden border-b border-line"
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10" />
      <Container className="flex flex-col gap-6 py-20 lg:py-28">
        <SectionHeading
          as="h1"
          id={headingId}
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        <p className="hud inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1.5 text-muted">
          <Wrench aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
          Pit crew at work
        </p>
        {children}
      </Container>
    </section>
  );
}
