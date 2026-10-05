import { BellRing } from 'lucide-react';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';
import { cn } from '@/lib/cn';

export interface VaultDropAlertsProps {
  /** Id for the section heading (`aria-labelledby`). */
  headingId: string;
  className?: string;
}

/** Drop-alert sign-up for the next vault release (NewsletterForm, inline variant). */
export function VaultDropAlerts({ headingId, className }: VaultDropAlertsProps) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe is-active" />
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -left-20 -top-24 -z-10 h-64 w-64 rounded-full bg-highlight/10 blur-3xl"
      />
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <p className="hud flex items-center gap-2 text-highlight-ink">
            <BellRing aria-hidden="true" className="h-4 w-4" />
            Vault drop alerts
          </p>
          <h2 id={headingId} className="mt-3 text-2xl text-fg sm:text-3xl">
            Be first to the next run
          </h2>
          <p className="mt-3 max-w-prose text-muted">
            Numbered editions sell out fast. Get an email the moment a new vault run opens — no
            spam, just drops and restocks of regular castings.
          </p>
        </div>
        <div className="lg:col-span-6">
          <NewsletterForm variant="inline" />
        </div>
      </div>
    </div>
  );
}
