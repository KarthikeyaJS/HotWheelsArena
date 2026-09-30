import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { Review } from '@/types';
import { ReviewItem } from './ReviewItem';
import { REVIEWS_INITIAL_VISIBLE } from './reviewStats';

export interface ReviewListProps {
  /** Already ordered (own review first, then newest). */
  reviews: readonly Review[];
  /** Signed-in uid (marks "Your review"). */
  uid: string | null;
  /** Reviews visible before "Show more" (default 6). */
  initialVisible?: number;
  className?: string;
}

/**
 * Review cards with progressive disclosure: the first `initialVisible`, then "Show more" reveals
 * the rest and moves focus to the first newly shown review.
 */
export function ReviewList({
  reviews,
  uid,
  initialVisible = REVIEWS_INITIAL_VISIBLE,
  className,
}: ReviewListProps) {
  const [expanded, setExpanded] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  const hidden = Math.max(0, reviews.length - initialVisible);
  const visible = expanded ? reviews : reviews.slice(0, initialVisible);

  useEffect(() => {
    if (focusIndex === null) return;
    itemRefs.current[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ul className="flex flex-col gap-4" aria-label="Collector reviews">
        {visible.map((review, index) => (
          <li
            key={review.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            tabIndex={-1}
            className="rounded-xl"
          >
            <ReviewItem review={review} isOwn={uid !== null && review.uid === uid} />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <Button
          variant="outline"
          fullWidth
          rightIcon={<ChevronDown className={cn(expanded && 'rotate-180')} />}
          aria-expanded={expanded}
          onClick={() => {
            if (expanded) {
              setExpanded(false);
              return;
            }
            setExpanded(true);
            setFocusIndex(initialVisible);
          }}
        >
          {expanded ? 'Show fewer reviews' : `Show ${formatNumber(hidden)} more`}
        </Button>
      ) : null}
    </div>
  );
}
