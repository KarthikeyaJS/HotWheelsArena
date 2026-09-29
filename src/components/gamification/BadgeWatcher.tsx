import { ChevronsUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getBadge, levelTitle } from '@/config/gamification';
import { useAuth } from '@/hooks/useAuth';
import { formatLevel, formatNumber } from '@/lib/format';
import { toast } from '@/store/toastStore';
import type { BadgeId } from '@/types';
import { BadgeUnlockModal } from './BadgeUnlockModal';
import { diffBadgeSnapshots, snapshotFromProfile, type BadgeSnapshot } from './badgeSnapshot';

/**
 * Mounted once in AppLayout. Watches the live profile (`useAuth().profile`, pushed by the
 * `onSnapshot` listener) and celebrates badges / level-ups awarded by Cloud Functions:
 * an achievement toast per event plus a queued `BadgeUnlockModal` per badge.
 * Never fires for the first profile load, after a user switch, or after sign-out/in.
 */
export function BadgeWatcher() {
  const { profile, status } = useAuth();
  const snapshotRef = useRef<BadgeSnapshot | null>(null);
  const [queue, setQueue] = useState<BadgeId[]>([]);

  useEffect(() => {
    if (!profile) {
      // Signed out: forget everything so the next sign-in starts from a fresh baseline.
      if (status === 'signed-out') {
        snapshotRef.current = null;
        setQueue([]);
      }
      return;
    }

    const next = snapshotFromProfile(profile);
    const diff = diffBadgeSnapshots(snapshotRef.current, next);
    snapshotRef.current = next;

    if (diff.baseline) {
      setQueue([]);
      return;
    }

    for (const id of diff.unlocked) {
      const badge = getBadge(id);
      toast.achievement(
        'BADGE UNLOCKED',
        `${badge.title} · +${formatNumber(badge.xpReward)} XP`,
        badge.emoji,
      );
    }
    if (diff.unlocked.length > 0) {
      setQueue((current) => [...current, ...diff.unlocked.filter((id) => !current.includes(id))]);
    }
    if (diff.levelUp !== null) {
      toast.achievement(
        `LEVEL UP — ${formatLevel(diff.levelUp)}`,
        `New rank: ${levelTitle(diff.levelUp)}`,
        <ChevronsUp aria-hidden="true" />,
      );
    }
  }, [profile, status]);

  const showNext = useCallback(() => setQueue((current) => current.slice(1)), []);
  const clearQueue = useCallback(() => setQueue([]), []);
  const current = queue[0] ?? null;

  return (
    <BadgeUnlockModal
      badgeId={current}
      open={current !== null}
      onClose={showNext}
      onViewAll={clearQueue}
      queueCount={Math.max(0, queue.length - 1)}
    />
  );
}
