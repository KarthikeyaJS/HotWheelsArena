import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrdersPage from '@/pages/OrdersPage';
import type { Order } from '@/types';
import { ROUTER_FUTURE } from '../../cart/__tests__/fixtures';

interface OrdersQueryMock {
  data: Order[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

const query = vi.hoisted(() => ({
  current: { data: undefined, isPending: true, isError: false, error: null } as OrdersQueryMock,
  refetch: vi.fn(),
}));

vi.mock('@/hooks/useOrders', () => ({
  useOrders: () => ({ ...query.current, refetch: query.refetch }),
}));

const order: Order = {
  id: 'oS4Qk4fxK2Pcb2Sldsd6',
  uid: 'uid-1',
  items: [
    {
      productId: 'porsche-911-gt3-rs',
      slug: 'porsche-911-gt3-rs',
      name: 'Porsche 911 GT3 RS',
      price: 499,
      qty: 2,
      image: '/placeholders/sports-blue.svg',
    },
  ],
  subtotal: 998,
  shipping: 79,
  tax: 152.24,
  total: 1077,
  currency: 'INR',
  address: {
    name: 'Arjun',
    phone: '9876543210',
    pincode: '400050',
    line1: 'Flat 7',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  status: 'shipped',
  payment: { provider: 'dummy', status: 'success', transactionId: 'test_x', mode: 'test' },
  paymentMethod: 'upi',
  xpEarned: 250,
  badgesUnlocked: [],
  createdAt: 1_790_000_000_000,
  updatedAt: 1_790_000_000_000,
};

function renderPage() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <OrdersPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  query.refetch.mockReset();
});

describe('OrdersPage', () => {
  it('shows racing skeletons while loading', () => {
    query.current = { data: undefined, isPending: true, isError: false, error: null };
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your orders/i);
  });

  it('shows the empty state with shop CTAs', () => {
    query.current = { data: [], isPending: false, isError: false, error: null };
    renderPage();
    expect(
      screen.getByRole('heading', { name: /no races yet — your order history starts here/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore the garage/i })).toHaveAttribute(
      'href',
      '/shop',
    );
  });

  it('lists orders with status, total and a link to the detail page', () => {
    query.current = { data: [order], isPending: false, isError: false, error: null };
    renderPage();
    const link = screen.getByRole('link', { name: /order #B2SLDSD6/i });
    expect(link).toHaveAttribute('href', '/orders/oS4Qk4fxK2Pcb2Sldsd6');
    expect(screen.getAllByText('SHIPPED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹1,077').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Porsche 911 GT3 RS' })).toBeInTheDocument();
  });

  it('offers a retry when the query fails', () => {
    query.current = { data: undefined, isPending: false, isError: true, error: new Error('x') };
    renderPage();
    screen.getByRole('button', { name: /try again/i }).click();
    expect(query.refetch).toHaveBeenCalled();
  });
});
