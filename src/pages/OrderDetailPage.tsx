import { ArrowLeft, Warehouse, Zap } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { TotalsBreakdown } from '@/components/cart/TotalsBreakdown';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HudPanel } from '@/components/effects/HudPanel';
import { BadgeCard } from '@/components/gamification/BadgeCard';
import { AddressBlock } from '@/components/orders/AddressBlock';
import { CopyButton } from '@/components/orders/CopyButton';
import { OrderDetailSkeleton } from '@/components/orders/OrderDetailSkeleton';
import { OrderLinesList } from '@/components/orders/OrderLinesList';
import { OrderNotFound } from '@/components/orders/OrderNotFound';
import { OrderStatusChip } from '@/components/orders/OrderStatusChip';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { PaymentDetails } from '@/components/orders/PaymentDetails';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES, garagePath } from '@/config/routes';
import { useOrder } from '@/hooks/useOrders';
import { isNotFoundError, isPermissionError } from '@/lib/errors';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { ORDER_STATUS_META, formatOrderRef, orderItemCount } from '@/lib/order';
import { useDocumentMeta } from '@/lib/seo';
import type { Order } from '@/types';

function OrderDetail({ order }: { order: Order }) {
  const count = orderItemCount(order);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        as="h1"
        eyebrow={`ORDER DETAILS · ${ORDER_STATUS_META[order.status].label}`}
        title={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              <span className="sr-only">Order </span>
              <span className="font-mono">{formatOrderRef(order.id)}</span>
            </span>
            <OrderStatusChip status={order.status} size="lg" />
          </span>
        }
        description={`Placed ${formatDate(order.createdAt, true)} · ${pluralize(count, 'car')}`}
        action={
          <div className="flex items-center gap-2 rounded-md border border-line bg-surface py-1.5 pl-3 pr-1.5">
            <span className="hud text-muted">ID</span>
            <code className="max-w-[12rem] truncate font-mono text-xs text-fg sm:max-w-none">
              {order.id}
            </code>
            <CopyButton value={order.id} label="Copy order ID" size="xs" />
          </div>
        }
      />

      <HudPanel
        as="section"
        title="Delivery tracker"
        titleAs="h2"
        meta={ORDER_STATUS_META[order.status].label}
      >
        <OrderTimeline
          status={order.status}
          placedAt={order.createdAt}
          updatedAt={order.updatedAt}
        />
      </HudPanel>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7 xl:col-span-8">
          <HudPanel as="section" title={`Cars · ${count}`} titleAs="h2" tone="default">
            <OrderLinesList lines={order.items} />
          </HudPanel>

          <HudPanel as="section" title="XP & badges" titleAs="h2" tone="default">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-fg">
                <Zap aria-hidden="true" className="h-5 w-5 text-accent-ink" />
                <span className="font-mono text-2xl font-bold tabular-nums">
                  +{formatNumber(order.xpEarned)}
                </span>
                <span className="hud text-muted">XP earned</span>
              </p>
              <Button to={garagePath()} variant="outline" size="sm" leftIcon={<Warehouse />}>
                See them in My Garage
              </Button>
            </div>
            {order.badgesUnlocked.length > 0 ? (
              <ul
                aria-label="Badges unlocked by this order"
                className="mt-5 grid gap-3 sm:grid-cols-2"
              >
                {order.badgesUnlocked.map((badgeId) => (
                  <li key={badgeId}>
                    <BadgeCard badgeId={badgeId} unlocked size="sm" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No new badges on this order — keep collecting.
              </p>
            )}
          </HudPanel>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4">
          <HudPanel as="section" title="Totals" titleAs="h2">
            <TotalsBreakdown
              totals={{
                subtotal: order.subtotal,
                shipping: order.shipping,
                tax: order.tax,
                total: order.total,
                itemCount: count,
              }}
              size="lg"
            />
          </HudPanel>
          <HudPanel as="section" title="Shipping address" titleAs="h2" tone="default">
            <AddressBlock address={order.address} />
          </HudPanel>
          <HudPanel as="section" title="Payment" titleAs="h2" tone="default">
            <PaymentDetails payment={order.payment} method={order.paymentMethod} />
          </HudPanel>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const orderQuery = useOrder(orderId);
  const order = orderQuery.data;
  const notFound =
    order === null ||
    orderId === '' ||
    (orderQuery.isError &&
      (isPermissionError(orderQuery.error) || isNotFoundError(orderQuery.error)));

  useDocumentMeta({
    title: order ? `Order ${formatOrderRef(order.id)}` : 'Order details',
    description: 'Items, delivery address and payment details for this order.',
    noindex: true,
  });

  return (
    <Container className="py-10 lg:py-14">
      <Button
        to={ROUTES.orders}
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft />}
        className="-ml-3 mb-6"
      >
        All orders
      </Button>
      <ErrorBoundary label="Order details" resetKeys={[orderId]}>
        {notFound ? (
          <>
            <h1 className="sr-only">Order not found</h1>
            <OrderNotFound />
          </>
        ) : (
          <DataState
            isLoading={orderQuery.isPending}
            isError={orderQuery.isError}
            error={orderQuery.error}
            onRetry={() => void orderQuery.refetch()}
            loadingLabel="Loading order…"
            skeleton={<OrderDetailSkeleton />}
          >
            {() => (order ? <OrderDetail order={order} /> : null)}
          </DataState>
        )}
      </ErrorBoundary>
    </Container>
  );
}
