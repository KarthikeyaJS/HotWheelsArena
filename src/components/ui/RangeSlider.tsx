import {
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';

export type RangeValue = [number, number];

export interface RangeSliderProps {
  min: number;
  max: number;
  /** Snap increment (default 1). */
  step?: number;
  value: readonly [number, number];
  /** Called continuously while dragging / on every key press. */
  onChange: (value: RangeValue) => void;
  /** Called once an interaction ends (pointer up / key up) — use it for URL or query updates. */
  onCommit?: (value: RangeValue) => void;
  /** Group label, e.g. "Price". */
  label: string;
  /** Formats values for the readout and `aria-valuetext` (default `formatINR`). */
  formatValue?: (value: number) => string;
  /** Minimum gap between the thumbs (default 0). */
  minDistance?: number;
  /** Accessible names of the thumbs (default "Minimum {label}" / "Maximum {label}"). */
  thumbLabels?: readonly [string, string];
  disabled?: boolean;
  /** Show the `₹199 – ₹2,499` readout next to the label (default true). */
  showValues?: boolean;
  /** Show min / max under the track. */
  showScale?: boolean;
  hideLabel?: boolean;
  className?: string;
}

type ThumbIndex = 0 | 1;

const HANDLED_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Thumb centre offset inside the track: the track is inset by the thumb radius (10px). */
function thumbLeft(ratio: number): string {
  return `calc(10px + (100% - 20px) * ${ratio})`;
}

/**
 * Dual-thumb range slider (price filter). Two `role="slider"` thumbs with arrows /
 * PageUp / PageDown / Home / End, pointer drag anywhere on the track (nearest thumb), and
 * `aria-valuetext` from `formatValue`. Thumbs can never cross.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  label,
  formatValue = formatINR,
  minDistance = 0,
  thumbLabels,
  disabled = false,
  showValues = true,
  showScale = false,
  hideLabel = false,
  className,
}: RangeSliderProps) {
  const labelId = `range-${useId()}-label`;
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([null, null]);
  const dragRef = useRef<{ index: ThumbIndex; pointerId: number } | null>(null);
  const dirtyRef = useRef(false);

  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const lowerBound = Math.min(min, max);
  const upperBound = Math.max(min, max);
  const span = upperBound - lowerBound;
  const gap = Math.max(0, Math.min(minDistance, span));
  const decimals = decimalsOf(safeStep);

  const clampValue = (next: number, lo: number, hi: number): number =>
    Math.min(hi, Math.max(lo, next));
  const snap = (raw: number): number => {
    const snapped = Math.round((raw - lowerBound) / safeStep) * safeStep + lowerBound;
    return Number(clampValue(snapped, lowerBound, upperBound).toFixed(decimals));
  };

  const normalizedLow = clampValue(Math.min(value[0], value[1]), lowerBound, upperBound);
  const normalizedHigh = clampValue(Math.max(value[0], value[1]), lowerBound, upperBound);
  const current: RangeValue = [normalizedLow, normalizedHigh];
  // Latest committed-or-pending value: event handlers read it so rapid key repeats / pointer
  // moves never act on a stale render. Re-synced from props after every render.
  const latestRef = useRef<RangeValue>(current);
  useLayoutEffect(() => {
    latestRef.current = [normalizedLow, normalizedHigh];
  });

  const ratioOf = (n: number): number => (span === 0 ? 0 : (n - lowerBound) / span);
  const names: readonly [string, string] = thumbLabels ?? [`Minimum ${label}`, `Maximum ${label}`];

  const setThumb = (index: ThumbIndex, raw: number): void => {
    const [lo, hi] = latestRef.current;
    const next: RangeValue =
      index === 0
        ? [clampValue(snap(raw), lowerBound, hi - gap), hi]
        : [lo, clampValue(snap(raw), lo + gap, upperBound)];
    if (next[0] === lo && next[1] === hi) return;
    latestRef.current = next;
    dirtyRef.current = true;
    onChange(next);
  };

  const commit = (): void => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    onCommit?.(latestRef.current);
  };

  const valueFromPointer = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return lowerBound;
    const ratio = clampValue((clientX - rect.left) / rect.width, 0, 1);
    return lowerBound + ratio * span;
  };

  const pickThumb = (raw: number): ThumbIndex => {
    const [lo, hi] = latestRef.current;
    if (lo === hi) {
      if (hi >= upperBound) return 0;
      if (lo <= lowerBound) return 1;
      return raw >= hi ? 1 : 0;
    }
    return Math.abs(raw - lo) <= Math.abs(raw - hi) ? 0 : 1;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const raw = valueFromPointer(event.clientX);
    const index = pickThumb(raw);
    dragRef.current = { index, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    thumbRefs.current[index]?.focus();
    setThumb(index, raw);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setThumb(drag.index, valueFromPointer(event.clientX));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commit();
  };

  const handleKeyDown = (index: ThumbIndex) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !HANDLED_KEYS.has(event.key)) return;
    event.preventDefault();
    const [lo, hi] = latestRef.current;
    const own = index === 0 ? lo : hi;
    const bigStep = Math.max(safeStep, Math.round(span / 10 / safeStep) * safeStep);
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        setThumb(index, own + safeStep);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        setThumb(index, own - safeStep);
        break;
      case 'PageUp':
        setThumb(index, own + bigStep);
        break;
      case 'PageDown':
        setThumb(index, own - bigStep);
        break;
      case 'Home':
        setThumb(index, index === 0 ? lowerBound : lo + gap);
        break;
      case 'End':
        setThumb(index, index === 0 ? hi - gap : upperBound);
        break;
      default:
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (HANDLED_KEYS.has(event.key)) commit();
  };

  const [low, high] = current;

  return (
    <div className={cn('w-full', disabled && 'opacity-50', className)}>
      <div
        className={cn(
          'mb-2 flex items-baseline justify-between gap-3',
          hideLabel && !showValues && 'sr-only',
        )}
      >
        <span id={labelId} className={cn('hud text-muted', hideLabel && 'sr-only')}>
          {label}
        </span>
        {showValues ? (
          <span aria-hidden="true" className="font-mono text-sm font-bold tabular-nums text-fg">
            {formatValue(low)} <span className="text-muted">–</span> {formatValue(high)}
          </span>
        ) : null}
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'relative h-10 touch-pan-y select-none',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <div
          ref={trackRef}
          aria-hidden="true"
          className="absolute inset-x-2.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-fg/15"
        >
          <div
            className="absolute inset-y-0 rounded-full bg-accent shadow-[0_0_10px_rgb(var(--accent)/0.5)]"
            style={{ left: `${ratioOf(low) * 100}%`, right: `${(1 - ratioOf(high)) * 100}%` }}
          />
        </div>
        {([0, 1] as const).map((index) => {
          const thumbValue = index === 0 ? low : high;
          return (
            <div
              key={index}
              ref={(element) => {
                thumbRefs.current[index] = element;
              }}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={names[index]}
              aria-orientation="horizontal"
              aria-valuemin={index === 0 ? lowerBound : low + gap}
              aria-valuemax={index === 0 ? high - gap : upperBound}
              aria-valuenow={thumbValue}
              aria-valuetext={formatValue(thumbValue)}
              aria-disabled={disabled || undefined}
              onKeyDown={handleKeyDown(index)}
              onKeyUp={handleKeyUp}
              className={cn(
                'group/thumb absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-accent bg-surface shadow-card transition-[transform,box-shadow] duration-150 ease-race',
                'before:absolute before:-inset-3 before:rounded-full',
                !disabled &&
                  'cursor-grab hover:scale-110 hover:shadow-[0_0_0_6px_rgb(var(--accent)/0.15)] focus-visible:shadow-[0_0_0_6px_rgb(var(--accent)/0.18)] active:scale-110 active:cursor-grabbing',
                index === 1 && low === high && 'z-10',
              )}
              style={{ left: thumbLeft(ratioOf(thumbValue)) }}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
          );
        })}
      </div>
      {showScale ? (
        <div
          aria-hidden="true"
          className="mt-1 flex justify-between font-mono text-xs text-muted"
        >
          <span>{formatValue(lowerBound)}</span>
          <span>{formatValue(upperBound)}</span>
        </div>
      ) : null}
    </div>
  );
}
