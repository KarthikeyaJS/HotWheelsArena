import { BadgeCheck } from 'lucide-react';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { Chip, StarRating } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDate, formatRelative } from '@/lib/format';
import type { Review } from '@/types';

export interface ReviewItemProps {
  review: Review;
  /** Marks the signed-in collector's own review. */
  isOwn?: boolean;
  /** Reference "now" for relative dates (tests). */
  now?: number;
  className?: string;
}

/** Edits more than a minute after posting show "edited". */
const EDIT_THRESHOLD_MS = 60_000;

/**
 * One review card: avatar (Google photo or initials), name, VERIFIED BUYER badge, stars,
 * relative date (full date in `title` / `dateTime`) and the review text.
 */
export function ReviewItem({ review, isOwn = false, now, className }: ReviewItemProps) {
  const name = review.displayName.trim() || 'Collector';
  const edited =
    review.updatedAt != null &&
    review.createdAt != null &&
    review.updatedAt - review.createdAt > EDIT_THRESHOLD_MS;

  return (
    <article
      aria-label={`Review by ${name}`}
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card',
        isOwn ? 'border-accent/50' : 'border-line',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={name} photoURL={review.photoURL} size="md" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-fg">{name}</span>
              {review.verifiedBuyer ? (
                <Chip tone="success" size="sm" icon={<BadgeCheck />}>
                  Verified buyer
                </Chip>
              ) : null}
              {isOwn ? (
                <Chip tone="accent" variant="outline" size="sm">
                  Your review
                </Chip>
              ) : null}
            </p>
            <StarRating value={review.rating} size="sm" />
          </div>
        </div>
        <p className="hud shrink-0 text-[10px] text-muted">
          {review.createdAt != null ? (
            <time
              dateTime={new Date(review.createdAt).toISOString()}
              title={formatDate(review.createdAt, true)}
            >
              {formatRelative(review.createdAt, now)}
            </time>
          ) : (
            'Just now'
          )}
          {edited ? <span> · edited</span> : null}
        </p>
      </header>
      <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-fg/90">
        {review.text}
      </p>
    </article>
  );
}
