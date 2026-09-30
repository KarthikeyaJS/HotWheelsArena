import { Star } from 'lucide-react';
import { ProgressBar, StarRating } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import type { ReviewSummaryData } from './reviewStats';

export interface ReviewSummaryProps {
  summary: ReviewSummaryData;
  className?: string;
}

/**
 * Rating summary: big mono average, stars, review count and the 5 → 1 distribution bars
 * (orange progress bars that fill when scrolled into view).
 */
export function ReviewSummary({ summary, className }: ReviewSummaryProps) {
  const partial = summary.sampleSize > 0 && summary.sampleSize < summary.count;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-end gap-4">
        <p className="font-mono text-5xl font-bold leading-none tabular-nums text-fg sm:text-6xl">
          {summary.average.toFixed(1)}
          <span className="ml-1 text-lg font-semibold text-muted">/5</span>
        </p>
        <div className="flex flex-col gap-1.5 pb-1">
          <StarRating value={summary.average} size="md" />
          <p className="hud text-[10px] text-muted">
            Based on {pluralize(summary.count, 'review')}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Rating breakdown">
        {summary.distribution.map((bucket) => (
          <li
            key={bucket.stars}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] items-center gap-3"
          >
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-fg">
              {bucket.stars}
              <Star aria-hidden="true" className="h-3 w-3 fill-current text-accent" />
              <span className="sr-only">{bucket.stars === 1 ? 'star' : 'stars'}</span>
            </span>
            <ProgressBar
              value={bucket.pct}
              label={`${bucket.stars}-star reviews`}
              valueText={`${formatNumber(bucket.count)} of ${formatNumber(summary.sampleSize)} reviews`}
              size="sm"
            />
            <span aria-hidden="true" className="text-right font-mono text-xs tabular-nums text-muted">
              {formatNumber(bucket.count)}
            </span>
          </li>
        ))}
      </ul>
      {partial ? (
        <p className="text-xs text-muted">
          Breakdown of the latest {formatNumber(summary.sampleSize)} reviews.
        </p>
      ) : null}
    </div>
  );
}
