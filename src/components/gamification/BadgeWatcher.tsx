import { ChevronsUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { getBadge, levelTitle } from '@/config/gamification';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { formatLevel, formatNumber } from '@/lib/format';
import { toast } from '@/store/toastStore';
import type { BadgeId } from '@/types';
import { BadgeUnlockModal } from './BadgeUnlockModal';
import { diffBadgeSnapshots, snapshotFromProfile, type BadgeSnapshot } from './badgeSnapshot';

/**
 * Routes where the unlock MODAL is skipped (toasts still fire): the order-success page is itself
 * the celebration (it lists the badges the order unlocked), and the checkout route is included
 * because the live profile snapshot carrying those badges can land a moment before the checkout
 * navigates to the success page.
 */
const MODAL_FREE_ROUTES: readonly string[] = [ROUTES.orderSuccess, ROUTES.checkout];

function isModalFreeRoute(pathname: string): boolean {
  return MODAL_FREE_ROUTES.some((pattern) => matchPath(pattern, pathname) !== null);
}

/**
 * Mounted once in AppLayout. Watches the live profile (`useAuth().profile`, pushed by the
 * `onSnapshot` listener) and celebrates badges / level-ups awarded by Cloud Functions:
 * a queued `BadgeUnlockModal` per badge and an achievement toast per level-up. A badge toast
 * fires only where the modal is skipped (checkout / order-success): next to the modal it just
 * repeated it and covered the modal's actions on phones.
 * Never fires for the first profile load, after a user switch, or after sign-out/in.
 */
export function BadgeWatcher() {
  const { profile, status } = useAuth();
  const { pathname } = useLocation();
  const suppressModal = isModalFreeRoute(pathname);
  const suppressModalRef = useRef(suppressModal);
  const snapshotRef = useRef<BadgeSnapshot | null>(null);
  const [queue, setQueue] = useState<BadgeId[]>([]);

  // Declared before the profile effect so it has already run when both change together.
  useEffect(() => {
    suppressModalRef.current = suppressModal;
    if (suppressModal) setQueue([]);
  }, [suppressModal]);

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

    if (suppressModalRef.current) {
      for (const id of diff.unlocked) {
        const badge = getBadge(id);
        toast.achievement(
          'BADGE UNLOCKED',
          `${badge.title} · +${formatNumber(badge.xpReward)} XP`,
          badge.emoji,
        );
      }
    } else if (diff.unlocked.length > 0) {
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
  const current = suppressModal ? null : (queue[0] ?? null);

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
