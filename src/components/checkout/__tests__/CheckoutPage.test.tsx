import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeOrderTotals } from '@shared/commerce';
import CheckoutPage from '@/pages/CheckoutPage';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/store/toastStore';
import type {
  PaymentResult,
  PlaceOrderRequest,
  PlaceOrderResponse,
  Product,
  SiteSettings,
} from '@/types';
import type { PaymentRequest } from '@/services/payment/PaymentProvider';
import { useCartNoticeStore } from '@/components/cart/cartNoticeStore';
import {
  makeCartItem,
  makeProduct,
  makeSettings,
  ROUTER_FUTURE,
} from '../../cart/__tests__/fixtures';

const gt3 = makeProduct();
const mauler = makeProduct({
  id: 'monsoon-mauler',
  name: 'Monsoon Mauler',
  price: 199,
  stock: 91,
  rarity: 'common',
});
const PRODUCTS: Product[] = [gt3, mauler];
const SETTINGS: SiteSettings = makeSettings();
const EXPECTED_TOTAL = computeOrderTotals(
  [
    { price: 499, qty: 1 },
    { price: 199, qty: 1 },
  ],
  SETTINGS,
).total; // 777

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn<(request: PaymentRequest) => Promise<PaymentResult>>(),
  placeOrder: vi.fn<(request: PlaceOrderRequest) => Promise<PlaceOrderResponse>>(),
  saveAddress: vi.fn(() => Promise.resolve('address-1')),
  refetch: vi.fn(() => Promise.resolve()),
  signIn: vi.fn(),
  /** Overrides the catalogue for a test (null → PRODUCTS). */
  catalogue: null as Product[] | null,
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    data: mocks.catalogue ?? PRODUCTS,
    isPending: false,
    isFetching: false,
    isStale: false,
    isError: false,
    error: null,
    dataUpdatedAt: Date.now(),
    refetch: mocks.refetch,
  }),
}));

vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    data: SETTINGS,
    isPlaceholderData: false,
    isFetching: false,
    refetch: mocks.refetch,
  }),
}));

vi.mock('@/hooks/useAddresses', () => ({
  useSavedAddresses: () => ({
    data: [],
    isPending: false,
    isSuccess: true,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useSaveAddress: () => ({ mutateAsync: mocks.saveAddress }),
}));

vi.mock('@/hooks/useOrders', () => ({
  usePlaceOrder: () => ({ mutateAsync: mocks.placeOrder }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'uid-1', email: 'arjun@example.com', displayName: 'Arjun Mehta' },
    profile: null,
    status: 'signed-in',
    signIn: mocks.signIn,
  }),
}));

vi.mock('@/config/payment', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/config/payment')>();
  const provider = {
    id: 'dummy' as const,
    label: 'Test payments',
    mode: 'test' as const,
    supportedMethods: ['card', 'upi', 'cod'] as const,
    createPayment: (request: PaymentRequest) => mocks.createPayment(request),
  };
  return { ...original, getPaymentProvider: () => provider, isTestPaymentMode: () => true };
});

function payment(
  status: PaymentResult['status'],
  method: PaymentResult['method'] = 'card',
): PaymentResult {
  return {
    provider: 'dummy',
    status,
    transactionId: `test_${'a'.repeat(20)}`,
    mode: 'test',
    method,
    amount: EXPECTED_TOTAL,
    message:
      status === 'success' ? 'Payment approved (test mode).' : 'Payment declined by the test bank.',
  };
}

const RESPONSE: PlaceOrderResponse = {
  orderId: 'order-1',
  xpEarned: 425,
  badgesUnlocked: ['first-ride'],
  level: 4,
  leveledUp: true,
  total: EXPECTED_TOTAL,
};

