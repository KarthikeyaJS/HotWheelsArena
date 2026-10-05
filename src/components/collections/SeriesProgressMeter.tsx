import { CheckCircle2 } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { SeriesCompletion } from '@/types';

export interface SeriesProgressMeterProps {
  progress: SeriesCompletion;
  seriesName: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** "3/7 in your garage" readout + progress bar (green with a check when the series is complete). */
export function SeriesProgressMeter({
  progress,
  seriesName,
  size = 'sm',
  className,
}: SeriesProgressMeterProps) {
  const { owned, total, complete } = progress;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em]">
        <p className="font-bold text-fg">
          <span className={cn('tabular-nums', size === 'md' && 'text-base')}>
            {formatNumber(owned)}/{formatNumber(total)}
          </span>{' '}
          <span className="text-muted">in your garage</span>
        </p>
        {complete ? (
          <p className="inline-flex items-center gap-1 font-bold text-success">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            Complete
          </p>
        ) : null}
      </div>
      <ProgressBar
        value={owned}
        max={Math.max(total, 1)}
        label={`${seriesName} completion`}
        valueText={`${formatNumber(owned)} of ${formatNumber(total)} cars in your garage`}
        tone={complete ? 'success' : 'accent'}
        size={size === 'md' ? 'md' : 'sm'}
      />
    </div>
  );
}
