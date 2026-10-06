import type { ReactNode } from 'react';
import { HudPanel } from '@/components/effects/HudPanel';
import { HudReadout } from '@/components/ui/HudReadout';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface TelemetryItem {
  label: string;
  value: ReactNode;
  unit?: string;
  /** `accent` for the live/primary readout. */
  tone?: 'default' | 'accent';
}

export interface GridTelemetryProps {
  items: readonly TelemetryItem[];
  /** HUD title (default `GRID TELEMETRY`). */
  title?: string;
  meta?: ReactNode;
  loading?: boolean;
  /**
   * The catalogue couldn't load (error state): every readout shows a neutral `—` (announced as
   * "unavailable") and the meta reads `NO SIGNAL`, instead of misleading zeros.
   */
  unavailable?: boolean;
  className?: string;
}

/** Racing-dashboard readouts for the page header (`MACHINES 24 · MAKES 12 · FROM ₹199`). */
export function GridTelemetry({
  items,
  title = 'Grid telemetry',
  meta = 'LIVE',
  loading = false,
  unavailable = false,
  className,
}: GridTelemetryProps) {
  const showUnavailable = unavailable && !loading;
  return (
    <HudPanel
      title={title}
      meta={showUnavailable ? 'NO SIGNAL' : meta}
      padding="sm"
      className={cn('bg-surface/80', className)}
      aria-busy={loading || undefined}
    >
      <ul className="grid grid-cols-3 gap-3 sm:gap-4">
        {items.map((item) => (
          <li
            key={item.label}
            className="min-w-0 border-l border-line pl-3 first:border-l-0 first:pl-0"
          >
            {loading ? (
              <div aria-hidden="true" className="flex flex-col gap-2">
                <span className="hud text-muted">{item.label}</span>
                <Skeleton className="h-7 w-14 rounded" />
              </div>
            ) : showUnavailable ? (
              <HudReadout
                label={item.label}
                value={
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">unavailable</span>
                  </>
                }
                tone="default"
                size="md"
                className="[&>span:last-child]:text-xl [&>span:last-child]:text-muted sm:[&>span:last-child]:text-2xl"
              />
            ) : (
              <HudReadout
                label={item.label}
                value={item.value}
                unit={item.unit}
                tone={item.tone ?? 'default'}
                size="md"
                className="[&>span:last-child]:text-xl sm:[&>span:last-child]:text-2xl"
              />
            )}
          </li>
        ))}
      </ul>
    </HudPanel>
  );
}