function SuccessProbe() {
  const location = useLocation();
  return (
    <div>
      <p data-testid="success-path">{location.pathname}</p>
      <pre data-testid="success-state">{JSON.stringify(location.state)}</pre>
    </div>
  );
}

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/checkout']} future={ROUTER_FUTURE}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success/:orderId" element={<SuccessProbe />} />
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function reachReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/mobile number/i), '9876543210');
  await user.type(screen.getByLabelText(/house \/ flat no/i), 'Flat 7, Apex Towers, Linking Road');
  await user.type(screen.getByLabelText(/pin code/i), '400050');
  await user.type(screen.getByLabelText(/^city/i), 'Mumbai');
  await user.selectOptions(screen.getByLabelText(/state \/ ut/i), 'Maharashtra');
  await user.click(screen.getByRole('button', { name: /continue to payment/i }));
  await screen.findByRole('heading', { name: /payment method/i });
  await user.click(screen.getByRole('radio', { name: /^card/i }));
  await user.click(screen.getByRole('button', { name: /review order/i }));
  await screen.findByRole('heading', { name: /review & place order/i });
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  mocks.createPayment.mockReset();
  mocks.placeOrder.mockReset();
  mocks.saveAddress.mockClear();
  mocks.refetch.mockClear();
  mocks.catalogue = null;
  useToastStore.getState().clear();
  useCartNoticeStore.getState().dismiss();
  useCartStore.setState({ items: [makeCartItem(gt3), makeCartItem(mauler)] });
});

afterEach(() => {
  useCartStore.setState({ items: [] });
});

