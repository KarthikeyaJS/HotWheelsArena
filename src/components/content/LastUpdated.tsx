import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { isoDateToMillis } from './dates';

export interface LastUpdatedProps {
  /** ISO calendar date, e.g. `2026-10-01` (interpreted in IST). */
  date: string;
  label?: string;
  className?: string;
}

/** "Last updated · 1 Oct 2026" HUD line with a machine-readable `<time>`. */
export function LastUpdated({ date, label = 'Last updated', className }: LastUpdatedProps) {
  return (
    <p className={cn('hud inline-flex items-center gap-2 text-muted', className)}>
      <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
      <span>{label}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={date} className="text-fg">
        {formatDate(isoDateToMillis(date))}
      </time>
    </p>
  );
}
