import { ArrowRight, ChevronsUp, ClipboardList, Flag, ShoppingBag, Warehouse } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TotalsBreakdown } from '@/components/cart/TotalsBreakdown';
import { paymentMethodLabel } from '@/components/checkout/paymentMethods';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HudPanel } from '@/components/effects/HudPanel';
import { BadgeCard } from '@/components/gamification/BadgeCard';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { ConfettiBurst } from '@/components/orders/ConfettiBurst';
import { CopyButton } from '@/components/orders/CopyButton';
import { OrderDetailSkeleton } from '@/components/orders/OrderDetailSkeleton';
import { OrderLinesList, type OrderLineSummary } from '@/components/orders/OrderLinesList';
import { OrderNotFound } from '@/components/orders/OrderNotFound';
import {
  readOrderSuccessState,
  type OrderSuccessTotals,
} from '@/components/orders/orderSuccessState';
import { XpCountUp } from '@/components/orders/XpCountUp';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Container } from '@/components/ui/Container';
import { garagePath, orderPath, shopPath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useOrder } from '@/hooks/useOrders';
import { useSound } from '@/hooks/useSound';
import { isNotFoundError, isPermissionError } from '@/lib/errors';
import { formatINR, pluralize } from '@/lib/format';
import { formatOrderRef, orderItemCount } from '@/lib/order';
import { useDocumentMeta } from '@/lib/seo';
import type { BadgeId, Order, PaymentMethod } from '@/types';

interface SuccessView {
  orderId: string;
  items: OrderLineSummary[];
  totals: OrderSuccessTotals;
  xpEarned: number;
  badges: BadgeId[];
  /** Level after the order (null when unknown, e.g. profile still loading after a reload). */
  level: number | null;
  leveledUp: boolean;
  paymentMethod: PaymentMethod;
}

function viewFromOrder(order: Order, level: number | null): SuccessView {
  return {
    orderId: order.id,
    items: order.items,
    totals: {
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      itemCount: orderItemCount(order),
    },
    xpEarned: order.xpEarned,
    badges: order.badgesUnlocked,
    level,
    leveledUp: false,
    paymentMethod: order.paymentMethod,
  };
}

