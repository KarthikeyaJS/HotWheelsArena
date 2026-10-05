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

/** `submitReview` request plus a client-only flag that picks the success toast copy. */
export interface SubmitReviewVariables extends SubmitReviewRequest {
  /** `true` when editing an existing review ("Review updated" instead of "Review posted"). */
  isUpdate?: boolean;
}

/**
 * Submits (or updates) the signed-in collector's review via the `submitReview` callable.
 * On success: toasts ("Review posted" / "Review updated" when `isUpdate`), refetches reviews and
 * product rating aggregates. Errors are NOT toasted — render `getFriendlyErrorMessage(mutation.error)`
 * inline in the form. `isUpdate` is stripped before the request is sent.
 */
export function useSubmitReview(): UseMutationResult<
  SubmitReviewResponse,
  Error,
  SubmitReviewVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.submitReview,
    mutationFn: ({ isUpdate: _isUpdate, ...request }: SubmitReviewVariables) =>
      submitReview(request),
    onSuccess: (_response, variables) => {
      if (variables.isUpdate) {
        toast.success('Review updated', 'Your take on this machine has been refreshed.');
      } else {
        toast.success('Review posted', 'Thanks for sharing with the collector community.');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews(variables.productId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
}
