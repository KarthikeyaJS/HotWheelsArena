import { useMemo, useSyncExternalStore } from 'react';
import { HudPanel } from '@/components/effects/HudPanel';
import { Speedometer } from '@/components/effects/Speedometer';
import { Tachometer } from '@/components/effects/Tachometer';
import { cn } from '@/lib/cn';
import {
  STATIC_TELEMETRY,
  TELEMETRY_STATUS_LABEL,
  formatGearReadout,
  formatRpmReadout,
  formatSpeedReadout,
  telemetryAt,
  type ProgressStore,
  type Telemetry,
} from './telemetry';

interface HeroTelemetryProps {
  /** Sequence progress store written by the GSAP timeline. */
  store: ProgressStore;
  /** Scroll sequence active → numbers follow the scroll; otherwise a static snapshot. */
  live: boolean;
  className?: string;
}

function useHeroTelemetry(store: ProgressStore, live: boolean): Telemetry {
  const progress = useSyncExternalStore(store.subscribe, store.get, store.get);
  return useMemo(() => (live ? telemetryAt(progress) : STATIC_TELEMETRY), [live, progress]);
}

/**
 * Dashboard cluster: tachometer, gear indicator and speedometer. The needles climb with the
 * scroll sequence (each change is tweened by the gauges themselves). Decorative telemetry, so it
 * is hidden from assistive tech.
 */
export function HeroGauges({ store, live, className }: HeroTelemetryProps) {
  const telemetry = useHeroTelemetry(store, live);
  return (
    <HudPanel
      aria-hidden="true"
      title="Telemetry"
      meta={
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-glow-pulse" />
          {live ? 'Live' : 'Sim'}
        </span>
      }
      padding="sm"
      className={cn('w-fit bg-surface/60', className)}
    >
      <div className="flex items-end gap-2 xl:gap-3">
        <Tachometer rpm={telemetry.rpm} size="sm" />
        <div className="flex w-14 flex-col items-center gap-1 pb-4">
          <span className="hud text-[10px] text-muted">Gear</span>
          <span className="font-display text-4xl font-black tabular-nums leading-none text-fg">
            {telemetry.gear}
          </span>
          <span className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5, 6].map((gear) => (
              <span
                key={gear}
                className={cn(
                  'h-1 w-1.5 rounded-[1px] transition-colors duration-200',
                  gear <= telemetry.gear ? 'bg-accent' : 'bg-line',
                )}
              />
            ))}
          </span>
        </div>
        <Speedometer value={telemetry.speed} size="sm" />
      </div>
    </HudPanel>
  );
}

/** Mono readout strip: `RPM 8,200 · GEAR 4 · 214 KM/H · CRUISE MODE`. Decorative. */
export function HeroReadouts({ store, live, className }: HeroTelemetryProps) {
  const telemetry = useHeroTelemetry(store, live);
  return (
    <p
      aria-hidden="true"
      className={cn('hud flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted', className)}
    >
      <span className="text-fg">{formatRpmReadout(telemetry.rpm)}</span>
      <span>·</span>
      <span className="text-fg">{formatGearReadout(telemetry.gear)}</span>
      <span>·</span>
      <span className="text-fg">{formatSpeedReadout(telemetry.speed)}</span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden text-accent-ink sm:inline">
        {TELEMETRY_STATUS_LABEL[telemetry.status]}
      </span>
    </p>
  );
}