function Celebration({ view, fresh }: { view: SuccessView; fresh: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const playSound = useSound();

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (fresh) playSound('start');
  }, [fresh, playSound]);

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="success-title"
        className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface px-5 pb-10 pt-14 text-center shadow-card sm:px-10 sm:pt-16"
      >
        <div aria-hidden="true" className="bg-checker absolute inset-x-0 top-0 h-7 opacity-90" />
        <div
          aria-hidden="true"
          className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-10 -z-10 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
        />
        {fresh ? <ConfettiBurst /> : null}

        <span
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-accent/40 bg-accent text-on-accent shadow-glow-accent [&_svg]:h-8 [&_svg]:w-8"
        >
          <Flag />
        </span>
        <p className="eyebrow mt-6">Race complete · test mode</p>
        <h1
          id="success-title"
          ref={headingRef}
          tabIndex={-1}
          className="mx-auto mt-3 max-w-3xl text-balance text-3xl text-fg focus:outline-none sm:text-5xl"
        >
          Chequered flag! Order confirmed
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          {pluralize(view.totals.itemCount, 'car')} just rolled into your garage. We&apos;ll ping
          the pit crew to pack them with care.
        </p>
        <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-card py-1.5 pl-3 pr-1.5">
          <span className="hud text-muted">ORDER</span>
          <span className="font-mono text-sm font-bold text-fg">
            {formatOrderRef(view.orderId)}
          </span>
          <code className="hidden max-w-[16rem] truncate font-mono text-xs text-muted sm:inline">
            {view.orderId}
          </code>
          <CopyButton value={view.orderId} label="Copy order ID" size="xs" />
        </div>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
          <HudPanel title="XP earned" meta="REWARD">
            <XpCountUp xp={view.xpEarned} className="text-4xl text-accent-ink" />
            <p className="mt-2 text-xs text-muted">Added to your collector rank.</p>
          </HudPanel>
          <HudPanel title="Collector level" meta={view.leveledUp ? 'UP' : 'RANK'}>
            {view.level !== null ? (
              <div className="flex flex-wrap items-center gap-3">
                <LevelBadge level={view.level} showTitle />
                {view.leveledUp ? (
                  <Chip tone="accent" variant="solid" size="sm" icon={<ChevronsUp />}>
                    Level up!
                  </Chip>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Syncing your level…</p>
            )}
          </HudPanel>
          <HudPanel title="Total" meta="TEST MODE">
            <p className="font-mono text-3xl font-bold tabular-nums text-fg">
              {formatINR(view.totals.total)}
            </p>
            <p className="mt-2 text-xs text-muted">
              {paymentMethodLabel(view.paymentMethod)} · no real payment taken
            </p>
          </HudPanel>
        </div>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button to={orderPath(view.orderId)} size="lg" leftIcon={<ClipboardList />}>
            View order
          </Button>
          <Button to={garagePath()} variant="outline" size="lg" leftIcon={<Warehouse />}>
            Visit My Garage
          </Button>
          <Button to={shopPath()} variant="ghost" size="lg" rightIcon={<ArrowRight />}>
            Keep shopping
          </Button>
        </div>
      </section>

      {view.badges.length > 0 ? (
        <section aria-labelledby="success-badges-title" className="flex flex-col gap-5">
          <div>
            <p className="eyebrow">Achievements</p>
            <h2 id="success-badges-title" className="mt-2 text-2xl text-fg">
              {view.badges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {view.badges.map((badgeId) => (
              <li key={badgeId}>
                <BadgeCard badgeId={badgeId} unlocked />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="success-items-title"
        className="grid gap-6 rounded-xl border border-line bg-card p-5 shadow-card sm:p-6 lg:grid-cols-12"
      >
        <div className="lg:col-span-7">
          <h2 id="success-items-title" className="text-lg text-fg">
            In this order
          </h2>
          <p className="mt-1 text-sm text-muted">
            Auto-parked in My Garage — find them under Collection.
          </p>
          <OrderLinesList lines={view.items} className="mt-5" />
        </div>
        <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-6">
          <TotalsBreakdown totals={view.totals} size="lg" totalLabel="Total paid" />
          <Button
            to={shopPath()}
            variant="link"
            size="sm"
            leftIcon={<ShoppingBag />}
            className="mt-5"
          >
            Find your next ride
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function OrderSuccessPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const successState = useMemo(
    () => readOrderSuccessState(location.state, orderId),
    [location.state, orderId],
  );
  // Celebrate only on the first arrival from the checkout (not after a reload / back-forward).
  const [celebrate] = useState(() => successState !== null && successState.celebrated !== true);
  useEffect(() => {
    if (!celebrate || !successState || successState.celebrated) return;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: { ...successState, celebrated: true },
    });
  }, [celebrate, successState, navigate, location.pathname, location.search]);
  // After a reload there is no navigation state → read the order doc instead.
  const orderQuery = useOrder(successState ? undefined : orderId);

  useDocumentMeta({
    title: 'Order confirmed',
    description: 'Your order is in. XP and badges have landed in your garage.',
    noindex: true,
  });

  const view: SuccessView | null = successState
    ? {
        orderId: successState.response.orderId,
        items: successState.items,
        totals: successState.totals,
        xpEarned: successState.response.xpEarned,
        badges: successState.response.badgesUnlocked,
        level: successState.response.level,
        leveledUp: successState.response.leveledUp,
        paymentMethod: successState.paymentMethod,
      }
    : orderQuery.data
      ? viewFromOrder(orderQuery.data, profile?.level ?? null)
      : null;

  const notFound =
    !successState &&
    (orderQuery.data === null ||
      orderId === '' ||
      (orderQuery.isError &&
        (isPermissionError(orderQuery.error) || isNotFoundError(orderQuery.error))));

  return (
    <Container className="py-10 lg:py-14">
      <ErrorBoundary label="Order confirmation" resetKeys={[orderId]}>
        {notFound ? (
          <>
            <h1 className="sr-only">Order not found</h1>
            <OrderNotFound />
          </>
        ) : (
          <DataState
            isLoading={!view && orderQuery.isPending}
            isError={!view && orderQuery.isError}
            error={orderQuery.error}
            onRetry={() => void orderQuery.refetch()}
            loadingLabel="Loading your order…"
            skeleton={<OrderDetailSkeleton />}
          >
            {() => (view ? <Celebration view={view} fresh={celebrate} /> : null)}
          </DataState>
        )}
      </ErrorBoundary>
    </Container>
  );
}
