import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TotalsBreakdown } from '../TotalsBreakdown';

const totals = { subtotal: 998, shipping: 0, tax: 152.24, total: 998, itemCount: 2 };

describe('TotalsBreakdown', () => {
  it('renders the car count next to the subtotal in full-strength muted text (AA contrast)', () => {
    render(<TotalsBreakdown totals={totals} taxRate={0.18} />);
    const count = screen.getByText(/· 2 cars/);
    expect(count).toHaveClass('text-muted');
    // `text-muted/90` measured 4.48:1 on the dark card — below AA for 14px text.
    expect(count.className).not.toMatch(/text-muted\/\d+/);
  });

  it('never dims muted copy with an opacity modifier anywhere in the breakdown', () => {
    const { container } = render(<TotalsBreakdown totals={totals} taxRate={0.18} size="lg" />);
    const dimmed = Array.from(container.querySelectorAll('[class]')).filter((element) =>
      /(^|\s)text-muted\/\d+/.test(element.getAttribute('class') ?? ''),
    );
    expect(dimmed).toEqual([]);
  });
});
