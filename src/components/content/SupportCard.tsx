import { Clock, Headset, Mail, Phone } from 'lucide-react';
import { HudPanel } from '@/components/effects/HudPanel';
import { Button } from '@/components/ui/Button';
import { SUPPORT_EMAIL, SUPPORT_HOURS, SUPPORT_PHONE, SUPPORT_PHONE_E164 } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';

export interface SupportCardProps {
  title?: string;
  /** Show the "Contact the pit crew" button (hide it on the contact page itself). */
  showContactLink?: boolean;
  className?: string;
}

const ROW =
  'flex items-center gap-3 rounded-md px-2 py-2 text-sm text-fg transition-colors duration-150 hover:bg-fg/[0.05] hover:text-accent-ink active:opacity-80';

/** HUD card with the support email, phone and hours (IST) from `brand.ts`. */
export function SupportCard({
  title = 'Pit crew hotline',
  showContactLink = true,
  className,
}: SupportCardProps) {
  return (
    <HudPanel title={title} meta="IST" className={cn('bg-card', className)}>
      <address className="flex flex-col gap-1 not-italic">
        <a href={`mailto:${SUPPORT_EMAIL}`} className={ROW}>
          <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-ink" />
          <span className="min-w-0 break-all font-mono">{SUPPORT_EMAIL}</span>
        </a>
        <a href={`tel:${SUPPORT_PHONE_E164}`} className={ROW}>
          <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-ink" />
          <span className="font-mono tabular-nums">{SUPPORT_PHONE}</span>
        </a>
        <p className="flex items-center gap-3 px-2 py-2 text-sm text-muted">
          <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-ink" />
          <span>{SUPPORT_HOURS}</span>
        </p>
      </address>
      {showContactLink ? (
        <Button
          to={ROUTES.contact}
          variant="secondary"
          size="sm"
          leftIcon={<Headset />}
          fullWidth
          className="mt-4"
        >
          Contact the pit crew
        </Button>
      ) : null}
    </HudPanel>
  );
}
