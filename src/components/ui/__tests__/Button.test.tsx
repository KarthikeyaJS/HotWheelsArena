import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { IconButton } from '../IconButton';

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

describe('Button', () => {
  it('defaults to type="button" and fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start engine</Button>);
    const button = screen.getByRole('button', { name: 'Start engine' });
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('while loading: aria-busy, keeps focusability, blocks clicks, keeps its name', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Place order
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Place order' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('announces loadingText instead of the label while loading', () => {
    render(
      <Button loading loadingText="Processing…">
        Pay now
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeInTheDocument();
  });

  it('is natively disabled when disabled', () => {
    render(<Button disabled>Sold out</Button>);
    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled();
  });

  it('renders a router link with `to`', () => {
    render(
      <MemoryRouter future={ROUTER_FUTURE}>
        <Button to="/shop">Explore collection</Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Explore collection' })).toHaveAttribute(
      'href',
      '/shop',
    );
  });

  it('opens external hrefs in a new tab safely', () => {
    render(<Button href="https://example.com/rules">Rules</Button>);
    const link = screen.getByRole('link', { name: /Rules/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName('Rules (opens in a new tab)');
  });

  it('renders a disabled link as a non-navigable element', () => {
    render(
      <MemoryRouter future={ROUTER_FUTURE}>
        <Button to="/checkout" disabled>
          Checkout
        </Button>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Checkout' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('href');
  });
});

describe('IconButton', () => {
  it('uses the label as accessible name and tooltip, and exposes pressed state', () => {
    render(<IconButton label="Add to wishlist" icon={<svg />} pressed />);
    const button = screen.getByRole('button', { name: 'Add to wishlist' });
    expect(button).toHaveAttribute('title', 'Add to wishlist');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds the badge count to the accessible name', () => {
    render(<IconButton label="Pit stop cart" icon={<svg />} badge={120} badgeLabel="items" />);
    expect(screen.getByRole('button', { name: 'Pit stop cart (99+ items)' })).toBeInTheDocument();
  });
});
