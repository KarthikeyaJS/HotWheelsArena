import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  LogIn,
  RotateCcw,
  WifiOff,
  XOctagon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';
import type { PlaceOrderErrorKind } from './checkoutErrors';

export interface PaymentFailedPanelProps {
  /** `declined` = the test bank said no; `error` = the order couldn't be confirmed. */
  variant: 'declined' | 'error';
  errorKind?: PlaceOrderErrorKind | null;
  message: string | null;
  onRetry: () => void;
  onChangeMethod: () => void;
  onSignIn?: () => void;
  className?: string;
}

const DECLINED_MESSAGE = 'Payment declined in test mode — try again or pick another method.';

/**
 * Friendly retry panel after a declined payment or a failed confirmation (focus moves here).
 * An `invalid-order` error can't succeed by retrying, so it offers "Back to pit stop" instead.
 */
export function PaymentFailedPanel({
  variant,
  errorKind,
  message,
  onRetry,
  onChangeMethod,
  onSignIn,
  className,
}: PaymentFailedPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [variant, message]);

  const declined = variant === 'declined';
  const needsSignIn = !declined && errorKind === 'unauthenticated';
  const invalidOrder = !declined && errorKind === 'invalid-order';
  const Icon = declined ? XOctagon : needsSignIn ? LogIn : invalidOrder ? AlertTriangle : WifiOff;

  return (
    <section
      role="alert"
      aria-labelledby="payment-failed-title"
      className={cn(
        'relative overflow-hidden rounded-xl border border-danger/45 bg-danger/[0.05] p-5 sm:p-6',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-danger" />
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-danger/40 bg-danger/10 text-danger-ink [&_svg]:h-5 [&_svg]:w-5"
        >
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="payment-failed-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-sm font-bold uppercase tracking-display text-fg sm:text-base"
          >
            {declined
              ? 'Payment declined'
              : needsSignIn
                ? 'Pit pass expired'
                : invalidOrder
                  ? "Couldn't place this order"
                  : "Couldn't confirm your order"}
          </h3>
          <p className="mt-1.5 text-sm text-muted">{declined ? DECLINED_MESSAGE : message}</p>
          {declined && message && message !== DECLINED_MESSAGE ? (
            <p className="mt-1 text-xs text-muted">Test bank: {message}</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {invalidOrder ? (
              <Button to={ROUTES.cart} leftIcon={<ArrowLeft />}>
                Back to pit stop
              </Button>
            ) : (
              <>
                {needsSignIn && onSignIn ? (
                  <Button leftIcon={<LogIn />} onClick={onSignIn}>
                    Sign in again
                  </Button>
                ) : (
                  <Button leftIcon={<RotateCcw />} onClick={onRetry}>
                    {declined ? 'Try again' : 'Confirm order again'}
                  </Button>
                )}
                <Button variant="outline" leftIcon={<CreditCard />} onClick={onChangeMethod}>
                  Pick another method
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
