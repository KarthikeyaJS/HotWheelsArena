/**
 * Gamification barrel: `import { XpBar, BadgeGrid… } from '@/components/gamification'`.
 * Rules live in `@shared/gamification` (re-exported by `@/config/gamification`).
 */
export { LevelBadge, type LevelBadgeProps, type LevelBadgeSize } from './LevelBadge';
export { XpBar, type XpBarProps } from './XpBar';
export { BadgeCard, type BadgeCardProps } from './BadgeCard';
export { BadgeGrid, type BadgeGridProps } from './BadgeGrid';
export { BadgeUnlockModal, type BadgeUnlockModalProps } from './BadgeUnlockModal';
export { BadgeWatcher } from './BadgeWatcher';
export {
  diffBadgeSnapshots,
  snapshotFromProfile,
  type BadgeSnapshot,
  type BadgeSnapshotDiff,
} from './badgeSnapshot';
