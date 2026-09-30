import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING_SNAPPY } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import type { OrderTotals } from '@/types';

export interface FreeShippingMeterProps {
  totals: Pick<
    OrderTotals,
    'subtotal' | 'freeShippingRemaining' | 'freeShippingPct' | 'qualifiesForFreeShipping'
  >;
  /** settings.shippingThreshold (₹). */
  threshold: number;
  className?: string;
}

/** "Add ₹240 more for free shipping" + progress bar; celebrates when the threshold is crossed. */
export function FreeShippingMeter({ totals, threshold, className }: FreeShippingMeterProps) {
  const reduceMotion = useReducedMotion();
  const unlocked = totals.qualifiesForFreeShipping && totals.subtotal > 0;
  const wasUnlockedRef = useRef(unlocked);
  const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Announce + celebrate only when the threshold is crossed during this visit.
  useEffect(() => {
    const was = wasUnlockedRef.current;
    wasUnlockedRef.current = unlocked;
    if (unlocked && !was) {
      setCelebrate(true);
      setAnnouncement('Free shipping unlocked.');
    } else if (!unlocked && was) {
      setCelebrate(false);
      setAnnouncement(`Free shipping needs ${formatINR(totals.freeShippingRemaining)} more.`);
    }
  }, [unlocked, totals.freeShippingRemaining]);

  useEffect(() => {
    if (!celebrate) return undefined;
    const timer = window.setTimeout(() => setCelebrate(false), 1600);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  if (totals.subtotal <= 0 || threshold <= 0) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-4 transition-colors duration-300',
        unlocked ? 'border-success/40 bg-success/[0.06]' : 'border-line bg-surface',
        className,
      )}
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {unlocked ? (
        <span
          aria-hidden="true"
          className="bg-checker pointer-events-none absolute inset-y-0 right-0 w-16 opacity-[0.07]"
        />
      ) : null}
      <div className="relative flex items-start gap-3">
        <motion.span
          aria-hidden="true"
          animate={celebrate && !reduceMotion ? { rotate: [0, -14, 10, -6, 0], scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.7 }}
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-md border [&_svg]:h-[18px] [&_svg]:w-[18px]',
            unlocked
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-line bg-card text-accent-ink',
          )}
        >
          {unlocked ? <Flag /> : <Truck />}
        </motion.span>
        <div className="min-w-0 flex-1">
          {unlocked ? (
            <>
              <p className="font-display text-xs font-bold uppercase tracking-display text-fg">
                Free shipping unlocked
              </p>
              <p className="mt-1 text-xs text-muted">
                Your cars ride to your garage on us — orders over{' '}
                <span className="font-mono text-fg">{formatINR(threshold)}</span> ship free.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-fg">
                Add{' '}
                <span className="font-mono font-bold text-accent-ink">
                  {formatINR(totals.freeShippingRemaining)}
                </span>{' '}
                more for <span className="font-semibold">free shipping</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Free delivery on pit stops over{' '}
                <span className="font-mono">{formatINR(threshold)}</span>.
              </p>
            </>
          )}
        </div>
      </div>
      <ProgressBar
        className="relative mt-3"
        value={unlocked ? 100 : totals.freeShippingPct}
        label="Progress to free shipping"
        tone={unlocked ? 'success' : 'accent'}
        size="sm"
        striped={!unlocked}
        valueText={
          unlocked
            ? 'Free shipping unlocked'
            : `${formatINR(totals.subtotal)} of ${formatINR(threshold)}`
        }
      />
      <AnimatePresence>
        {celebrate && unlocked && !reduceMotion ? (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_SNAPPY}
            className="hud absolute right-3 top-3 rounded-sm bg-success px-1.5 py-1 text-[10px] font-bold text-bg"
          >
            +FREE
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
