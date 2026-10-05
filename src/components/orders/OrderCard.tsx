import { ArrowRight, Zap } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { paymentMethodLabel } from '@/components/checkout/paymentMethods';
import { CarImage } from '@/components/product/CarImage';
import { orderPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatDate, formatINR, formatNumber, pluralize } from '@/lib/format';
import { formatOrderRef, orderItemCount } from '@/lib/order';
import type { Order } from '@/types';
import { OrderStatusChip } from './OrderStatusChip';

const MAX_THUMBS = 4;

export interface OrderCardProps {
  order: Order;
  headingAs?: 'h2' | 'h3';
  className?: string;
}

/** Orders-list row: date, reference, status, thumbnails, total — the whole card links to the order. */
export const OrderCard = memo(function OrderCard({
  order,
  headingAs: Heading = 'h2',
  className,
}: OrderCardProps) {
  const count = orderItemCount(order);
  const thumbs = order.items.slice(0, MAX_THUMBS);
  const extra = order.items.length - thumbs.length;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card transition-colors duration-200 ease-race focus-within:bg-card-hover hover:bg-card-hover sm:p-5',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe racing-stripe-left" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="hud text-muted">
            <time dateTime={order.createdAt ? new Date(order.createdAt).toISOString() : undefined}>
              {formatDate(order.createdAt)}
            </time>{' '}
            · {pluralize(count, 'car')}
          </p>
          <Heading className="mt-1 font-display text-base font-bold tracking-display text-fg sm:text-lg">
            <Link
              to={orderPath(order.id)}
              className="rounded-sm after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              <span className="sr-only">Order </span>
              <span className="font-mono">{formatOrderRef(order.id)}</span>
            </Link>
          </Heading>
        </div>
        <OrderStatusChip status={order.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <ul aria-label="Cars in this order" className="flex items-center gap-2">
          {thumbs.map((item) => (
            <li
              key={item.productId}
              className="relative w-16 overflow-hidden rounded-md border border-line bg-surface sm:w-20"
            >
              <CarImage src={item.image} alt={item.name} width={80} height={50} />
              {item.qty > 1 ? (
                <span className="absolute right-0.5 top-0.5 rounded-sm bg-fg px-1 font-mono text-[10px] font-bold leading-4 text-bg">
                  ×{item.qty}
                </span>
              ) : null}
            </li>
          ))}
          {extra > 0 ? (
            <li className="grid h-10 w-10 place-items-center rounded-md border border-dashed border-line font-mono text-xs text-muted sm:h-12 sm:w-12">
              +{extra}
            </li>
          ) : null}
        </ul>
        <div className="text-right">
          <p className="hud text-[10px] text-muted">TOTAL</p>
          <p className="font-mono text-lg font-bold tabular-nums text-fg sm:text-xl">
            {formatINR(order.total)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-3 text-xs text-muted">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{paymentMethodLabel(order.paymentMethod)}</span>
          {order.payment.mode === 'test' ? (
            <span className="hud text-[10px] text-accent-ink">TEST MODE</span>
          ) : null}
          {order.xpEarned > 0 ? (
            <span className="inline-flex items-center gap-1 text-fg">
              <Zap aria-hidden="true" className="h-3 w-3 text-accent-ink" />
              <span className="font-mono">+{formatNumber(order.xpEarned)} XP</span>
            </span>
          ) : null}
        </p>
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 font-semibold text-fg transition-colors group-hover:text-accent-ink"
        >
          Details
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
});
