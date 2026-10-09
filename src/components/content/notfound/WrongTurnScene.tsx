import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';

export interface WrongTurnSceneProps {
  className?: string;
}

/** Skid marks that swerve off the road, ending where the wheel came loose. */
const SKIDS = [
  'M20 210 C 140 210, 210 200, 280 168 S 380 92, 438 96',
  'M20 238 C 150 238, 226 228, 300 192 S 398 120, 452 126',
] as const;

const SPOKES = [0, 72, 144, 216, 288] as const;

/**
 * Decorative 404 scene: rubber skid marks draw themselves across the tarmac towards a loose,
 * spinning wheel. Reduced motion → marks fully drawn, wheel at rest. Entirely `aria-hidden`.
 */
export function WrongTurnScene({ className }: WrongTurnSceneProps) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-line bg-surface shadow-card',
        className,
      )}
    >
      <div className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-80" />
      <svg viewBox="0 0 560 300" className="block h-auto w-full" focusable="false">
        {/* Road edge + centre line */}
        <path d="M0 268 H560" className="stroke-line" strokeWidth={2} />
        <path d="M0 176 H170" className="stroke-fg/15" strokeWidth={3} strokeDasharray="18 16" />

        {/* "404" ghost numerals */}
        <text
          x="280"
          y="150"
          textAnchor="middle"
          className="fill-transparent stroke-fg/10 font-display"
          strokeWidth={2}
          fontSize={150}
          fontWeight={800}
          letterSpacing={6}
        >
          404
        </text>

        {/* Skid marks */}
        <g fill="none" strokeLinecap="round" className="stroke-fg/25">
          {SKIDS.map((d, index) => (
            <motion.path
              key={d}
              d={d}
              strokeWidth={14}
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </g>

        {/* Loose wheel */}
        <g transform="translate(478 196)">
          <ellipse cx="0" cy="70" rx="58" ry="7" className="fill-black/30" />
          <g
            className={cn(!reduce && 'animate-[spin_1.4s_linear_infinite]')}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <circle r="60" className="fill-fg/90" />
            <circle
              r="60"
              fill="none"
              className="stroke-bg/40"
              strokeWidth={6}
              strokeDasharray="6 8"
            />
            <circle r="38" className="fill-bg" />
            <circle r="34" fill="none" className="stroke-accent" strokeWidth={4} />
            {SPOKES.map((angle) => (
              <rect
                key={angle}
                x="-4"
                y="-32"
                width="8"
                height="26"
                rx="3"
                className="fill-metal"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle r="9" className="fill-accent" />
            <circle r="3" className="fill-bg" />
          </g>
        </g>
      </svg>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-2xs uppercase tracking-hud text-muted sm:text-xs">
        <span>GPS · signal lost</span>
        <span className="text-accent-ink">ERR 404</span>
        <span>Lap · DNF</span>
      </div>
    </div>
  );
}
