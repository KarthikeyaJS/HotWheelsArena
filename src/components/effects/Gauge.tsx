import { useId, useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import {
  GAUGE_CENTER,
  GAUGE_END,
  GAUGE_START,
  GAUGE_VIEWBOX,
  describeArc,
  gaugeTicks,
  polarToCartesian,
  valueToAngle,
} from './gaugeGeometry';
import { useAnimatedNumber } from './useAnimatedNumber';

export type GaugeSize = 'sm' | 'md' | 'lg' | number;

export interface GaugeProps {
  value: number;
  min?: number;
  max: number;
  /** Distance between labelled (major) ticks. */
  majorStep: number;
  /** Minor subdivisions per major step (default 4). */
  minorPerMajor?: number;
  /** Start of the red zone (default: none). */
  dangerFrom?: number;
  /** Small caption inside the dial (e.g. `KM/H`, `RPM ×1000`). */
  label?: string;
  /** Caption under the readout. */
  unit?: string;
  formatTick?: (value: number) => string;
  formatValue?: (value: number) => string;
  /** `sm` 140px, `md` 200px (default), `lg` 280px, or a pixel number. */
  size?: GaugeSize;
  /** Sweep the needle from `min` when scrolled into view (default true; off for reduced motion). */
  animate?: boolean;
  /** Hide from assistive tech (default true). When false the dial is a labelled `role="img"`. */
  decorative?: boolean;
  /** Accessible name when `decorative={false}` (default: `"<label> <value> <unit>"`). */
  ariaLabel?: string;
  className?: string;
}

const SIZE_PX: Readonly<Record<Exclude<GaugeSize, number>, number>> = { sm: 140, md: 200, lg: 280 };

const R_ARC = 93;
const R_TICK_OUTER = 86;
const R_TICK_MAJOR = 74;
const R_TICK_MINOR = 80;
const R_LABEL = 63;

const defaultFormat = (value: number): string => formatNumber(Math.round(value));

/**
 * Racing dial (SVG): tick ring with mono labels, red zone, orange value arc, tapered needle and
 * a mono readout. Base for `Speedometer` and `Tachometer`.
 */
export function Gauge({
  value,
  min = 0,
  max,
  majorStep,
  minorPerMajor = 4,
  dangerFrom,
  label,
  unit,
  formatTick = defaultFormat,
  formatValue = defaultFormat,
  size = 'md',
  animate = true,
  decorative = true,
  ariaLabel,
  className,
}: GaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glowId = `gauge-glow-${useId().replace(/:/g, '')}`;
  const clamped = Math.min(max, Math.max(min, value));
  const current = useAnimatedNumber(clamped, ref, { enabled: animate, from: min });
  const ticks = useMemo(
    () => gaugeTicks(min, max, majorStep, minorPerMajor),
    [min, max, majorStep, minorPerMajor],
  );
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const needleAngle = valueToAngle(current, min, max);
  const dangerAngle = dangerFrom !== undefined ? valueToAngle(dangerFrom, min, max) : null;
  const inDanger = dangerFrom !== undefined && current >= dangerFrom;
  const readout = formatValue(current);
  // Small dials: label every other major tick and drop the inner caption to stay legible.
  const compact = px < 170;
  const readoutSize = readout.length > 6 ? 'text-[15px]' : 'text-[19px]';
  const name = ariaLabel ?? [label, formatValue(clamped), unit].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={cn('relative inline-block shrink-0 select-none', className)}
      style={{ width: px, height: px }}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    >
      <svg
        viewBox={`0 0 ${GAUGE_VIEWBOX} ${GAUGE_VIEWBOX}`}
        width={px}
        height={px}
        aria-hidden="true"
        focusable="false"
        className="overflow-visible"
      >
        <defs>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Bezel */}
        <circle
          cx={GAUGE_CENTER}
          cy={GAUGE_CENTER}
          r={98}
          className="fill-surface/70 stroke-line"
          strokeWidth={1}
        />
        <circle
          cx={GAUGE_CENTER}
          cy={GAUGE_CENTER}
          r={90}
          className="fill-none stroke-line/60"
          strokeWidth={0.75}
        />

        {/* Arcs */}
        <path
          d={describeArc(R_ARC, GAUGE_START, GAUGE_END)}
          className="fill-none stroke-line"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {dangerAngle !== null ? (
          <path
            d={describeArc(R_ARC, dangerAngle, GAUGE_END)}
            className="fill-none stroke-accent-2/80"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
        {needleAngle > GAUGE_START + 0.5 ? (
          <path
            d={describeArc(R_ARC, GAUGE_START, needleAngle)}
            className={cn('fill-none', inDanger ? 'stroke-accent-2' : 'stroke-accent')}
            strokeWidth={3}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />
        ) : null}

        {/* Ticks */}
        {ticks.map((tick) => {
          const outer = polarToCartesian(R_TICK_OUTER, tick.angle);
          const inner = polarToCartesian(tick.major ? R_TICK_MAJOR : R_TICK_MINOR, tick.angle);
          const danger = dangerFrom !== undefined && tick.value >= dangerFrom;
          return (
            <line
              key={`t-${tick.value}`}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              strokeWidth={tick.major ? 2 : 1}
              className={cn(
                danger ? 'stroke-accent-2' : tick.major ? 'stroke-fg/70' : 'stroke-fg/30',
              )}
            />
          );
        })}
        {ticks
          .filter((tick) => tick.major)
          .filter((_, index) => !compact || index % 2 === 0)
          .map((tick) => {
            const point = polarToCartesian(R_LABEL, tick.angle);
            const danger = dangerFrom !== undefined && tick.value >= dangerFrom;
            return (
              <text
                key={`l-${tick.value}`}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(
                  'font-mono text-[9px] font-semibold',
                  danger ? 'fill-danger-ink' : 'fill-muted',
                )}
              >
                {formatTick(tick.value)}
              </text>
            );
          })}

        {label && !compact ? (
          <text
            x={GAUGE_CENTER}
            y={GAUGE_CENTER - 26}
            textAnchor="middle"
            className="fill-muted font-mono text-[8px] font-semibold uppercase tracking-[0.2em]"
          >
            {label}
          </text>
        ) : null}

        {/* Readout */}
        <text
          x={GAUGE_CENTER}
          y={GAUGE_CENTER + 58}
          textAnchor="middle"
          className={cn('fill-fg font-mono font-bold tabular-nums', readoutSize)}
        >
          {readout}
        </text>
        {unit ? (
          <text
            x={GAUGE_CENTER}
            y={GAUGE_CENTER + 72}
            textAnchor="middle"
            className="fill-muted font-mono text-[8px] font-semibold uppercase tracking-[0.2em]"
          >
            {unit}
          </text>
        ) : null}

        {/* Needle */}
        <g
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${GAUGE_CENTER}px ${GAUGE_CENTER}px`,
          }}
        >
          <polygon
            points={`${GAUGE_CENTER - 3.2},${GAUGE_CENTER + 13} ${GAUGE_CENTER + 3.2},${GAUGE_CENTER + 13} ${GAUGE_CENTER + 0.9},${GAUGE_CENTER - 78} ${GAUGE_CENTER - 0.9},${GAUGE_CENTER - 78}`}
            className={inDanger ? 'fill-accent-2' : 'fill-accent'}
          />
        </g>
        <circle
          cx={GAUGE_CENTER}
          cy={GAUGE_CENTER}
          r={8}
          className="fill-card stroke-line"
          strokeWidth={1.5}
        />
        <circle cx={GAUGE_CENTER} cy={GAUGE_CENTER} r={3} className="fill-accent" />
      </svg>
    </div>
  );
}
