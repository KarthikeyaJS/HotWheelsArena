import { useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { seededRange } from './seededRandom';

export type SpeedLinesIntensity = 'low' | 'medium' | 'high';

export interface SpeedLinesProps {
  /** Streak count / speed (default `medium`). */
  intensity?: SpeedLinesIntensity;
  /** Streak colour: foreground (default) or orange accent. */
  tone?: 'fg' | 'accent';
  /** Keep streaks inside a vertical band, e.g. `[30, 80]` (% of height). Default full height. */
  band?: readonly [number, number];
  seed?: number;
  className?: string;
}

const COUNTS: Readonly<Record<SpeedLinesIntensity, number>> = { low: 7, medium: 13, high: 22 };
const SPEED: Readonly<Record<SpeedLinesIntensity, [number, number]>> = {
  low: [1.4, 2.4],
  medium: [0.9, 1.7],
  high: [0.55, 1.1],
};

/**
 * Motion-blur speed streaks rushing past (right → left, CSS only). Static, dimmer streaks for
 * reduced-motion users. Decorative and pointer-transparent; parent must be `relative`.
 */
export function SpeedLines({
  intensity = 'medium',
  tone = 'fg',
  band = [0, 100],
  seed = 3,
  className,
}: SpeedLinesProps) {
  const reduceMotion = useReducedMotion();
  const [bandStart, bandEnd] = band;
  const streaks = useMemo(() => {
    const [minDuration, maxDuration] = SPEED[intensity];
    return Array.from({ length: COUNTS[intensity] }, (_, index) => {
      const s = seed * 97 + index * 13;
      const length = seededRange(s, 8, 22);
      const start = seededRange(s + 1, 5, 95 - length);
      return {
        top: seededRange(s + 2, bandStart, bandEnd),
        length,
        start,
        thick: seededRange(s + 3, 0, 1) > 0.75,
        opacity: seededRange(s + 4, 0.25, 0.7),
        duration: seededRange(s + 5, minDuration, maxDuration),
        delay: seededRange(s + 6, 0, 1.6),
      };
    });
  }, [intensity, seed, bandStart, bandEnd]);

  const color = tone === 'accent' ? 'var(--accent)' : 'var(--text)';

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {streaks.map((streak, index) => (
        <span
          key={index}
          className={cn('absolute inset-x-0', !reduceMotion && 'animate-speed-line')}
          style={{
            top: `${streak.top}%`,
            height: streak.thick ? 2 : 1,
            opacity: reduceMotion ? streak.opacity * 0.5 : streak.opacity,
            backgroundImage: `linear-gradient(90deg, transparent ${streak.start}%, rgb(${color} / 0.55) ${streak.start + 1}%, transparent ${streak.start + streak.length}%)`,
            ...(reduceMotion
              ? {}
              : {
                  animationDuration: `${streak.duration}s`,
                  animationDelay: `${streak.delay}s`,
                }),
          }}
        />
      ))}
    </div>
  );
}
