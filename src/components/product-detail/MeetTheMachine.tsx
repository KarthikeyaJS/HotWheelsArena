import { Award, Gauge, Gem, Zap } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { HudPanel } from '@/components/effects/HudPanel';
import { Speedometer } from '@/components/effects/Speedometer';
import { StatBar } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Product } from '@/types';
import {
  MACHINE_STATS_NOTE,
  MACHINE_STAT_CEILINGS,
  buildMachineStats,
  type MachineStatId,
} from './machineStats';

export interface MeetTheMachineProps {
  product: Pick<Product, 'themedStats' | 'rarityScore' | 'collectorScore' | 'name'>;
  className?: string;
}

const STAT_ICONS: Readonly<Record<MachineStatId, ReactNode>> = {
  'top-speed': <Gauge />,
  power: <Zap />,
  rarity: <Gem />,
  collector: <Award />,
};

/**
 * "Meet the Machine" telemetry panel: a decorative speedometer plus four segmented stat bars
 * (TOP SPEED on a 450 km/h scale, POWER on 1,600 hp, RARITY and COLLECTOR out of 10) that fill
 * when scrolled into view (instant for reduced motion), and the themed-specs disclaimer.
 */
export function MeetTheMachine({ product, className }: MeetTheMachineProps) {
  const stats = useMemo(() => buildMachineStats(product), [product]);

  return (
    <HudPanel
      title="Performance readout"
      meta="SIM DATA"
      padding="lg"
      className={cn('flex flex-col', className)}
    >
      <div className="mb-6 grid flex-1 items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="hidden justify-center md:flex">
          <Speedometer
            value={product.themedStats.topSpeedKmh}
            max={MACHINE_STAT_CEILINGS.topSpeedKmh}
            label="SPEED"
            size="lg"
          />
        </div>
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2" aria-label={`${product.name} stats`}>
          {stats.map((stat) => (
            <li key={stat.id} data-stat={stat.id}>
              <StatBar
                label={stat.label}
                value={stat.value}
                max={stat.max}
                display={stat.display}
                tone={stat.tone}
                icon={STAT_ICONS[stat.id]}
              />
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-auto border-t border-line pt-4 text-xs italic text-muted">
        {MACHINE_STATS_NOTE}
      </p>
    </HudPanel>
  );
}
