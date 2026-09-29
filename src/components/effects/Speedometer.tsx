import { formatNumber } from '@/lib/format';
import { Gauge, type GaugeSize } from './Gauge';

export interface SpeedometerProps {
  /** Speed to display (clamped to 0–`max`). */
  value: number;
  /** Dial maximum (default 320). */
  max?: number;
  /** Caption inside the dial (default `SPEED`). */
  label?: string;
  /** Caption under the readout (default `KM/H`). */
  unit?: string;
  size?: GaugeSize;
  /** Needle sweep on first view (default true; instant for reduced motion). */
  animate?: boolean;
  /** Default true (`aria-hidden`). Set false when the reading is real content. */
  decorative?: boolean;
  className?: string;
}

/**
 * Racing speedometer (SVG): ticks every `max / 8` with 4 subdivisions, red zone over the last
 * 15%, orange needle + mono readout (`320 KM/H`).
 */
export function Speedometer({
  value,
  max = 320,
  label = 'SPEED',
  unit = 'KM/H',
  size = 'md',
  animate = true,
  decorative = true,
  className,
}: SpeedometerProps) {
  const safeMax = max > 0 ? max : 320;
  return (
    <Gauge
      value={value}
      max={safeMax}
      majorStep={safeMax / 8}
      minorPerMajor={4}
      dangerFrom={safeMax * 0.85}
      label={label}
      unit={unit}
      formatTick={(tick) => formatNumber(Math.round(tick))}
      formatValue={(current) => formatNumber(Math.round(current))}
      size={size}
      animate={animate}
      decorative={decorative}
      ariaLabel={`${label}: ${formatNumber(Math.round(Math.min(safeMax, Math.max(0, value))))} ${unit}`}
      className={className}
    />
  );
}
