import { Gem, Lock } from 'lucide-react';
import { HudPanel } from '@/components/effects/HudPanel';
import { ProgressBar } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber, formatPercent, padNumber } from '@/lib/format';
import { limitedEditionInfo } from '@/lib/product';
import type { Product } from '@/types';

export interface LimitedEditionPanelProps {
  product: Pick<Product, 'limitedEdition' | 'stock' | 'isVault' | 'name'>;
  className?: string;
}

/**
 * Vault block: LIMITED EDITION `#001/500`, "Only N remaining" and a striped yellow progress bar
 * of the edition claimed. Stock is the static counter from the product document. Vault cars
 * without edition data get a compact "VAULT EXCLUSIVE" strip. Renders nothing for regular cars.
 */
export function LimitedEditionPanel({ product, className }: LimitedEditionPanelProps) {
  const info = limitedEditionInfo(product);

  if (!info) {
    if (!product.isVault) return null;
    return (
      <HudPanel tone="highlight" padding="sm" className={className}>
        <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-hud text-highlight-ink">
          <Gem aria-hidden="true" className="h-4 w-4" />
          Vault exclusive
        </p>
      </HudPanel>
    );
  }

  const claimed = info.editionSize - info.remaining;
  const soldOut = info.remaining === 0;

  return (
    <HudPanel
      tone="highlight"
      padding="sm"
      title="Limited edition"
      meta={<span className="font-bold text-highlight-ink">{info.label}</span>}
      className={cn('shadow-glow-highlight', className)}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-fg">
            {soldOut ? (
              <span className="inline-flex items-center gap-2">
                <Lock aria-hidden="true" className="h-4 w-4 text-highlight-ink" />
                Edition fully claimed
              </span>
            ) : (
              <>
                Only{' '}
                <span className="text-base tabular-nums text-highlight-ink">
                  {formatNumber(info.remaining)}
                </span>{' '}
                remaining
              </>
            )}
          </p>
          <p aria-hidden="true" className="hud text-[10px] text-muted">
            {formatPercent(info.claimedPct)} claimed
          </p>
        </div>
        <ProgressBar
          value={claimed}
          max={info.editionSize}
          label="Edition claimed"
          valueText={`${formatNumber(claimed)} of ${formatNumber(info.editionSize)} claimed, ${formatNumber(info.remaining)} remaining`}
          tone="highlight"
          size="md"
          striped
        />
        <p className="text-xs text-muted">
          Numbered release — this is edition{' '}
          <span className="font-mono text-fg">#{padNumber(info.editionNumber, 3)}</span> of{' '}
          <span className="font-mono text-fg">{formatNumber(info.editionSize)}</span>.
        </p>
      </div>
    </HudPanel>
  );
}
