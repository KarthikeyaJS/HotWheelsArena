import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataState } from '../DataState';

describe('DataState', () => {
  it('shows a busy status with the skeleton while loading', () => {
    render(
      <DataState isLoading isError={false} skeleton={<p>skeleton</p>}>
        <p>content</p>
      </DataState>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading…');
    expect(screen.getByText('skeleton')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows a friendly error with retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataState isLoading={false} isError error={{ code: 'unavailable' }} onRetry={onRetry}>
        <p>content</p>
      </DataState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/can't reach the track/i);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty slot when empty', () => {
    render(
      <DataState isLoading={false} isError={false} isEmpty empty={<p>Your pit stop is empty</p>}>
        <p>content</p>
      </DataState>,
    );
    expect(screen.getByText('Your pit stop is empty')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders children (or a render function) when data is ready', () => {
    const renderContent = vi.fn(() => <p>content</p>);
    render(
      <DataState isLoading={false} isError={false}>
        {renderContent}
      </DataState>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(renderContent).toHaveBeenCalled();
  });
});