describe('CheckoutPage', () => {
  it('validates the address before advancing (step stays in the URL flow)', async () => {
    const user = userEvent.setup();
    renderCheckout();
    expect(screen.getByRole('note', { name: /test mode/i })).toHaveTextContent(
      /no real payment is taken/i,
    );
    await user.clear(screen.getByLabelText(/full name/i));
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    expect(await screen.findByText(/enter the full name/i)).toBeInTheDocument();
    expect(screen.getByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(screen.getByText(/valid 6-digit pin code/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /delivery address/i })).toBeInTheDocument();
    expect(mocks.saveAddress).not.toHaveBeenCalled();
  });

  it('retries after a declined test payment, then places the order and navigates to success', async () => {
    const user = userEvent.setup();
    mocks.createPayment
      .mockResolvedValueOnce(payment('failed'))
      .mockResolvedValueOnce(payment('success'));
    mocks.placeOrder.mockResolvedValue(RESPONSE);
    renderCheckout();

    await reachReview(user);
    expect(mocks.saveAddress).toHaveBeenCalledWith(
      expect.objectContaining({
        address: expect.objectContaining({ phone: '9876543210', state: 'Maharashtra' }),
      }),
    );

    await user.click(screen.getByTestId('place-order'));
    const declined = await screen.findByRole('alert', { name: /payment declined/i });
    expect(declined).toHaveTextContent(
      /payment declined in test mode — try again or pick another method/i,
    );
    expect(mocks.placeOrder).not.toHaveBeenCalled();
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: EXPECTED_TOTAL, currency: 'INR', method: 'card' }),
    );

    await user.click(within(declined).getByRole('button', { name: /try again/i }));

    expect(await screen.findByTestId('success-path')).toHaveTextContent(
      '/checkout/success/order-1',
    );
    expect(mocks.placeOrder).toHaveBeenCalledWith({
      items: [
        { productId: gt3.id, qty: 1 },
        { productId: mauler.id, qty: 1 },
      ],
      address: expect.objectContaining({ name: 'Arjun Mehta', pincode: '400050', city: 'Mumbai' }),
      payment: payment('success'),
    });
    const state = JSON.parse(screen.getByTestId('success-state').textContent ?? 'null') as {
      uid: string;
      response: PlaceOrderResponse;
      items: unknown[];
      paymentMethod: string;
      totals: { total: number };
    };
    expect(state.uid).toBe('uid-1'); // scoped to the collector who placed it
    expect(state.response).toEqual(RESPONSE);
    expect(state.items).toHaveLength(2);
    expect(state.paymentMethod).toBe('card');
    expect(state.totals.total).toBe(EXPECTED_TOTAL);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('reuses the approved payment when confirming fails on the network (no double charge)', async () => {
    const user = userEvent.setup();
    mocks.createPayment.mockResolvedValue(payment('success'));
    mocks.placeOrder
      .mockRejectedValueOnce(
        Object.assign(new Error('unavailable'), { code: 'functions/unavailable' }),
      )
      .mockResolvedValueOnce(RESPONSE);
    renderCheckout();
    await reachReview(user);

    await user.click(screen.getByTestId('place-order'));
    const panel = await screen.findByRole('alert', { name: /couldn't confirm your order/i });
    await user.click(within(panel).getByRole('button', { name: /confirm order again/i }));

    expect(await screen.findByTestId('success-path')).toHaveTextContent(
      '/checkout/success/order-1',
    );
    expect(mocks.createPayment).toHaveBeenCalledTimes(1);
    expect(mocks.placeOrder).toHaveBeenCalledTimes(2);
    expect(mocks.placeOrder.mock.calls[1]?.[0].payment).toEqual(
      mocks.placeOrder.mock.calls[0]?.[0].payment,
    );
  });

  it('sends the collector back to review with the server message when prices changed', async () => {
    const user = userEvent.setup();
    mocks.createPayment.mockResolvedValue(payment('success'));
    mocks.placeOrder.mockRejectedValueOnce(
      Object.assign(new Error('Prices changed — review your pit stop.'), {
        code: 'functions/failed-precondition',
      }),
    );
    renderCheckout();
    await reachReview(user);

    await user.click(screen.getByTestId('place-order'));
    const notice = await screen.findByText('Prices changed — review your pit stop.');
    expect(notice.closest('[role="alert"]')).toHaveTextContent(/your order was updated/i);
    expect(mocks.refetch).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /review & place order/i })).toBeInTheDocument();

    // A fresh payment is taken next time (the old one no longer matches the server total).
    mocks.placeOrder.mockResolvedValueOnce(RESPONSE);
    await user.click(screen.getByTestId('place-order'));
    await screen.findByTestId('success-path');
    expect(mocks.createPayment).toHaveBeenCalledTimes(2);
  });

  it('shows a friendly panel (no redirect) when the cart is empty', async () => {
    useCartStore.setState({ items: [] });
    renderCheckout();
    expect(
      await screen.findByRole('heading', { name: /nothing to check out yet/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore the garage/i })).toHaveAttribute(
      'href',
      '/shop',
    );
    await waitFor(() => expect(screen.queryByText('elsewhere')).not.toBeInTheDocument());
  });

  it('blocks an order with more than 20 different cars before any payment', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 21 }, (_, index) =>
      makeProduct({ id: `car-${index + 1}`, name: `Car ${index + 1}`, price: 149 }),
    );
    mocks.catalogue = many;
    useCartStore.setState({ items: many.map((product) => makeCartItem(product)) });
    renderCheckout();
    await reachReview(user);

    const alert = screen
      .getAllByRole('alert')
      .find((element) => /at most 20 different cars/i.test(element.textContent ?? ''));
    expect(alert).toHaveTextContent(
      'An order can hold at most 20 different cars — remove 1 to start your engine.',
    );
    expect(
      within(alert as HTMLElement).getByRole('link', { name: /fix pit stop/i }),
    ).toHaveAttribute('href', '/cart');
    const place = screen.getByTestId('place-order');
    expect(place).toBeDisabled();
    await user.click(place);
    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.placeOrder).not.toHaveBeenCalled();
  });

  it("shows Couldn't place this order (no retry, no refresh) when the server rejects the request", async () => {
    const user = userEvent.setup();
    mocks.createPayment.mockResolvedValue(payment('success'));
    mocks.placeOrder.mockRejectedValueOnce(
      Object.assign(new Error('An order can hold at most 20 different cars'), {
        code: 'functions/invalid-argument',
      }),
    );
    renderCheckout();
    await reachReview(user);

    await user.click(screen.getByTestId('place-order'));
    const panel = await screen.findByRole('alert', { name: /couldn't place this order/i });
    expect(panel).toHaveTextContent('An order can hold at most 20 different cars');
    expect(within(panel).queryByRole('button', { name: /confirm order again/i })).toBeNull();
    expect(within(panel).getByRole('link', { name: /back to pit stop/i })).toHaveAttribute(
      'href',
      '/cart',
    );
    expect(screen.queryByText(/your order was updated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/we refreshed prices/i)).not.toBeInTheDocument();
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /review & place order/i })).toBeInTheDocument();
  });
});
