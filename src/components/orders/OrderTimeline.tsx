import { Check, Flag, Package, Truck, XCircle, type LucideIcon } from 'lucide-react';
import { ORDER_STATUS_META, ORDER_TRACK_STEPS } from '@/lib/order';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { OrderStatus } from '@/types';

const STEP_ICONS: Readonly<Record<OrderStatus, LucideIcon>> = {
  placed: Flag,
  processing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: XCircle,
};

export interface OrderTimelineProps {
  status: OrderStatus;
  /** When the order was placed (millis). */
  placedAt: number | null;
  /** Last status change (millis). */
  updatedAt: number | null;
  className?: string;
}

/**
 * Delivery tracker: placed → processing → shipped → delivered (cancelled = its own red variant).
 * The current stage carries `aria-current="step"`.
 */
export function OrderTimeline({ status, placedAt, updatedAt, className }: OrderTimelineProps) {
  if (status === 'cancelled') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/[0.06] p-4',
          className,
        )}
      >
        <XCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger-ink" />
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-display text-fg">
            Order cancelled
          </p>
          <p className="mt-1 text-sm text-muted">
            {ORDER_STATUS_META.cancelled.description} Placed {formatDate(placedAt)}
            {updatedAt ? ` · cancelled ${formatDate(updatedAt)}` : ''}.
          </p>
        </div>
      </div>
    );
  }

  const currentStep = ORDER_STATUS_META[status].step;

  return (
    <ol aria-label="Delivery progress" className={cn('grid gap-4 sm:grid-cols-4 sm:gap-0', className)}>
      {ORDER_TRACK_STEPS.map((step, index) => {
        const meta = ORDER_STATUS_META[step];
        const Icon = STEP_ICONS[step];
        const done = index < currentStep;
        const current = index === currentStep;
        const reached = done || current;
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            className="relative flex gap-3 sm:flex-col sm:items-start sm:gap-3 sm:pr-4"
          >
            {index < ORDER_TRACK_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-0.5 sm:left-10 sm:top-[19px] sm:h-0.5 sm:w-[calc(100%-2.5rem)]',
                  done ? 'bg-accent' : 'bg-line',
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition-colors [&_svg]:h-[18px] [&_svg]:w-[18px]',
                current && step === 'delivered' && 'border-success bg-success text-bg',
                current && step !== 'delivered' && 'border-accent bg-accent text-on-accent shadow-glow-accent',
                done && 'border-accent/50 bg-accent/10 text-accent-ink',
                !reached && 'border-line bg-surface text-muted',
              )}
            >
              {done ? <Check strokeWidth={3} /> : <Icon />}
            </span>
            <div className="min-w-0 pb-1">
              <p
                className={cn(
                  'font-display text-xs font-bold uppercase tracking-display',
                  reached ? 'text-fg' : 'text-muted',
                )}
              >
                {meta.label}
                <span className="sr-only">
                  {done ? ' — done' : current ? ' — current stage' : ' — upcoming'}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {step === 'placed' && placedAt
                  ? formatDate(placedAt, true)
                  : current
                    ? meta.description
                    : done
                      ? 'Done'
                      : 'Coming up'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
