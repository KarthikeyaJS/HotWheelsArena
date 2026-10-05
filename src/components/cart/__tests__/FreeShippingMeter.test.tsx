import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { computeOrderTotals, DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { FreeShippingMeter } from '../FreeShippingMeter';
import { TotalsBreakdown } from '../TotalsBreakdown';

const threshold = DEFAULT_SITE_SETTINGS.shippingThreshold; // ₹999

describe('FreeShippingMeter', () => {
  it('shows how much more is needed for free shipping with an orange progress bar', () => {
    const totals = computeOrderTotals([
      { price: 499, qty: 1 },
      { price: 199, qty: 1 },
    ]);
    render(<FreeShippingMeter totals={totals} threshold={threshold} />);

    expect(screen.getByText(/more for/i)).toHaveTextContent('Add ₹301 more for free shipping');
    const bar = screen.getByRole('progressbar', { name: 'Progress to free shipping' });
    expect(bar).toHaveAttribute('aria-valuetext', '₹698 of ₹999');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeCloseTo(69.87, 1);
  });

  it('celebrates (and announces) when the threshold is crossed', () => {
    const below = computeOrderTotals([{ price: 499, qty: 1 }]);
    const { rerender } = render(<FreeShippingMeter totals={below} threshold={threshold} />);
    expect(screen.queryByText(/free shipping unlocked/i)).not.toBeInTheDocument();

    const above = computeOrderTotals([
      { price: 499, qty: 1 },
      { price: 549, qty: 1 },
    ]);
    rerender(<FreeShippingMeter totals={above} threshold={threshold} />);
    expect(screen.getAllByText(/free shipping unlocked/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Free shipping unlocked.')).toBeInTheDocument(); // live region
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Free shipping unlocked',
    );
  });

  it('renders nothing for an empty cart', () => {
    const { container } = render(
      <FreeShippingMeter totals={computeOrderTotals([])} threshold={threshold} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TotalsBreakdown', () => {
  it('lists subtotal, shipping fee, total and the inclusive GST line', () => {
    const totals = computeOrderTotals([
      { price: 499, qty: 1 },
      { price: 199, qty: 1 },
    ]);
    render(<TotalsBreakdown totals={totals} taxRate={0.18} />);
    expect(screen.getByText('Subtotal').closest('div')).toHaveTextContent('₹698');
    expect(screen.getByText('Shipping').closest('div')).toHaveTextContent('₹79');
    expect(screen.getByText('Total').closest('div')).toHaveTextContent('₹777');
    expect(screen.getByText('Includes GST (18%)').closest('div')).toHaveTextContent('₹106.47');
  });

  it('shows FREE shipping over the threshold and hides GST when disabled', () => {
    const totals = computeOrderTotals([{ price: 1299, qty: 1 }]);
    render(<TotalsBreakdown totals={totals} showGstLine={false} />);
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.queryByText(/GST/)).not.toBeInTheDocument();
  });
});
