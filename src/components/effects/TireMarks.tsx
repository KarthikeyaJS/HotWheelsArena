import { cn } from '@/lib/cn';

export type TireMarksVariant = 'curve' | 'straight' | 'drift';

export interface TireMarksProps {
  /** Skid shape (default `curve`). */
  variant?: TireMarksVariant;
  className?: string;
}

const PATHS: Readonly<Record<TireMarksVariant, readonly [string, string]>> = {
  curve: [
    'M-40 330 C 220 330, 360 120, 640 110 S 1040 210, 1260 60',
    'M-40 380 C 230 378, 380 170, 650 160 S 1050 262, 1260 112',
  ],
  straight: ['M-40 170 L 1260 150', 'M-40 232 L 1260 212'],
  drift: [
    'M-40 90 C 260 100, 420 330, 700 330 C 900 330, 980 180, 1260 190',
    'M-40 146 C 240 156, 400 386, 700 386 C 920 386, 1000 236, 1260 246',
  ],
};

/**
 * Faint rubber skid marks (SVG, tread texture via dash pattern). Uses `currentColor`, so tune
 * visibility with text/opacity classes — defaults to a barely-there `text-fg/[0.05]`.
 * Decorative and pointer-transparent.
 */
export function TireMarks({ variant = 'curve', className }: TireMarksProps) {
  const [first, second] = PATHS[variant];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1200 440"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 h-full w-full text-fg/[0.05]', className)}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="butt">
        {[first, second].map((d) => (
          <g key={d}>
            <path d={d} strokeWidth={30} strokeOpacity={0.55} />
            <path d={d} strokeWidth={30} strokeDasharray="5 7" />
          </g>
        ))}
      </g>
    </svg>
  );
}
