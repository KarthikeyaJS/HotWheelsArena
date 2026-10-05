import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FactItem {
  /** Stable key. */
  id: string;
  label: string;
  /** Big mono value (`1–2 DAYS`, `₹999`). */
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
}

export interface FactGridProps {
  items: readonly FactItem[];
  /** Accessible name for the list of facts. */
  label: string;
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMNS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
} as const;

/** HUD "key facts" tiles (`<dl>`): dispatch time, delivery window, returns window… */
export function FactGrid({ items, label, columns = 4, className }: FactGridProps) {
  return (
    <dl aria-label={label} className={cn('grid gap-3 sm:gap-4', COLUMNS[columns], className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card transition-colors duration-200 hover:bg-card-hover sm:p-5"
        >
          <span aria-hidden="true" className="racing-stripe" />
          <dt className="hud flex items-center gap-2 text-muted">
            {item.icon ? (
              <span aria-hidden="true" className="text-accent-ink [&_svg]:h-4 [&_svg]:w-4">
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </dt>
          <dd className="font-mono text-2xl font-bold tabular-nums leading-none text-fg">
            {item.value}
          </dd>
          {item.detail ? <dd className="text-sm leading-6 text-muted">{item.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
