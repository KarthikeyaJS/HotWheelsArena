import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFriendlyErrorMessage } from '@/lib/errors';
import type { NewsletterRequest, NewsletterResponse } from '@/types';
import { NewsletterForm } from '../NewsletterForm';

const { subscribeNewsletter } = vi.hoisted(() => ({
  subscribeNewsletter: vi.fn<(request: NewsletterRequest) => Promise<NewsletterResponse>>(),
}));

vi.mock('@/services/functions', () => ({ subscribeNewsletter }));

function renderForm(variant: 'section' | 'inline' = 'section') {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NewsletterForm variant={variant} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  subscribeNewsletter.mockReset();
});

describe('NewsletterForm', () => {
  it('validates the email inline without calling the function', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Email address'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /Join the grid/ }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });

  it('subscribes (trimmed + lower-cased) and announces success', async () => {
    subscribeNewsletter.mockResolvedValue({ status: 'subscribed' });
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Email address'), '  Racer@Garage.IN ');
    await user.click(screen.getByRole('button', { name: /Join the grid/ }));

    expect(await screen.findByText(/You're on the grid!/)).toBeInTheDocument();
    expect(subscribeNewsletter).toHaveBeenCalledWith({ email: 'racer@garage.in' });
    expect(screen.getByLabelText('Email address')).toHaveValue('');
  });

  it('tells returning subscribers they are already on the list', async () => {
    subscribeNewsletter.mockResolvedValue({ status: 'already-subscribed' });
    const user = userEvent.setup();
    renderForm('inline');
    await user.type(screen.getByLabelText('Drop alerts'), 'racer@garage.in');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(await screen.findByText(/already on the list/)).toBeInTheDocument();
  });

  it('shows a friendly error and clears it when the user edits', async () => {
    const failure = new Error('network down');
    subscribeNewsletter.mockRejectedValue(failure);
    const expected = getFriendlyErrorMessage(
      failure,
      "Couldn't sign you up — try again in a moment.",
    );
    const user = userEvent.setup();
    renderForm('inline');
    const input = screen.getByLabelText('Drop alerts');
    await user.type(input, 'racer@garage.in');
    await user.click(screen.getByRole('button', { name: 'Join' }));

    const status = await screen.findByText(expected);
    expect(status.closest('[aria-live="polite"]')).not.toBeNull();
    await user.type(input, 'x');
    expect(screen.queryByText(expected)).not.toBeInTheDocument();
  });
});
