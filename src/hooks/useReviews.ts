import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { STALE_TIMES, mutationKeys, queryKeys } from '@/lib/queryKeys';
import { fetchReviews } from '@/services/firestore/reviews';
import { submitReview } from '@/services/functions';
import { toast } from '@/store/toastStore';
import type { Review, SubmitReviewRequest, SubmitReviewResponse } from '@/types';

/** Latest 20 reviews for a product (newest first). */
export function useReviews(productId: string | undefined): UseQueryResult<Review[]> {
  return useQuery({
    queryKey: queryKeys.reviews(productId ?? ''),
    queryFn: productId ? () => fetchReviews(productId) : skipToken,
    staleTime: STALE_TIMES.reviews,
  });
}

/**
 * Submits (or updates) the signed-in collector's review via the `submitReview` callable.
 * On success: toasts, refetches reviews and product rating aggregates. Errors are NOT toasted —
 * render `getFriendlyErrorMessage(mutation.error)` inline in the form.
 */
export function useSubmitReview(): UseMutationResult<
  SubmitReviewResponse,
  Error,
  SubmitReviewRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.submitReview,
    mutationFn: (request: SubmitReviewRequest) => submitReview(request),
    onSuccess: (_response, request) => {
      toast.success('Review posted', 'Thanks for sharing with the collector community.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews(request.productId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
}
