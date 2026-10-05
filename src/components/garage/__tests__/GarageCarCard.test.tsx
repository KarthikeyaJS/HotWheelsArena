import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GarageCarCard } from '../GarageCarCard';
import { ROUTER_FUTURE, carView } from './fixtures';

const actions = vi.hoisted(() => ({
  addToGarage: vi.fn(),
  removeFromGarage: vi.fn(),
  toggleFavorite: vi.fn(),
  setQuantity: vi.fn(),
}));

vi.mock('@/hooks/useGarageActions', () => ({
  useGarageActions: () => ({ ...actions, isPending: false, pendingProductId: null }),
}));

function renderCard(car = carView({ productId: 'revuelto', quantity: 2, isFavorite: true })) {
  const onRemove = vi.fn();
  render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <GarageCarCard car={car} onRemove={onRemove} />
    </MemoryRouter>,
  );
  return onRemove;
}

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset());
});

describe('GarageCarCard', () => {
  it('shows the HUD line, link, value and spare count', () => {
    renderCard();
    expect(screen.getByText('SERIES 03')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lamborghini Revuelto' })).toHaveAttribute(
      'href',
      '/product/revuelto',
    );
    expect(screen.getByText('₹2,598')).toBeInTheDocument();
    expect(screen.getByText('1 spare')).toBeInTheDocument();
  });

  it('toggles the favorite flag (pressed state reflects it)', () => {
    renderCard();
    const star = screen.getByRole('button', { name: 'Favorite Lamborghini Revuelto' });
    expect(star).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(star);
    expect(actions.toggleFavorite).toHaveBeenCalledWith({
      id: 'revuelto',
      name: 'Lamborghini Revuelto',
    });
  });

  it('updates copies through the stepper', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Add a copy of Lamborghini Revuelto' }));
    expect(actions.setQuantity).toHaveBeenCalledWith(
      { id: 'revuelto', name: 'Lamborghini Revuelto' },
      3,
    );
  });

  it('needs a second press to remove, and Escape disarms', () => {
    const onRemove = renderCard();
    const button = screen.getByRole('button', {
      name: 'Remove Lamborghini Revuelto from your garage',
    });
    fireEvent.click(button);
    expect(onRemove).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('data-state', 'armed');
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(button).toHaveAttribute('data-state', 'idle');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders a deleted product as a retired, unlinked card', () => {
    renderCard(carView({ productId: 'vanished-casting' }));
    expect(screen.getByRole('heading', { name: 'Unknown model' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/no longer listed/i)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
