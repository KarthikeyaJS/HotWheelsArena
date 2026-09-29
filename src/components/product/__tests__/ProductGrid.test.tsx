import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import { CarImage } from '../CarImage';
import { HorizontalRail } from '../HorizontalRail';
import { ProductGrid } from '../ProductGrid';
import { makeProduct, ROUTER_FUTURE } from './fixtures';

vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isPending: false,
    pendingProductId: null,
  }),
}));

const products = [
  makeProduct({ id: 'a', slug: 'car-a', name: 'Alpha Racer' }),
  makeProduct({ id: 'b', slug: 'car-b', name: 'Bravo Runner' }),
  makeProduct({ id: 'c', slug: 'car-c', name: 'Charlie Cruiser' }),
];

describe('ProductGrid', () => {
  it('announces loading and renders skeletons', () => {
    const { container } = render(<ProductGrid products={[]} isLoading skeletonCount={3} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading cars…');
    expect(container.querySelectorAll('.shimmer').length).toBeGreaterThan(0);
  });

  it('renders the custom empty state', () => {
    render(<ProductGrid products={[]} emptyState={<p>Nothing parked here</p>} />);
    expect(screen.getByText('Nothing parked here')).toBeInTheDocument();
  });

  it('renders one list item per product', () => {
    render(
      <MemoryRouter future={ROUTER_FUTURE}>
        <ProductGrid products={products} label="Featured collection" priorityCount={1} />
      </MemoryRouter>,
    );
    const list = screen.getByRole('list', { name: 'Featured collection' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByRole('link', { name: 'Bravo Runner' })).toHaveAttribute(
      'href',
      '/product/car-b',
    );
    const images = within(list).getAllByRole('img', { name: 'Orange Twin Mill concept car' });
    expect(images[0]).toHaveAttribute('loading', 'eager');
    expect(images[0]).toHaveAttribute('fetchpriority', 'high');
    expect(images[1]).toHaveAttribute('loading', 'lazy');
  });
});

describe('HorizontalRail', () => {
  it('is a labelled carousel region with "n of N" slides', () => {
    render(
      <MemoryRouter future={ROUTER_FUTURE}>
        <HorizontalRail
          label="Just off the track"
          items={products}
          renderItem={(product) => <span>{product.name}</span>}
        />
      </MemoryRouter>,
    );
    const region = screen.getByRole('region', { name: 'Just off the track' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const slides = within(region).getAllByRole('group', { name: /of 3$/ });
    expect(slides).toHaveLength(3);
    expect(slides[0]).toHaveAttribute('aria-roledescription', 'slide');
    expect(slides[0]).toHaveAccessibleName('1 of 3');
    expect(slides[2]).toHaveTextContent('Charlie Cruiser');
  });

  it('accepts children and the ariaLabel alias', () => {
    render(
      <HorizontalRail ariaLabel="Related cars">
        <span>One</span>
        <span>Two</span>
      </HorizontalRail>,
    );
    const region = screen.getByRole('region', { name: 'Related cars' });
    expect(within(region).getAllByRole('group', { name: /of 2$/ })).toHaveLength(2);
  });
});

describe('CarImage', () => {
  it('falls back to the generic placeholder when the image fails', () => {
    render(
      <CarImage src="/placeholders/missing.svg" alt="Mystery machine" width={480} height={300} />,
    );
    const img = screen.getByRole('img', { name: 'Mystery machine' });
    expect(img).toHaveAttribute('src', '/placeholders/missing.svg');
    expect(img).toHaveAttribute('width', '480');
    expect(img).toHaveAttribute('decoding', 'async');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', FALLBACK_CAR_IMAGE);
  });
});
