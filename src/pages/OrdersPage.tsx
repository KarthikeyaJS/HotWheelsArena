import { Flag, ShoppingBag } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrdersListSkeleton } from '@/components/orders/OrdersListSkeleton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { HudReadout } from '@/components/ui/HudReadout';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES, garagePath, shopPath } from '@/config/routes';
import { useOrders } from '@/hooks/useOrders';
import { formatINR, formatNumber, padNumber } from '@/lib/format';
import { orderItemCount } from '@/lib/order';
import { useDocumentMeta } from '@/lib/seo';

export default function OrdersPage() {
  useDocumentMeta({
    title: 'Your orders',
    description: 'Your race history — every order you have placed, newest first.',
    noindex: true,
  });

  const ordersQuery = useOrders();
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const stats = useMemo(() => {
    const active = orders.filter((order) => order.status !== 'cancelled');
    return {
      orders: orders.length,
      cars: active.reduce((sum, order) => sum + orderItemCount(order), 0),
      xp: orders.reduce((sum, order) => sum + order.xpEarned, 0),
      spent: active.reduce((sum, order) => sum + order.total, 0),
    };
  }, [orders]);

  return (
    <Container className="py-6 sm:py-10 lg:py-14">
      <SectionHeading
        as="h1"
        eyebrow="RACE HISTORY"
        title="Your orders"
        description="Every pit stop you've cleared, newest first."
        action={
          <Button to={garagePath()} variant="outline" leftIcon={<Flag />}>
            My Garage
          </Button>
        }
      />

      <ErrorBoundary label="Your orders">
        <div className="mt-8 sm:mt-10">
          <DataState
            isLoading={ordersQuery.isPending}
            isError={ordersQuery.isError}
            error={ordersQuery.error}
            onRetry={() => void ordersQuery.refetch()}
            isEmpty={orders.length === 0}
            loadingLabel="Loading your orders…"
            skeleton={<OrdersListSkeleton />}
            empty={
              <EmptyState
                size="lg"
                titleAs="h2"
                icon={<ShoppingBag />}
                title="No races yet — your order history starts here"
                description="Your first order earns the FIRST RIDE badge and parks the cars straight in your garage."
                action={
                  <>
                    <Button to={shopPath()} size="lg">
                      Explore the garage
                    </Button>
                    <Button to={ROUTES.vault} variant="outline" size="lg">
                      Visit the Vault
                    </Button>
                  </>
                }
              />
            }
          >
            {() => (
              <div className="flex flex-col gap-6">
                <section aria-label="Order stats" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <HudReadout
                    label="ORDERS"
                    value={padNumber(stats.orders)}
                    className="rounded-lg border border-line bg-card p-4"
                  />
                  <HudReadout
                    label="CARS BOUGHT"
                    value={formatNumber(stats.cars)}
                    className="rounded-lg border border-line bg-card p-4"
                  />
                  <HudReadout
                    label="XP EARNED"
                    value={formatNumber(stats.xp)}
                    tone="accent"
                    className="rounded-lg border border-line bg-card p-4"
                  />
                  <HudReadout
                    label="SPENT"
                    value={formatINR(stats.spent)}
                    className="rounded-lg border border-line bg-card p-4"
                  />
                </section>
                <ul aria-label="Orders" className="flex flex-col gap-4">
                  {orders.map((order) => (
                    <li key={order.id}>
                      <OrderCard order={order} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DataState>
        </div>
      </ErrorBoundary>
    </Container>
  );
}
