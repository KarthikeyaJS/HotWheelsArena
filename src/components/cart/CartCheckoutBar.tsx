import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatINR, pluralize } from '@/lib/format';
import type { OrderTotals } from '@/types';

export interface CartCheckoutBarProps {
  totals: OrderTotals;
  /** Live prices are still being confirmed (same gate as the summary's START ENGINE). */
  isVerifying: boolean;
  className?: string;
}

/**
 * Phones / tablets (below `lg`): a compact total + checkout bar that sticks to the bottom of the
 * viewport while the cart lines scroll, then docks at the end of the list (plain CSS `sticky`,
 * so it never covers the race summary). It clears the home indicator via the bottom safe area.
 * Render it only when the checkout is allowed — blocked carts explain themselves in the list.
 */
export function CartCheckoutBar({ totals, isVerifying, className }: CartCheckoutBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 lg:hidden',
        className,
      )}
    >
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/95 py-2 pl-4 pr-2 shadow-card-hover backdrop-blur-md">
        <p className="min-w-0 flex-1">
          <span className="hud block truncate text-2xs text-muted">
            Total · {pluralize(totals.itemCount, 'unit')}
          </span>
          <span className="block font-mono text-lg font-bold tabular-nums leading-tight text-fg">
            {formatINR(totals.total)}
          </span>
        </p>
        <Button
          to={ROUTES.checkout}
          size="md"
          rightIcon={<ArrowRight />}
          loading={isVerifying}
          loadingText="Checking…"
          className="shrink-0"
        >
          Checkout
        </Button>
      </div>
    </div>
  );
}
