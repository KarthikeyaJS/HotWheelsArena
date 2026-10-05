import { HudPanel } from '@/components/effects/HudPanel';
import { HudReadout } from '@/components/ui/HudReadout';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatNumber, formatPercent } from '@/lib/format';
import type { VaultSummary } from './vaultFilters';

export interface VaultStatusPanelProps {
  summary: VaultSummary | null;
  isLoading?: boolean;
  className?: string;
}

/** Hero HUD: editions in the vault, cars left, rarest run and the overall claimed meter. */
export function VaultStatusPanel({ summary, isLoading = false, className }: VaultStatusPanelProps) {
  return (
    <HudPanel
      title="Vault status"
      meta="Static count"
      tone="highlight"
      className={cn('bg-card', className)}
    >
      {isLoading || !summary ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-5">
          <span className="sr-only">Loading vault status…</span>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton variant="text" className="w-16" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2.5 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <HudReadout label="Editions" value={formatNumber(summary.editions)} />
            <HudReadout
              label="Cars left"
              value={formatNumber(summary.remaining)}
              tone="highlight"
            />
            <HudReadout
              label="Rarest run"
              value={summary.rarestRun === null ? '—' : formatNumber(summary.rarestRun)}
              unit={summary.rarestRun === null ? undefined : 'pcs'}
            />
          </div>
          {summary.totalRun > 0 ? (
            <ProgressBar
              value={summary.claimedPct}
              label="Vault claimed"
              tone="highlight"
              size="md"
              showValue
              valueLabel={`${formatPercent(summary.claimedPct)} of all numbered runs claimed`}
              valueText={`${formatPercent(summary.claimedPct)} of ${formatNumber(summary.totalRun)} numbered cars claimed`}
              striped
            />
          ) : null}
        </div>
      )}
    </HudPanel>
  );
}
