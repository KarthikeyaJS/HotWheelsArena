import { formatNumber } from '@/lib/format';
import { Gauge, type GaugeSize } from './Gauge';

export interface TachometerProps {
  /** Engine speed in RPM (clamped to 0–`max`). */
  rpm: number;
  /** Start of the red line (default 8,000). */
  redline?: number;
  /** Dial maximum (default 10,000). */
  max?: number;
  /** Caption inside the dial (default `RPM ×1000`). */
  label?: string;
  size?: GaugeSize;
  /** Needle sweep on first view (default true; instant for reduced motion). */
  animate?: boolean;
  /** Default true (`aria-hidden`). */
  decorative?: boolean;
  className?: string;
}

/** Readout rounded to 50 rpm, like a real digital tach: `RPM 8,200`. */
const formatRpm = (rpm: number): string => `RPM ${formatNumber(Math.round(rpm / 50) * 50)}`;

/**
 * Racing tachometer (SVG): ×1000 tick labels, red line zone, orange needle and a mono
 * `RPM 8,200` readout.
 */
export function Tachometer({
  rpm,
  redline = 8000,
  max = 10000,
  label = 'RPM ×1000',
  size = 'md',
  animate = true,
  decorative = true,
  className,
}: TachometerProps) {
  const safeMax = max > 0 ? max : 10000;
  return (
    <Gauge
      value={rpm}
      max={safeMax}
      majorStep={1000}
      minorPerMajor={safeMax > 12000 ? 2 : 4}
      dangerFrom={Math.min(redline, safeMax)}
      label={label}
      unit={`REDLINE ${formatNumber(redline)}`}
      formatTick={(tick) => String(Math.round(tick / 1000))}
      formatValue={formatRpm}
      size={size}
      animate={animate}
      decorative={decorative}
      ariaLabel={`Tachometer: ${formatNumber(Math.round(Math.min(safeMax, Math.max(0, rpm))))} RPM`}
      className={className}
    />
  );
}
