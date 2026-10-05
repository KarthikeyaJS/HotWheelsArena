import { Archive, Gauge, Hash, Trophy, type LucideIcon } from 'lucide-react';
import { RARITY_XP_BONUS, getBadge } from '@/config/gamification';
import { cn } from '@/lib/cn';
import { formatNumber, padNumber } from '@/lib/format';
import type { Product } from '@/types';
import { vaultRemaining } from './vaultFilters';

export interface EditionExplainerProps {
  /** A real vault car used for the worked example (falls back to #001/500, 37 left). */
  example?: Product | null;
  headingId?: string;
  className?: string;
}

interface EditionContext {
  /** Padded edition number (`003`). */
  number: string;
  /** Padded run size (`050`). */
  size: string;
  /** Plain edition number for prose (`3`). */
  rawNumber: string;
  /** Plain run size for prose (`50`). */
  rawSize: string;
  remaining: string;
}

interface EditionStep {
  id: string;
  icon: LucideIcon;
  title: string;
  body: (context: EditionContext) => string;
}

const STEPS: readonly EditionStep[] = [
  {
    id: 'numbered',
    icon: Hash,
    title: 'A numbered run',
    body: ({ number, size, rawNumber, rawSize }) =>
      `#${number}/${size} means edition number ${rawNumber} of a ${rawSize}-piece run. The run size is fixed when the edition is announced and is never reprinted.`,
  },
  {
    id: 'static',
    icon: Gauge,
    title: 'Static remaining counts',
    body: ({ remaining }) =>
      `“Only ${remaining} remaining” comes from our stock sheet and is refreshed by the pit crew — it doesn’t tick down live. A car is yours once your order is confirmed.`,
  },
  {
    id: 'gone',
    icon: Archive,
    title: 'Gone means gone',
    body: () =>
      'When a run sells out it stays in the vault as a record of the drop, but it is never restocked. Drop alerts are the best way not to miss the next one.',
  },
  {
    id: 'rewards',
    icon: Trophy,
    title: 'Rare rewards',
    body: () =>
      `Every limited car earns +${RARITY_XP_BONUS.limited} bonus XP and your first rare find unlocks the ${getBadge('treasure-hunter').title} badge.`,
  },
];

/** "How editions work": an edition-plate diagram (#001/500) plus four short rules. */
export function EditionExplainer({ example, headingId, className }: EditionExplainerProps) {
  const edition = example?.limitedEdition;
  const rawNumber = edition?.editionNumber ?? 1;
  const rawSize = edition?.editionSize ?? 500;
  const editionNumber = padNumber(rawNumber, 3);
  const editionSize = padNumber(rawSize, 3);
  const remaining = formatNumber(example && edition ? vaultRemaining(example) : 37);

  return (
    <div className={cn('grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12', className)}>
      {/* Edition plate */}
      <figure className="relative overflow-hidden rounded-2xl border border-highlight/40 bg-card p-6 shadow-card sm:p-8 lg:col-span-5">
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(var(--text)/0.025)_0_1px,transparent_1px_4px)]"
        />
        <span
          aria-hidden="true"
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-highlight/10 blur-3xl"
        />
        <p className="hud relative text-muted">Edition plate</p>
        <div
          className="relative mt-5 flex items-end gap-2 font-mono font-bold tabular-nums leading-none"
          aria-hidden="true"
        >
          <span className="text-5xl text-highlight-ink sm:text-6xl">#{editionNumber}</span>
          <span className="pb-1 text-3xl text-muted sm:text-4xl">/</span>
          <span className="pb-1 text-3xl text-fg sm:text-4xl">{editionSize}</span>
        </div>
        <dl className="relative mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <div>
            <dt className="hud text-muted">Edition no.</dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-fg">
              {editionNumber}
            </dd>
          </div>
          <div>
            <dt className="hud text-muted">Run size</dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-fg">{editionSize}</dd>
          </div>
          <div>
            <dt className="hud text-muted">Remaining</dt>
            <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-highlight-ink">
              {remaining}
            </dd>
          </div>
        </dl>
        <figcaption className="relative mt-4 text-sm text-muted">
          {example && edition ? (
            <>
              Example: <span className="font-semibold text-fg">{example.name}</span>
            </>
          ) : (
            'Example edition plate'
          )}
        </figcaption>
      </figure>

      {/* Rules */}
      <ol aria-labelledby={headingId} className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-line bg-card p-5 shadow-card"
          >
            <span aria-hidden="true" className="racing-stripe" />
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-accent-ink"
              >
                <step.icon className="h-4 w-4" />
              </span>
              <span aria-hidden="true" className="font-mono text-xs font-bold text-muted">
                {padNumber(index + 1)}
              </span>
            </div>
            <h3 className="text-sm leading-snug text-fg">{step.title}</h3>
            <p className="text-sm leading-6 text-muted">
              {step.body({
                number: editionNumber,
                size: editionSize,
                rawNumber: formatNumber(rawNumber),
                rawSize: formatNumber(rawSize),
                remaining,
              })}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
