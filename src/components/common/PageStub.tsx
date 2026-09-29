import { Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

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
  return (
    <section
      aria-labelledby="page-stub-title"
      className="relative isolate overflow-hidden border-b border-line"
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-content flex-col gap-5 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-stub-title" className="max-w-3xl text-3xl sm:text-5xl">
          {title}
        </h1>
        {description ? <p className="max-w-2xl text-lg text-muted">{description}</p> : null}
        <p className="hud inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1.5 text-muted">
          <Wrench aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
          Pit crew at work
        </p>
        {children}
      </div>
    </section>
  );
}
