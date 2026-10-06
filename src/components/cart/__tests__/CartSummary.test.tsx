import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { computeOrderTotals } from '@shared/commerce';
import { CartSummary, type CartSummaryProps } from '../CartSummary';
import { ROUTER_FUTURE, makeSettings } from './fixtures';

const settings = makeSettings();

function renderSummary(overrides: Partial<CartSummaryProps> = {}) {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <CartSummary
        totals={computeOrderTotals([{ price: 499, qty: 2 }], settings)}
        settings={settings}
        isVerifying={false}
        verifyError={null}
        onRetryVerify={vi.fn()}
        hasBlockers={false}
        lineLimitExcess={0}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('CartSummary', () => {
  it('lets the collector start the engine when the order fits', () => {
    renderSummary();
    const cta = screen.getByRole('link', { name: /start engine/i });
    expect(cta).toHaveAttribute('href', '/checkout');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blocks START ENGINE with the line-limit copy when the order has too many cars', () => {
    renderSummary({ lineLimitExcess: 2 });
    const hint = screen.getByRole('alert');
    expect(hint).toHaveTextContent(
      'An order can hold at most 20 different cars — remove 2 to start your engine.',
    );
    // A disabled Button-link renders as a non-navigating role="link" with aria-disabled.
    const cta = screen.getByRole('link', { name: /start engine/i });
    expect(cta).toHaveAttribute('aria-disabled', 'true');
    expect(cta).not.toHaveAttribute('href');
    expect(cta).toHaveAccessibleDescription(/remove 2 to start your engine/i);
  });
});
