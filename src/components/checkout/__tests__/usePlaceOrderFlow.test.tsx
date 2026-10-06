import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartItem, PaymentResult, PlaceOrderRequest, PlaceOrderResponse } from '@/types';
import type { PaymentRequest } from '@/services/payment/PaymentProvider';
import { usePlaceOrderFlow } from '../usePlaceOrderFlow';
import type { PlaceOrderInput } from '../placeOrderInput';

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn<(request: PaymentRequest) => Promise<PaymentResult>>(),
  placeOrder: vi.fn<(request: PlaceOrderRequest) => Promise<PlaceOrderResponse>>(),
}));

vi.mock('@/hooks/useOrders', () => ({
  usePlaceOrder: () => ({ mutateAsync: mocks.placeOrder }),
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
  return { ...original, getPaymentProvider: () => provider };
});

const line = (index: number): CartItem => ({
  productId: `car-${index}`,
  slug: `car-${index}`,
  name: `Car ${index}`,
  price: 149,
  image: '/placeholders/car-generic.svg',
  qty: 1,
  stock: 10,
});

const input = (count: number): PlaceOrderInput => ({
  lines: Array.from({ length: count }, (_, index) => line(index + 1)),
  address: {
    name: 'Arjun Mehta',
    phone: '9876543210',
    pincode: '400050',
    line1: 'Flat 7, Apex Towers',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  method: 'cod',
  amount: count * 149,
  customer: { name: 'Arjun Mehta', email: 'arjun@example.com', phone: '9876543210' },
});

beforeEach(() => {
  mocks.createPayment.mockReset();
  mocks.placeOrder.mockReset();
});

describe('usePlaceOrderFlow', () => {
  it('refuses an order over MAX_ORDER_LINES before taking a payment', async () => {
    const onSuccess = vi.fn();
    const onOrderChanged = vi.fn();
    const { result } = renderHook(() => usePlaceOrderFlow({ onSuccess, onOrderChanged }));

    await act(() => result.current.placeOrder(input(21)));

    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.placeOrder).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('error');
    expect(result.current.errorKind).toBe('invalid-order');
    expect(result.current.message).toBe(
      'An order can hold at most 20 different cars — remove 1 to start your engine.',
    );
    expect(onOrderChanged).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not call onOrderChanged (or keep the payment) when the server says invalid-argument', async () => {
    const onOrderChanged = vi.fn();
    mocks.createPayment.mockResolvedValue({
      provider: 'dummy',
      status: 'success',
      transactionId: `test_${'b'.repeat(20)}`,
      mode: 'test',
      method: 'cod',
      amount: 149,
      message: 'ok',
    });
    mocks.placeOrder.mockRejectedValue(
      Object.assign(new Error('Bad request'), { code: 'functions/invalid-argument' }),
    );
    const { result } = renderHook(() => usePlaceOrderFlow({ onSuccess: vi.fn(), onOrderChanged }));

    await act(() => result.current.placeOrder(input(1)));

    expect(result.current.phase).toBe('error');
    expect(result.current.errorKind).toBe('invalid-order');
    expect(result.current.hasHeldPayment).toBe(false);
    expect(onOrderChanged).not.toHaveBeenCalled();
  });
});
