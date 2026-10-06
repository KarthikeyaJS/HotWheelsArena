import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROUTE_SETTLE_TIMEOUT_MS, RouteAnnouncer } from '../RouteAnnouncer';

/** Mirrors useDocumentMeta: the title is set in a passive effect after the page renders. */
function TitledPage({ title, children }: { title: string; children?: ReactNode }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <>{children}</>;
}

let finishLoading: (() => void) | null = null;

/** A page that shows an aria-busy skeleton (title already set) until the test releases it. */
function SlowPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    finishLoading = () => setReady(true);
    return () => {
      finishLoading = null;
    };
  }, []);
  return (
    <TitledPage title={ready ? 'Slow car | Test' : 'Car details | Test'}>
      {ready ? (
        <h1>Slow car</h1>
      ) : (
        <div role="status" aria-busy="true">
          Loading…
        </div>
      )}
    </TitledPage>
  );
}

function Layout() {
  return (
    <>
      <button type="button">Persistent control</button>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <RouteAnnouncer />
    </>
  );
}

const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <TitledPage title="Home | Test">
            <Link to="/cars/b">Open car B</Link>
          </TitledPage>
        ),
      },
      { path: 'cars/b', element: <TitledPage title="Car B | Test" /> },
      { path: 'twin', element: <TitledPage title="Home | Test" /> },
      { path: 'slow', element: <SlowPage /> },
      {
        path: 'shop',
        element: (
          <TitledPage title="Shop | Test">
            <Link to="/shop?category=off-road" preventScrollReset>
              Off-road
            </Link>
            <Link to="/shop#faq">Jump</Link>
          </TitledPage>
        ),
      },
      { path: 'new-drops', element: <Navigate to="/shop" replace /> },
    ],
  },
];

function renderAt(path: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [path],
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  });
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
  return router;
}

const announcer = () => screen.getByRole('status', { name: '' });
const regionText = () => document.getElementById('route-announcer')?.textContent ?? null;
const main = () => document.getElementById('main-content');

afterEach(() => {
  vi.useRealTimers();
  document.title = '';
});

describe('RouteAnnouncer', () => {
  it('renders one polite, atomic, visually hidden status region that is empty on first load', async () => {
    renderAt('/');
    await waitFor(() => expect(document.title).toBe('Home | Test'));
    const region = document.getElementById('route-announcer');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveClass('sr-only');
    expect(region).toBe(announcer());
    expect(regionText()).toBe('');
  });

  it('announces the new title after a pathname change', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(document.title).toBe('Home | Test'));
    await act(() => router.navigate('/cars/b'));
    await waitFor(() => expect(regionText()).toBe('Car B | Test'));
  });

  it('moves focus to #main-content when the activated link unmounts', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const link = await screen.findByRole('link', { name: 'Open car B' });
    await user.click(link);
    await waitFor(() => expect(regionText()).toBe('Car B | Test'));
    expect(link).not.toBeInTheDocument();
    expect(main()).toHaveFocus();
  });

  it('leaves focus on a control that is still mounted', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(document.title).toBe('Home | Test'));
    const control = screen.getByRole('button', { name: 'Persistent control' });
    control.focus();
    await act(() => router.navigate('/cars/b'));
    await waitFor(() => expect(regionText()).toBe('Car B | Test'));
    expect(control).toHaveFocus();
  });

  it('ignores search-only and hash-only changes (no announcement, focus unchanged)', async () => {
    const user = userEvent.setup();
    const router = renderAt('/');
    await waitFor(() => expect(document.title).toBe('Home | Test'));
    await act(() => router.navigate('/shop'));
    await waitFor(() => expect(regionText()).toBe('Shop | Test'));

    const filter = screen.getByRole('link', { name: 'Off-road' });
    await user.click(filter);
    await waitFor(() => expect(router.state.location.search).toBe('?category=off-road'));
    document.title = 'Shop · Off-road | Test';
    await user.click(screen.getByRole('link', { name: 'Jump' }));
    await waitFor(() => expect(router.state.location.hash).toBe('#faq'));

    // Give a (wrong) announcement every chance to land before asserting it never did.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(regionText()).toBe('Shop | Test');
    expect(screen.getByRole('link', { name: 'Jump' })).toHaveFocus();
  });

  it('waits for the route loader to finish before announcing', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(document.title).toBe('Home | Test'));
    await act(() => router.navigate('/slow'));
    await waitFor(() => expect(document.title).toBe('Car details | Test'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    // The title changed but the page is still busy: nothing announced yet.
    expect(regionText()).toBe('');

    act(() => finishLoading?.());
    await waitFor(() => expect(regionText()).toBe('Slow car | Test'));
  });

  it(`announces after ${ROUTE_SETTLE_TIMEOUT_MS} ms when the title never changes`, async () => {
    const router = renderAt('/');
    await waitFor(() => expect(document.title).toBe('Home | Test'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(() => router.navigate('/twin'));
    expect(regionText()).toBe('');

    act(() => {
      vi.advanceTimersByTime(ROUTE_SETTLE_TIMEOUT_MS - 1);
    });
    expect(regionText()).toBe('');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(regionText()).toBe('Home | Test');
  });

  it('treats a load-time redirect as the initial load', async () => {
    const router = renderAt('/new-drops');
    await waitFor(() => expect(router.state.location.pathname).toBe('/shop'));
    await waitFor(() => expect(document.title).toBe('Shop | Test'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(regionText()).toBe('');
    expect(main()).not.toHaveFocus();
  });
});
