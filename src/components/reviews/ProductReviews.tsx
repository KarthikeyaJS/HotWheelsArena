import { MessageSquare } from 'lucide-react';
import { forwardRef, useMemo, type ReactNode } from 'react';
import { DataState } from '@/components/common/DataState';
import { EmptyState, SectionHeading, Skeleton, StarRating } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useReviews } from '@/hooks/useReviews';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { Product } from '@/types';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';
import { ReviewSignInPanel } from './ReviewSignInPanel';
import { ReviewSummary } from './ReviewSummary';
import { orderReviews, resolveReviewSummary } from './reviewStats';

export interface ProductReviewsProps {
  product: Pick<Product, 'id' | 'name' | 'ratingAvg' | 'ratingCount'>;
  className?: string;
}

/** Anchor id of the section (the rating link on the page scrolls here). */
export const REVIEWS_SECTION_ID = 'reviews';
const HEADING_ID = 'reviews-title';

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-14 w-40" />
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className="h-2.5 w-full" />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" className="h-10 w-10" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton variant="text" lines={3} />
        </div>
      ))}
    </div>
  );
}

/**
 * Reviews section (`id="reviews"`): rating summary with the 5 → 1 distribution, the write/edit
 * form for signed-in collectors (Google sign-in prompt otherwise) and the review list with
 * "Show more". The ref lands on the section (focusable with `tabIndex=-1`) so the page can move
 * focus here after scrolling.
 */
export const ProductReviews = forwardRef<HTMLElement, ProductReviewsProps>(function ProductReviews(
  { product, className },
  ref,
) {
  const reviewsQuery = useReviews(product.id);
  const { user, profile, status } = useAuth();
  const uid = user?.uid ?? null;

  const reviews = useMemo(() => reviewsQuery.data ?? [], [reviewsQuery.data]);
  const ordered = useMemo(() => orderReviews(reviews, uid), [reviews, uid]);
  const summary = useMemo(
    () =>
      resolveReviewSummary(reviews, {
        ratingAvg: product.ratingAvg,
        ratingCount: product.ratingCount,
      }),
    [reviews, product.ratingAvg, product.ratingCount],
  );
  const ownReview = useMemo(
    () => (uid ? (reviews.find((review) => review.id === uid || review.uid === uid) ?? null) : null),
    [reviews, uid],
  );

  const authorName = profile?.displayName || user?.displayName || 'Collector';
  const authorPhoto = profile?.photoURL ?? user?.photoURL ?? null;
  const retry = () => void reviewsQuery.refetch();

  let formArea: ReactNode;
  if (status === 'loading' || (status === 'signed-in' && reviewsQuery.isLoading)) {
    formArea = (
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5" aria-hidden="true">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  } else if (status === 'signed-in') {
    formArea = (
      <div className="rounded-xl border border-line bg-card p-5 shadow-card sm:p-6">
        <ReviewForm
          productId={product.id}
          productName={product.name}
          existingReview={ownReview}
          authorName={authorName}
          authorPhotoURL={authorPhoto}
        />
      </div>
    );
  } else {
    formArea = <ReviewSignInPanel productName={product.name} />;
  }

  return (
    <section
      ref={ref}
      id={REVIEWS_SECTION_ID}
      aria-labelledby={HEADING_ID}
      tabIndex={-1}
      className={cn('flex flex-col gap-8 focus:outline-none', className)}
    >
      <SectionHeading
        id={HEADING_ID}
        eyebrow={
          summary.count > 0 ? `PIT TALK · ${pluralize(summary.count, 'review')}` : 'PIT TALK'
        }
        title="Collector reviews"
        description="Straight from collectors who parked this machine in their garage."
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="rounded-xl border border-line bg-card p-5 shadow-card sm:p-6">
            <DataState
              isLoading={reviewsQuery.isLoading}
              isError={reviewsQuery.isError}
              error={reviewsQuery.error}
              onRetry={retry}
              errorCompact
              errorTitle="Ratings stalled"
              isEmpty={summary.count === 0}
              skeleton={<SummarySkeleton />}
              loadingLabel="Loading ratings…"
              empty={
                <div className="flex flex-col gap-2">
                  <StarRating value={0} size="md" />
                  <p className="font-display text-base font-bold uppercase tracking-display text-fg">
                    No ratings yet
                  </p>
                  <p className="text-sm text-muted">
                    This machine is still waiting for its first lap report.
                  </p>
                </div>
              }
            >
              {() => <ReviewSummary summary={summary} />}
            </DataState>
          </div>
          {formArea}
        </div>

        <div className="min-w-0 lg:col-span-7">
          <DataState
            isLoading={reviewsQuery.isLoading}
            isError={reviewsQuery.isError}
            error={reviewsQuery.error}
            onRetry={retry}
            errorTitle="Reviews stalled"
            isEmpty={ordered.length === 0}
            skeleton={<ListSkeleton />}
            loadingLabel="Loading reviews…"
            empty={
              <EmptyState
                icon={<MessageSquare />}
                title="No pit talk yet"
                description={`Be the first collector to review the ${product.name}.`}
                titleAs="h3"
              />
            }
          >
            {() => <ReviewList reviews={ordered} uid={uid} />}
          </DataState>
        </div>
      </div>
    </section>
  );
});
