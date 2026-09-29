import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { NewsletterSchema } from '@shared/schemas';
import { mutationKeys } from '@/lib/queryKeys';
import { subscribeNewsletter } from '@/services/functions';
import type { NewsletterRequest, NewsletterResponse } from '@/types';

/**
 * Newsletter sign-up via the `subscribeNewsletter` callable (validated client-side first).
 * `data.status` is `'subscribed' | 'already-subscribed'`. No toasts — render status inline.
 */
export function useSubscribeNewsletter(): UseMutationResult<
  NewsletterResponse,
  Error,
  NewsletterRequest
> {
  return useMutation({
    mutationKey: mutationKeys.newsletter,
    mutationFn: async (request: NewsletterRequest) =>
      subscribeNewsletter(NewsletterSchema.parse(request)),
  });
}
