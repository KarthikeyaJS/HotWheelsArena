import { Banknote, QrCode, ShieldCheck } from 'lucide-react';
import { BRAND_SHORT_NAME } from '@/config/brand';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import type { PaymentMethod } from '@/types';

/** Clearly fake values — shown for flavour only; nothing is collected or sent. */
export const TEST_CARD = { number: '4242 4242 4242 4242', expiry: '12 / 30', cvv: '•••' } as const;
export const TEST_UPI_ID = 'collector@testupi';

export interface PaymentMethodPreviewProps {
  method: PaymentMethod;
  amount: number;
  /** Name printed on the test card. */
  holderName: string;
  className?: string;
}

function TestValuesTag() {
  return (
    <span className="hud inline-flex items-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] text-accent-ink">
      <ShieldCheck aria-hidden="true" className="h-3 w-3" />
      Test values
    </span>
  );
}

/**
 * Purely cosmetic panel for the selected method (a metallic test card, a UPI handle or the COD
 * note). There are no inputs — nothing is collected, stored or sent anywhere.
 */
export function PaymentMethodPreview({
  method,
  amount,
  holderName,
  className,
}: PaymentMethodPreviewProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-5 overflow-hidden rounded-xl border border-dashed border-line bg-surface/70 p-5 sm:flex-row sm:items-center',
        className,
      )}
    >
      {method === 'card' ? (
        <div
          aria-hidden="true"
          className="metal-surface relative aspect-[1.586] w-full max-w-[300px] shrink-0 overflow-hidden rounded-xl border border-metal/30 p-4 text-fg shadow-card-hover"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-accent" />
          <div className="flex items-start justify-between">
            <span className="font-display text-sm font-bold tracking-display">
              {BRAND_SHORT_NAME} <span className="text-accent-ink">TEST</span>
            </span>
            <span className="hud text-[10px]">DEBIT</span>
          </div>
          <span className="mt-4 block h-7 w-10 rounded-md border border-fg/20 bg-[linear-gradient(135deg,rgb(var(--metal)),rgb(var(--metal)/0.45))]" />
          <p className="mt-3 font-mono text-base tracking-[0.14em] sm:text-lg">{TEST_CARD.number}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="hud block text-[9px]">CARD HOLDER</span>
              <span className="block truncate font-mono text-xs uppercase">{holderName || 'COLLECTOR'}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="hud block text-[9px]">VALID THRU</span>
              <span className="font-mono text-xs">{TEST_CARD.expiry}</span>
            </span>
          </div>
        </div>
      ) : null}

      {method === 'upi' ? (
        <div
          aria-hidden="true"
          className="grid aspect-square w-32 shrink-0 place-items-center rounded-xl border border-line bg-card"
        >
          <QrCode className="h-16 w-16 text-fg/80" strokeWidth={1.25} />
        </div>
      ) : null}

      {method === 'cod' ? (
        <div
          aria-hidden="true"
          className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-line bg-card text-accent-ink"
        >
          <Banknote className="h-10 w-10" strokeWidth={1.5} />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-2">
        <TestValuesTag />
        {method === 'card' ? (
          <>
            <p className="text-sm text-fg">
              A simulated card is used — card{' '}
              <span className="font-mono">{TEST_CARD.number}</span>, expiry{' '}
              <span className="font-mono">{TEST_CARD.expiry}</span>.
            </p>
            <p className="text-xs text-muted">
              No card details are asked for, collected or sent. Some test payments are declined on
              purpose so you can try the retry flow.
            </p>
          </>
        ) : null}
        {method === 'upi' ? (
          <>
            <p className="text-sm text-fg">
              Simulated UPI collect request to{' '}
              <span className="font-mono">{TEST_UPI_ID}</span>.
            </p>
            <p className="text-xs text-muted">
              No app opens and no UPI ID is collected — approval is simulated in about two seconds.
            </p>
          </>
        ) : null}
        {method === 'cod' ? (
          <>
            <p className="text-sm text-fg">
              Pay <span className="font-mono font-semibold">{formatINR(amount)}</span> in cash when
              your cars arrive.
            </p>
            <p className="text-xs text-muted">
              Cash on delivery is always confirmed instantly in test mode.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
