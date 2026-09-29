import { useMemo } from 'react';
import { BADGES, badgeProgress } from '@/config/gamification';
import { cn } from '@/lib/cn';
import type { BadgeId, BadgeProgress, UserStats } from '@/types';
import { BadgeCard } from './BadgeCard';

export interface BadgeGridProps {
  /** Badges the server has awarded (`profile.badges`). Falls back to what `stats` satisfy. */
  unlocked?: readonly BadgeId[];
  /** Collector stats → progress bars on locked badges. */
  stats?: Partial<UserStats>;
  size?: 'sm' | 'md';
  /** Columns on large screens (default 3 for `md`, 1 for `sm`). */
  columns?: 1 | 2 | 3 | 5;
  showProgress?: boolean;
  className?: string;
}

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
} as const;

/** Every badge in `BADGES` order, locked or unlocked, with progress. */
export function BadgeGrid({
  unlocked,
  stats,
  size = 'md',
  columns,
  showProgress = true,
  className,
}: BadgeGridProps) {
  const progress = useMemo(() => badgeProgress(stats ?? {}), [stats]);
  const progressById = useMemo(
    () => new Map<BadgeId, BadgeProgress>(progress.map((entry) => [entry.id, entry])),
    [progress],
  );
  const unlockedSet = useMemo(
    () =>
      new Set<BadgeId>(
        unlocked ?? progress.filter((entry) => entry.unlocked).map((entry) => entry.id),
      ),
    [unlocked, progress],
  );

  return (
    <ul className={cn('grid gap-4', COLUMNS[columns ?? (size === 'sm' ? 1 : 3)], className)}>
      {BADGES.map((badge) => (
        <li key={badge.id} className="min-w-0">
          <BadgeCard
            badgeId={badge.id}
            unlocked={unlockedSet.has(badge.id)}
            progress={progressById.get(badge.id)}
            size={size}
            showProgress={showProgress}
          />
        </li>
      ))}
    </ul>
  );
}
