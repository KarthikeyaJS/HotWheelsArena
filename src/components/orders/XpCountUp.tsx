import { useRef } from 'react';
import { useAnimatedNumber } from '@/components/effects/useAnimatedNumber';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export interface XpCountUpProps {
  xp: number;
  className?: string;
}

/** `+250 XP` that counts up when it scrolls into view (final value for screen readers / reduced motion). */
export function XpCountUp({ xp, className }: XpCountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const safe = Math.max(0, Math.round(Number.isFinite(xp) ? xp : 0));
  const value = useAnimatedNumber(safe, ref, { duration: 1.6 });

  return (
    <span ref={ref} className={cn('font-mono font-bold tabular-nums', className)}>
      <span aria-hidden="true">+{formatNumber(Math.round(value))}</span>
      <span className="sr-only">{formatNumber(safe)}</span>
      <span className="ml-1.5 text-[0.55em] tracking-hud">XP</span>
    </span>
  );
}
