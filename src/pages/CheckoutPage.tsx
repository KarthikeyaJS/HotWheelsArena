import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { computeOrderTotals } from '@shared/commerce';
import { BlockedLinesNotice } from '@/components/cart/BlockedLinesNotice';
import { PriceUpdateNotice } from '@/components/cart/PriceUpdateNotice';
import { useReconciledCart } from '@/components/cart/useReconciledCart';
import {
  AddressStep,
  type AddressSource,
  type AddressStepResult,
} from '@/components/checkout/AddressStep';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import {
  CHECKOUT_STEPS,
  CHECKOUT_STEP_META,
  CHECKOUT_STEP_PARAM,
  availablePaymentMethods,
  canAccessStep,
  isStepComplete,
  parseCheckoutStep,
  resolveCheckoutStep,
  stepIndex,
  type CheckoutStep,
} from '@/components/checkout/checkoutSteps';
import { EmptyCheckout } from '@/components/checkout/EmptyCheckout';
import { PaymentFailedPanel } from '@/components/checkout/PaymentFailedPanel';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ProcessingOverlay } from '@/components/checkout/ProcessingOverlay';
import { ReviewStep } from '@/components/checkout/ReviewStep';
import { TestModeBanner } from '@/components/checkout/TestModeBanner';
import { usePlaceOrderFlow, type PlaceOrderInput } from '@/components/checkout/usePlaceOrderFlow';
import type { OrderSuccessState } from '@/components/orders/orderSuccessState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { getPaymentProvider } from '@/config/payment';
import { orderSuccessPath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { usePrevious } from '@/hooks/usePrevious';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { useDocumentMeta } from '@/lib/seo';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import type { Address, PaymentMethod, PlaceOrderResponse } from '@/types';

export default function CheckoutPage() {
  useDocumentMeta({
    title: 'Checkout',
    description: 'Address, payment and review — three laps to the chequered flag.',
    noindex: true,
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, signIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const cart = useReconciledCart({ maxCatalogueAgeMs: 30_000 });
  const provider = useMemo(() => getPaymentProvider(), []);
  const methods = useMemo(
    () => availablePaymentMethods(provider.supportedMethods, cart.settings.codEnabled),
    [provider, cart.settings.codEnabled],
  );

  const [address, setAddress] = useState<Address | null>(null);
  const [addressSource, setAddressSource] = useState<AddressSource | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [chargeAmount, setChargeAmount] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const progress = useMemo(() => ({ address, method }), [address, method]);
  const rawStep = searchParams.get(CHECKOUT_STEP_PARAM);
  const step = resolveCheckoutStep(parseCheckoutStep(rawStep), progress, methods);

  const goToStep = useCallback(
    (next: CheckoutStep, options: { replace?: boolean } = {}) => {
      setSearchParams({ [CHECKOUT_STEP_PARAM]: next }, { replace: options.replace ?? false });
    },
    [setSearchParams],
  );

  // Deep links / reloads to a step that isn't reachable yet → first incomplete step.
  useEffect(() => {
    if (completed) return;
    const inUrl = rawStep ?? 'address';
    if (inUrl !== step) goToStep(step, { replace: true });
  }, [completed, rawStep, step, goToStep]);

  // Move focus + scroll to the new step's heading (not on first render).
  const previousStep = usePrevious(step);
  useEffect(() => {
    if (previousStep === undefined || previousStep === step) return;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step, previousStep, reduceMotion]);

  const settings = cart.settings;
  const uid = user?.uid ?? '';
  const handleSuccess = useCallback(
    (response: PlaceOrderResponse, input: PlaceOrderInput) => {
      const totals = computeOrderTotals(input.lines, settings);
      const state: OrderSuccessState = {
        // Scopes the hand-off to this collector ('' never matches, so it would fall back safely).
        uid,
        response,
        items: input.lines.map((line) => ({
          productId: line.productId,
          slug: line.slug,
          name: line.name,
          image: line.image,
          price: line.price,
          qty: line.qty,
        })),
        totals: {
          subtotal: totals.subtotal,
          shipping: totals.shipping,
          tax: totals.tax,
          total: response.total,
          itemCount: totals.itemCount,
        },
        paymentMethod: input.method,
      };
      setCompleted(true);
      navigate(orderSuccessPath(response.orderId), { replace: true, state });
      useCartStore.getState().clear();
    },
    [navigate, settings, uid],
  );

  const { refresh } = cart;
  const handleOrderChanged = useCallback(
    async (message: string) => {
      setOrderNotice(message);
      await refresh();
      goToStep('review', { replace: true });
    },
    [refresh, goToStep],
  );

  const handleUnauthenticated = useCallback(() => {
    useUiStore
      .getState()
      .openSignInPrompt('Your pit pass expired — sign in again to finish your order.');
  }, []);

  const flow = usePlaceOrderFlow({
    onSuccess: handleSuccess,
    onOrderChanged: handleOrderChanged,
    onUnauthenticated: handleUnauthenticated,
  });

  const handlePlaceOrder = (): void => {
    if (!address || !method || cart.hasBlockers || cart.purchasable.length === 0) return;
    if (cart.lineLimitExcess > 0 || cart.verifyError || cart.isVerifying) return;
    setOrderNotice(null);
    setChargeAmount(cart.totals.total);
    void flow.placeOrder({
      lines: cart.purchasable,
      address,
      method,
      amount: cart.totals.total,
      customer: {
        name: address.name,
        email: user?.email ?? profile?.email ?? '',
        phone: address.phone,
      },
    });
  };

  const handleAddress = (result: AddressStepResult): void => {
    setAddress(result.address);
    setAddressSource(result.source);
    goToStep(method && methods.includes(method) ? 'review' : 'payment');
  };

  const handleChangeMethod = (): void => {
    flow.reset();
    goToStep('payment');
  };

  const handleSignInAgain = (): void => {
    void signIn().then((signedIn) => {
      if (signedIn) flow.reset();
    });
  };

  const isEmpty = cart.items.length === 0;
  const meta = CHECKOUT_STEP_META[step];
  const overlayPhase =
    flow.phase === 'paying' || flow.phase === 'confirming' || flow.phase === 'done'
      ? flow.phase
      : null;
  const failurePanel =
    flow.phase === 'declined' || flow.phase === 'error' ? (
      <PaymentFailedPanel
        variant={flow.phase}
        errorKind={flow.errorKind}
        message={flow.message}
        onRetry={handlePlaceOrder}
        onChangeMethod={handleChangeMethod}
        onSignIn={handleSignInAgain}
      />
    ) : null;

  return (
    <Container className="py-10 lg:py-14">
      <SectionHeading
        as="h1"
        eyebrow="CHECKOUT · 3 LAPS TO THE FLAG"
        title="Checkout"
        description="Address, payment, review — then the chequered flag."
      />
      <TestModeBanner className="mt-6" providerLabel={provider.label} />

      {completed ? (
        <div role="status" className="mt-10 flex items-center gap-3 text-muted">
          <Spinner size="sm" label="" />
          <span>Order confirmed — heading to the finish line…</span>
        </div>
      ) : isEmpty ? (
        <div className="mt-10">
          <EmptyCheckout />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-7 xl:col-span-8">
            <CheckoutStepper
              current={step}
              disabled={flow.isBusy}
              isComplete={(candidate) => isStepComplete(candidate, progress, methods)}
              isAccessible={(candidate) => canAccessStep(candidate, progress, methods)}
              onSelect={(candidate) => goToStep(candidate)}
            />

            <PriceUpdateNotice changes={cart.notices} onDismiss={cart.dismissNotices} />
            <BlockedLinesNotice
              blocked={cart.blocked}
              onRemoveAll={() => {
                const store = useCartStore.getState();
                cart.blocked.forEach((line) => store.removeItem(line.item.productId));
              }}
            />

            <ErrorBoundary label="Checkout step" resetKeys={[step]}>
              <section aria-labelledby="checkout-step-title" className="flex flex-col gap-6">
                <div>
                  <p className="hud text-muted">
                    {meta.lap} <span aria-hidden="true">/ 0{CHECKOUT_STEPS.length}</span>
                    <span className="sr-only">
                      , step {stepIndex(step) + 1} of {CHECKOUT_STEPS.length}
                    </span>
                  </p>
                  <h2
                    id="checkout-step-title"
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    className="mt-2 text-2xl text-fg focus:outline-none sm:text-3xl"
                  >
                    {meta.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted sm:text-base">{meta.description}</p>
                </div>

                {step === 'address' ? (
                  <AddressStep
                    initialAddress={address}
                    initialSource={addressSource}
                    defaultName={profile?.displayName ?? user?.displayName ?? ''}
                    onContinue={handleAddress}
                  />
                ) : null}

                {step === 'payment' ? (
                  <PaymentStep
                    methods={methods}
                    value={method}
                    onChange={setMethod}
                    onContinue={() => goToStep('review')}
                    onBack={() => goToStep('address')}
                    amount={cart.totals.total}
                    holderName={address?.name ?? ''}
                  />
                ) : null}

                {step === 'review' && address && method ? (
                  <ReviewStep
                    lines={cart.purchasable}
                    address={address}
                    method={method}
                    totals={cart.totals}
                    settings={settings}
                    onEditAddress={() => goToStep('address')}
                    onEditPayment={() => goToStep('payment')}
                    onPlaceOrder={handlePlaceOrder}
                    placing={flow.isBusy}
                    isVerifying={cart.isVerifying}
                    verifyError={cart.verifyError}
                    onRetryVerify={cart.retryVerify}
                    hasBlockers={cart.hasBlockers}
                    lineLimitExcess={cart.lineLimitExcess}
                    orderNotice={orderNotice}
                    hasHeldPayment={flow.hasHeldPayment}
                    failurePanel={failurePanel}
                  />
                ) : null}
              </section>
            </ErrorBoundary>
          </div>

          {/* The review step already lists cars + totals; on phones skip the duplicate summary. */}
          <div
            className={cn('lg:col-span-5 xl:col-span-4', step === 'review' && 'hidden lg:block')}
          >
            <ErrorBoundary label="Order summary">
              <CheckoutSummary
                className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]"
                lines={cart.purchasable}
                totals={cart.totals}
                settings={settings}
                isVerifying={cart.isVerifying}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      <ProcessingOverlay phase={overlayPhase} method={method} amount={chargeAmount} />
    </Container>
  );
}
