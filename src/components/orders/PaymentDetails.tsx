import { paymentMethodIcon, paymentMethodLabel } from '@/components/checkout/paymentMethods';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/cn';
import type { OrderPayment, PaymentMethod, PaymentProviderId } from '@/types';
import { CopyButton } from './CopyButton';

const PROVIDER_LABELS: Readonly<Record<PaymentProviderId, string>> = {
  dummy: 'Test payments (simulated)',
  razorpay: 'Razorpay',
};

export interface PaymentDetailsProps {
  payment: OrderPayment;
  method: PaymentMethod;
  className?: string;
}

/** Provider, method, status and transaction id of an order's payment (TEST MODE badge). */
export function PaymentDetails({ payment, method, className }: PaymentDetailsProps) {
  const MethodIcon = paymentMethodIcon(method);
  const isTest = payment.mode === 'test';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-surface text-accent-ink [&_svg]:h-5 [&_svg]:w-5"
        >
          <MethodIcon />
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-fg">{paymentMethodLabel(method)}</span>
          {isTest ? (
            <Chip size="sm" tone="accent" variant="solid">
              Test mode
            </Chip>
          ) : null}
        </div>
      </div>
      <dl className="grid gap-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Provider</dt>
          <dd className="text-right text-fg">{PROVIDER_LABELS[payment.provider]}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Status</dt>
          <dd
            className={cn(
              'font-mono text-xs font-bold uppercase tracking-hud',
              payment.status === 'success' ? 'text-success' : 'text-danger-ink',
            )}
          >
            {method === 'cod' && payment.status === 'success'
              ? 'Pay on delivery'
              : payment.status === 'success'
                ? 'Approved'
                : 'Failed'}
          </dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="text-muted">Transaction ID</dt>
          <dd className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-fg">
              {payment.transactionId || '—'}
            </code>
            {payment.transactionId ? (
              <CopyButton value={payment.transactionId} label="Copy transaction ID" size="sm" />
            ) : null}
          </dd>
        </div>
      </dl>
      {isTest ? (
        <p className="text-xs text-muted">Test mode — no real money moved for this order.</p>
      ) : null}
    </div>
  );
}
