import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES, shopPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import type { OrderTotals, SiteSettings } from '@/types';
import { FreeShippingMeter } from './FreeShippingMeter';
import { orderLineLimitMessage } from './reconcile';
import { TotalsBreakdown } from './TotalsBreakdown';
import { TrustNotes } from './TrustNotes';

export interface CartSummaryProps {
  totals: OrderTotals;
  settings: Pick<SiteSettings, 'shippingThreshold' | 'showGstLine' | 'taxInclusive' | 'taxRate'>;
  /** Live prices are still being confirmed. */
  isVerifying: boolean;
  /** The catalogue could not be loaded (prices unverified). */
  verifyError: Error | null;
  onRetryVerify: () => void;
  /** Sold-out / unavailable lines block the checkout. */
  hasBlockers: boolean;
  /** Lines over the per-order limit (MAX_ORDER_LINES); > 0 blocks the checkout. */
  lineLimitExcess: number;
  className?: string;
}

/** Sticky "race summary": free-shipping meter, totals, START ENGINE CTA and trust notes. */
export function CartSummary({
  totals,
  settings,
  isVerifying,
  verifyError,
  onRetryVerify,
  hasBlockers,
  lineLimitExcess,
  className,
}: CartSummaryProps) {
  const hintId = useId();
  const overLimit = lineLimitExcess > 0;
  const canCheckout = !hasBlockers && !overLimit && totals.itemCount > 0;
  const hint = hasBlockers
    ? 'Remove sold-out or unavailable cars to start your engine.'
    : overLimit
      ? orderLineLimitMessage(lineLimitExcess)
      : verifyError
        ? "We couldn't re-check live prices — they're verified again at checkout."
        : null;
  const hintIsBlocking = hasBlockers || overLimit;

  return (
    <section
      aria-labelledby="cart-summary-title"
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-card shadow-card',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe is-active" />
      <div className="metal-surface flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="cart-summary-title" className="text-base text-fg sm:text-lg">
          Race summary
        </h2>
        <p className="hud text-fg">
          <span aria-hidden="true">{padNumber(totals.itemCount)} </span>
          <span className="sr-only">{totals.itemCount} </span>
          {totals.itemCount === 1 ? 'UNIT' : 'UNITS'}
        </p>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <FreeShippingMeter totals={totals} threshold={settings.shippingThreshold} />

        <div aria-busy={isVerifying || undefined} className="relative">
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

        {verifyError ? (
          <ErrorState
            compact
            title="PRICE CHECK STALLED"
            error={verifyError}
            onRetry={onRetryVerify}
            retryLabel="Re-check prices"
          />
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            to={ROUTES.checkout}
            size="lg"
            fullWidth
            rightIcon={<ArrowRight />}
            disabled={!canCheckout}
            loading={isVerifying && canCheckout}
            loadingText="Checking prices…"
            aria-describedby={hint ? hintId : undefined}
          >
            Start engine
          </Button>
          {hint ? (
            <p
              id={hintId}
              role={overLimit ? 'alert' : undefined}
              className={cn(
                'text-center text-xs',
                hintIsBlocking ? 'text-danger-ink' : 'text-muted',
              )}
            >
              {hint}
            </p>
          ) : null}
          <Button to={shopPath()} variant="ghost" size="sm" leftIcon={<ArrowLeft />}>
            Continue shopping
          </Button>
        </div>
      </div>

      <div className="border-t border-line bg-surface/60 p-5">
        <TrustNotes />
      </div>
    </section>
  );
}
