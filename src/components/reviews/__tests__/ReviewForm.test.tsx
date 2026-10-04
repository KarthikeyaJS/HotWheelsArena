import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/store/toastStore';
import type { Review, SubmitReviewRequest, SubmitReviewResponse } from '@/types';
import { ReviewForm } from '../ReviewForm';

const { submitReview } = vi.hoisted(() => ({
  submitReview: vi.fn<(request: SubmitReviewRequest) => Promise<SubmitReviewResponse>>(),
}));

vi.mock('@/services/functions', () => ({ submitReview }));

const existing: Review = {
  id: 'uid-1',
  productId: 'twin-mill-orange',
  uid: 'uid-1',
  displayName: 'Arjun Mehta',
  photoURL: null,
  rating: 4,
  text: 'Great chrome engine and a solid base.',
  verifiedBuyer: false,
  createdAt: 1_760_000_000_000,
  updatedAt: 1_760_000_000_000,
};

function renderForm(existingReview: Review | null = null) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReviewForm
        productId="twin-mill-orange"
        productName="Twin Mill"
        existingReview={existingReview}
        authorName="Arjun Mehta"
        authorPhotoURL={null}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  submitReview.mockReset();
  useToastStore.getState().clear();
});

describe('ReviewForm', () => {
  it('validates rating and text with the shared schema before submitting', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Post review' }));

    expect(await screen.findByText('Pick a star rating')).toBeInTheDocument();
    expect(
      screen.getByText('Tell other collectors a bit more (at least 10 characters)'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Your rating for Twin Mill/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/Your review/)).toHaveAttribute('aria-invalid', 'true');
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('rejects text that is only whitespace padding around a short note', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: /4 stars/ }));
    await user.type(screen.getByLabelText(/Your review/), '   short    ');
    await user.click(screen.getByRole('button', { name: 'Post review' }));

    expect(
      await screen.findByText('Tell other collectors a bit more (at least 10 characters)'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Pick a star rating')).not.toBeInTheDocument();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('submits a trimmed review, toasts and confirms inline', async () => {
    submitReview.mockResolvedValue({ reviewId: 'uid-1' });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: /5 stars/ }));
    await user.type(screen.getByLabelText(/Your review/), '  Stunning paint, perfect wheels.  ');
    await user.click(screen.getByRole('button', { name: 'Post review' }));

    expect(await screen.findByText(/Your review is live on the grid/)).toBeInTheDocument();
    expect(submitReview).toHaveBeenCalledWith({
      productId: 'twin-mill-orange',
      rating: 5,
      text: 'Stunning paint, perfect wheels.',
    });
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ title: 'Review posted', variant: 'success' }),
    ]);
  });

  it('shows a friendly inline error when the server rejects the review', async () => {
    submitReview.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: /3 stars/ }));
    await user.type(screen.getByLabelText(/Your review/), 'Decent casting overall.');
    await user.click(screen.getByRole('button', { name: 'Post review' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Your review is live/)).not.toBeInTheDocument();
  });

  it('prefills the collector’s existing review and enables Update only after a change', async () => {
    submitReview.mockResolvedValue({ reviewId: 'uid-1' });
    const user = userEvent.setup();
    renderForm(existing);

    expect(screen.getByRole('heading', { name: 'Edit your review' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Your review/)).toHaveValue(existing.text);
    expect(screen.getByRole('radio', { name: /4 stars/ })).toBeChecked();
    const update = screen.getByRole('button', { name: 'Update review' });
    expect(update).toBeDisabled();

    await user.type(screen.getByLabelText(/Your review/), ' Wheels are spot on.');
    expect(update).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();

    await user.click(update);
    expect(submitReview).toHaveBeenCalledWith({
      productId: 'twin-mill-orange',
      rating: 4,
      text: `${existing.text} Wheels are spot on.`,
    });
  });
});
