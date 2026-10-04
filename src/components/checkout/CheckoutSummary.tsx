import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FreeShippingMeter } from '@/components/cart/FreeShippingMeter';
import { TotalsBreakdown } from '@/components/cart/TotalsBreakdown';
import { TrustNotes } from '@/components/cart/TrustNotes';
import { OrderLinesList } from '@/components/orders/OrderLinesList';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import type { CartItem, OrderTotals, SiteSettings } from '@/types';

export interface CheckoutSummaryProps {
  lines: readonly CartItem[];
  totals: OrderTotals;
  settings: Pick<SiteSettings, 'shippingThreshold' | 'showGstLine' | 'taxInclusive' | 'taxRate'>;
  isVerifying: boolean;
  className?: string;
}

/** Sticky order summary next to the checkout steps. */
export function CheckoutSummary({
  lines,
  totals,
  settings,
  isVerifying,
  className,
}: CheckoutSummaryProps) {
  return (
    <section
      aria-labelledby="checkout-summary-title"
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-card shadow-card',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe is-active" />
      <div className="metal-surface flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="checkout-summary-title" className="text-base text-fg">
          Order summary
        </h2>
        <p className="hud text-fg">
          <span aria-hidden="true">{padNumber(totals.itemCount)} </span>
          <span className="sr-only">{totals.itemCount} </span>
          {totals.itemCount === 1 ? 'UNIT' : 'UNITS'}
        </p>
      </div>
      <div className="flex flex-col gap-5 p-5">
        <div className="max-h-72 overflow-y-auto pr-1">
          <OrderLinesList lines={lines} size="sm" label="Cars in your pit stop" />
        </div>
        <Link
          to={ROUTES.cart}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-xs font-semibold text-accent-ink hover:underline"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          Edit pit stop
        </Link>
        <FreeShippingMeter totals={totals} threshold={settings.shippingThreshold} />
        <div aria-busy={isVerifying || undefined}>
          <TotalsBreakdown
            totals={totals}
            taxInclusive={settings.taxInclusive}
            showGstLine={settings.showGstLine}
            taxRate={settings.taxRate}
            size="lg"
          />
          {isVerifying ? (
            <p className="hud mt-3 flex items-center gap-2 text-muted">
              <Spinner size="xs" label="" />
              Checking live prices…
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-t border-line bg-surface/60 p-5">
        <TrustNotes layout="list" />
      </div>
    </section>
  );
}
