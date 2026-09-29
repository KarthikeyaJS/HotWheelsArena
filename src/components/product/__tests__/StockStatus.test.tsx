import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LOW_STOCK_THRESHOLD } from '@/lib/product';
import { StockStatus } from '../StockStatus';

describe('StockStatus', () => {
  it('shows IN STOCK above the low-stock threshold', () => {
    const { container } = render(<StockStatus stock={LOW_STOCK_THRESHOLD + 15} />);
    expect(screen.getByText('IN STOCK')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('data-status', 'in-stock');
  });

  it('shows "ONLY N LEFT" for low stock', () => {
    const { container } = render(<StockStatus stock={3} />);
    expect(screen.getByText('ONLY 3 LEFT')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('data-status', 'low');
  });

  it('treats the threshold itself as low stock', () => {
    render(<StockStatus stock={LOW_STOCK_THRESHOLD} />);
    expect(screen.getByText(`ONLY ${LOW_STOCK_THRESHOLD} LEFT`)).toBeInTheDocument();
  });

  it('shows SOLD OUT at zero (and for invalid counts)', () => {
    const { container, rerender } = render(<StockStatus stock={0} />);
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('data-status', 'sold-out');
    rerender(<StockStatus stock={Number.NaN} />);
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
  });

  it('conveys availability in text, not colour alone', () => {
    const { container } = render(<StockStatus stock={3} />);
    expect(container).toHaveTextContent('Availability: ONLY 3 LEFT');
    // The coloured dot is decorative.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
