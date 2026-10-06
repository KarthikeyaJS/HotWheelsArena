import { AlertTriangle, ArrowLeft, Flag, Pencil, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { orderLineLimitMessage } from '@/components/cart/reconcile';
import { TotalsBreakdown } from '@/components/cart/TotalsBreakdown';
import { AddressBlock } from '@/components/orders/AddressBlock';
import { OrderLinesList } from '@/components/orders/OrderLinesList';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { ROUTES } from '@/config/routes';
import { formatINR } from '@/lib/format';
import type { Address, CartItem, OrderTotals, PaymentMethod, SiteSettings } from '@/types';
import { paymentMethodIcon, paymentMethodLabel } from './paymentMethods';

export interface ReviewStepProps {
  lines: readonly CartItem[];
  address: Address;
  method: PaymentMethod;
  totals: OrderTotals;
  settings: Pick<SiteSettings, 'showGstLine' | 'taxInclusive' | 'taxRate'>;
  onEditAddress: () => void;
  onEditPayment: () => void;
  onPlaceOrder: () => void;
  /** Payment / order in flight. */
  placing: boolean;
  /** Prices still being confirmed. */
  isVerifying: boolean;
  verifyError: Error | null;
  onRetryVerify: () => void;
  /** Sold-out / unavailable lines in the cart. */
  hasBlockers: boolean;
  /** Lines over the per-order limit (MAX_ORDER_LINES); > 0 blocks PLACE ORDER. */
  lineLimitExcess: number;
  /** Server said the order changed (prices / stock / COD) — shown above the order. */
  orderNotice: string | null;
  /** A successful test payment is held for this attempt (retry won't charge again). */
  hasHeldPayment: boolean;
  /** Retry panel after a declined payment / failed confirmation — replaces the action row. */
  failurePanel?: ReactNode;
}

/** Step 3: cars, delivery address, payment method, totals and PLACE ORDER. */
export function ReviewStep({
  lines,
  address,
  method,
  totals,
  settings,
  onEditAddress,
  onEditPayment,
  onPlaceOrder,
  placing,
  isVerifying,
  verifyError,
  onRetryVerify,
  hasBlockers,
  lineLimitExcess,
  orderNotice,
  hasHeldPayment,
  failurePanel,
}: ReviewStepProps) {
  const MethodIcon = paymentMethodIcon(method);
  const overLimit = lineLimitExcess > 0;
  const blocked = hasBlockers || overLimit || lines.length === 0;
  const canPlace = !blocked && !verifyError;

  return (
    <div className="flex flex-col gap-6">
      {orderNotice ? (
        <div
          role="alert"
          className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-accent/45 bg-accent/[0.06] p-4 sm:p-5"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <RefreshCw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-display text-fg sm:text-sm">
              Your order was updated
            </p>
            <p className="mt-1 text-sm text-muted">{orderNotice}</p>
            <p className="mt-1 text-xs text-muted">
              We refreshed prices and stock below. Nothing was charged — review and place it again.
            </p>
          </div>
        </div>
      ) : null}

      {hasBlockers ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-danger/45 bg-danger/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-fg">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
            Some cars in your pit stop are sold out or no longer available.
          </p>
          <Button to={ROUTES.cart} variant="outline" size="sm" leftIcon={<ArrowLeft />}>
            Fix pit stop
          </Button>
        </div>
      ) : null}

      {overLimit ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-danger/45 bg-danger/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-fg">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
            {orderLineLimitMessage(lineLimitExcess)}
          </p>
          <Button to={ROUTES.cart} variant="outline" size="sm" leftIcon={<ArrowLeft />}>
            Fix pit stop
          </Button>
        </div>
      ) : null}

      <section
        aria-labelledby="review-cars-title"
        className="rounded-xl border border-line bg-card p-4 shadow-card sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="review-cars-title" className="hud font-normal text-muted">
            Cars · {totals.itemCount}
          </h3>
          <Link
            to={ROUTES.cart}
            className="inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-accent-ink hover:underline"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            Edit pit stop
          </Link>
        </div>
        <OrderLinesList lines={lines} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section
          aria-labelledby="review-address-title"
          className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 id="review-address-title" className="hud font-normal text-muted">
              Deliver to
            </h3>
            <Button
              variant="link"
              size="sm"
              leftIcon={<Pencil />}
              onClick={onEditAddress}
              aria-label="Change delivery address"
              disabled={placing}
            >
              Change
            </Button>
          </div>
          <AddressBlock address={address} />
        </section>

        <section
          aria-labelledby="review-payment-title"
          className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 id="review-payment-title" className="hud font-normal text-muted">
              Payment
            </h3>
            <Button
              variant="link"
              size="sm"
              leftIcon={<Pencil />}
              onClick={onEditPayment}
              aria-label="Change payment method"
              disabled={placing}
            >
              Change
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-surface text-accent-ink [&_svg]:h-5 [&_svg]:w-5"
            >
              <MethodIcon />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{paymentMethodLabel(method)}</p>
              <Chip size="sm" tone="accent" variant="outline" className="mt-1">
                Test mode
              </Chip>
            </div>
          </div>
          {hasHeldPayment ? (
            <p className="text-xs text-success">
              Test payment approved — confirming won't charge again.
            </p>
          ) : null}
        </section>
      </div>

      <div className="rounded-xl border border-line bg-card p-4 shadow-card sm:p-5 lg:hidden">
        <TotalsBreakdown
          totals={totals}
          taxInclusive={settings.taxInclusive}
          showGstLine={settings.showGstLine}
          taxRate={settings.taxRate}
        />
      </div>

      {verifyError ? (
        <ErrorState
          compact
          title="PRICE CHECK STALLED"
          message="We need live prices before you can place the order."
          onRetry={onRetryVerify}
          retryLabel="Re-check prices"
        />
      ) : null}

      {failurePanel ? (
        failurePanel
      ) : (
        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft />}
              onClick={onEditPayment}
              disabled={placing}
            >
              Back to payment
            </Button>
            <Button
              size="lg"
              rightIcon={<Flag />}
              onClick={onPlaceOrder}
              disabled={!canPlace}
              loading={placing || (isVerifying && canPlace)}
              loadingText={placing ? 'Starting engine…' : 'Checking prices…'}
              data-testid="place-order"
            >
              Place order ·{' '}
              <span className="font-mono font-bold normal-case tracking-normal">
                {formatINR(totals.total)}
              </span>
            </Button>
          </div>
          <p className="text-xs text-muted sm:text-right">
            By placing this order you agree to our{' '}
            <Link
              to={ROUTES.terms}
              className="rounded-sm text-fg underline-offset-2 hover:underline"
            >
              terms
            </Link>
            . Test mode — no real payment is taken.
          </p>
        </div>
      )}
    </div>
  );
}
