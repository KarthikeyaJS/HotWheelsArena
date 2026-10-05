import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ROUTER_FUTURE } from '@/components/content/__tests__/fixtures';
import { FaqBoard } from '../FaqBoard';
import type { FaqGroup } from '../faqData';

const GROUPS: FaqGroup[] = [
  {
    id: 'orders',
    title: 'Orders & Shipping',
    description: 'Delivery questions.',
    items: [
      { id: 'faq-one', question: 'How long does delivery take?', answer: ['3–7 business days.'] },
      {
        id: 'faq-two',
        question: 'Is shipping free?',
        answer: ['Above the threshold.'],
        links: [{ label: 'Your pit stop', to: '/cart' }],
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments — test mode',
    description: 'Simulated checkout.',
    items: [{ id: 'faq-three', question: 'Are payments real?', answer: ['No, test mode.'] }],
  },
];

function renderBoard(initialEntry = '/faq') {
  return render(
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={[initialEntry]}>
      <FaqBoard groups={GROUPS} />
    </MemoryRouter>,
  );
}

const trigger = (name: string) => screen.getByRole('button', { name });
/** Answer panels currently exposed (group <section>s are labelled regions too). */
const openPanels = () =>
  screen.queryAllByRole('region').filter((element) => element.id.endsWith('-panel'));

describe('FaqBoard (WAI-ARIA accordion)', () => {
  it('renders grouped h2 sections with h3-wrapped disclosure buttons, all collapsed', () => {
    renderBoard();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Orders & Shipping' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Payments — test mode' }),
    ).toBeInTheDocument();

    const button = trigger('How long does delivery take?');
    expect(button.closest('h3')).not.toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const panelId = button.getAttribute('aria-controls');
    expect(panelId).toBe('faq-one-panel');
    const panel = document.getElementById(panelId ?? '');
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-labelledby', button.id);
    expect(panel).not.toBeVisible();
    expect(openPanels()).toHaveLength(0);
  });

  it('toggles a panel with click, Enter and Space', async () => {
    const user = userEvent.setup();
    renderBoard();
    const button = trigger('Is shipping free?');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: 'Is shipping free?' });
    expect(region).toBeVisible();
    expect(within(region).getByText('Above the threshold.')).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: /your pit stop/i })).toHaveAttribute(
      'href',
      '/cart',
    );

    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps items independent (several can be open)', async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(trigger('How long does delivery take?'));
    await user.click(trigger('Are payments real?'));
    expect(openPanels()).toHaveLength(2);
  });

  it('moves focus between questions with arrow keys, Home and End (across groups)', async () => {
    const user = userEvent.setup();
    renderBoard();
    trigger('How long does delivery take?').focus();

    await user.keyboard('{ArrowDown}');
    expect(trigger('Is shipping free?')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(trigger('Are payments real?')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(trigger('How long does delivery take?')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(trigger('Are payments real?')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(trigger('How long does delivery take?')).toHaveFocus();
    await user.keyboard('{End}');
    expect(trigger('Are payments real?')).toHaveFocus();
  });

  it('opens the deep-linked question from the URL hash', () => {
    renderBoard('/faq#faq-three');
    expect(trigger('Are payments real?')).toHaveAttribute('aria-expanded', 'true');
    expect(trigger('Is shipping free?')).toHaveAttribute('aria-expanded', 'false');
  });

  it('gives every question a permalink to its anchor', () => {
    renderBoard();
    expect(
      screen.getByRole('link', { name: 'Link to this question: Is shipping free?' }),
    ).toHaveAttribute('href', '/faq#faq-two');
  });

  it('expands and collapses everything', async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(screen.getByRole('button', { name: /expand all/i }));
    expect(openPanels()).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(openPanels()).toHaveLength(0);
  });
});
