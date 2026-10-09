import { motion } from 'framer-motion';
import { ArrowRight, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { getBadge } from '@/config/gamification';
import { garagePath } from '@/config/routes';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING_SOFT } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { BadgeId } from '@/types';

export interface BadgeUnlockModalProps {
  badgeId: BadgeId | null;
  open: boolean;
  onClose: () => void;
  /** How many more unlocks are queued after this one (changes the primary button label). */
  queueCount?: number;
  /** "View achievements" clicked (default: `onClose`). The link navigates to the garage. */
  onViewAll?: () => void;
}

const RAY_COUNT = 12;
const PARTICLES = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * Math.PI * 2 + (index % 2 === 0 ? 0.12 : -0.08);
  const distance = index % 3 === 0 ? 96 : index % 3 === 1 ? 78 : 64;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: index % 4 === 0 ? 'h-2 w-2' : 'h-1.5 w-1.5',
    color: index % 3 === 0 ? 'bg-accent' : 'bg-highlight',
    delay: 0.08 + (index % 6) * 0.03,
  };
});

/**
 * Celebration dialog for a newly unlocked badge: burst of rays and sparks around the medallion
 * (static glow for reduced-motion users), badge title / description and the XP reward.
 */
export function BadgeUnlockModal({
  badgeId,
  open,
  onClose,
  queueCount = 0,
  onViewAll,
}: BadgeUnlockModalProps) {
  const reduceMotion = useReducedMotion();
  // Keep showing the last badge while the dialog animates out (badgeId may already be null).
  const [displayed, setDisplayed] = useState<BadgeId | null>(badgeId);
  if (badgeId !== null && badgeId !== displayed) setDisplayed(badgeId);

  const badge = displayed ? getBadge(displayed) : null;

  return (
    <Modal
      open={open && badge !== null}
      onClose={onClose}
      size="sm"
      tone="highlight"
      eyebrow={
        <span className="inline-flex items-center gap-2 text-highlight-ink">
          <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
          Achievement unlocked
        </span>
      }
      title={
        <>
          Badge unlocked
          {badge ? <span className="sr-only">: {badge.title}</span> : null}
        </>
      }
      footer={
        <>
          <Button
            variant="ghost"
            fullWidth
            to={garagePath('achievements')}
            onClick={onViewAll ?? onClose}
          >
            View achievements
          </Button>
          <Button
            variant="primary"
            fullWidth
            data-autofocus=""
            rightIcon={queueCount > 0 ? <ArrowRight /> : undefined}
            onClick={onClose}
          >
            {queueCount > 0 ? `Next badge (${queueCount} more)` : 'Keep racing'}
          </Button>
        </>
      }
    >
      {badge ? (
        <div key={badge.id} className="flex flex-col items-center pt-2 text-center short:pt-0">
          {/* Short (landscape-phone) viewports: the art shrinks to ~64% (same proportions, the
              negative margin takes back the saved height) so the actions stay in view. */}
          <div className="relative grid h-44 w-44 place-items-center short:-my-8 short:scale-[0.64]">
            <div
              aria-hidden="true"
              className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgb(var(--highlight)/0.35)_0%,transparent_70%)]"
            />
            {!reduceMotion ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {Array.from({ length: RAY_COUNT }, (_, index) => (
                  <span
                    key={`ray-${index}`}
                    className="absolute left-1/2 top-1/2 h-0 w-0"
                    style={{ transform: `rotate(${(index / RAY_COUNT) * 360}deg)` }}
                  >
                    <motion.span
                      className={cn(
                        'absolute -left-px bottom-10 block h-9 w-0.5 origin-bottom rounded-full',
                        index % 2 === 0 ? 'bg-highlight' : 'bg-accent',
                      )}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: [0, 1, 0.4], opacity: [0, 1, 0] }}
                      transition={{
                        duration: 1.1,
                        delay: 0.15 + (index % 3) * 0.04,
                        ease: 'easeOut',
                      }}
                    />
                  </span>
                ))}
                {PARTICLES.map((particle, index) => (
                  <motion.span
                    key={`spark-${index}`}
                    className={cn(
                      'absolute left-1/2 top-1/2 -ml-1 -mt-1 rounded-full',
                      particle.size,
                      particle.color,
                    )}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{
                      x: particle.x,
                      y: particle.y,
                      opacity: [0, 1, 0],
                      scale: [0.4, 1, 0.6],
                    }}
                    transition={{ duration: 1.2, delay: particle.delay, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              </div>
            ) : null}
            <motion.div
              aria-hidden="true"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -14 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
              transition={SPRING_SOFT}
              className="relative grid h-24 w-24 place-items-center rounded-full border-2 border-highlight/70 bg-surface text-5xl leading-none shadow-glow-highlight"
            >
              <span className="absolute inset-1.5 rounded-full border border-dashed border-highlight/40" />
              <span className="relative">{badge.emoji}</span>
            </motion.div>
          </div>
          <p className="mt-2 font-display text-xl font-black uppercase tracking-display text-highlight-ink">
            {badge.title}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">{badge.description}</p>
          <Chip tone="highlight" variant="solid" size="md" className="mt-4">
            +{formatNumber(badge.xpReward)} XP
          </Chip>
          <p className="hud mt-3 text-muted">{badge.requirement}</p>
        </div>
      ) : null}
    </Modal>
  );
}
