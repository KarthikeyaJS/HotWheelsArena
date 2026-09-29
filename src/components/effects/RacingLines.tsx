import { useMemo, type CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { seededRange } from './seededRandom';

export interface RacingLinesProps {
  /** Number of light-trail lines (default 3, clamped 1–8). */
  count?: number;
  /** Tilt of the whole group in degrees (default -6). */
  angle?: number;
  /** Seed for the (deterministic) line layout. */
  seed?: number;
  className?: string;
}

interface Line {
  top: number;
  thickness: number;
  duration: number;
  delay: number;
  opacity: number;
  red: boolean;
  head: number;
}

/**
 * Orange racing light-trails sweeping across the parent (CSS `speed-line` keyframes). Each line
 * has a faint static guide rail; under reduced motion only a static streak is drawn.
 * Decorative (`aria-hidden`), pointer-transparent; the parent must be `relative` +
 * `overflow-hidden`.
 */
export function RacingLines({ count = 3, angle = -6, seed = 7, className }: RacingLinesProps) {
  const reduceMotion = useReducedMotion();
  const lines = useMemo<Line[]>(() => {
    const total = Math.min(8, Math.max(1, Math.round(count)));
    return Array.from({ length: total }, (_, index) => {
      const s = seed * 31 + index * 7;
      return {
        top: ((index + 0.5) / total) * 76 + 12 + seededRange(s, -5, 5),
        thickness: seededRange(s + 1, 0, 1) > 0.6 ? 2 : 1,
        duration: seededRange(s + 2, 2.6, 4.4),
        delay: seededRange(s + 3, 0, 2.8),
        opacity: seededRange(s + 4, 0.55, 0.95),
        red: total > 2 && index === total - 1,
        head: seededRange(s + 5, 25, 70),
      };
    });
  }, [count, seed]);

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="absolute -inset-x-[10%] inset-y-0"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        {lines.map((line, index) => {
          const color = line.red ? 'var(--accent-2)' : 'var(--accent)';
          const trail: CSSProperties = {
            top: `${line.top}%`,
            height: line.thickness,
            opacity: line.opacity,
            backgroundImage: `linear-gradient(90deg, transparent ${line.head - 22}%, rgb(${color} / 0.9) ${line.head}%, transparent ${line.head + 2}%)`,
          };
          return (
            <div key={index}>
              <span
                className="absolute inset-x-0 h-px"
                style={{
                  top: `${line.top}%`,
                  backgroundImage: `linear-gradient(90deg, transparent, rgb(${color} / 0.12) 30%, rgb(${color} / 0.12) 70%, transparent)`,
                }}
              />
              <span
                className={cn('absolute inset-x-0', !reduceMotion && 'animate-speed-line')}
                style={
                  reduceMotion
                    ? trail
                    : {
                        ...trail,
                        animationDuration: `${line.duration}s`,
                        animationDelay: `${line.delay}s`,
                        animationDirection: 'reverse',
                      }
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
