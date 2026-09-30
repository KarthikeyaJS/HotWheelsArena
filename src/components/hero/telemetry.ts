/**
 * Hero HUD telemetry: a pure mapping from the hero scroll-sequence progress (0–1) to the numbers
 * the dashboard shows (speed, RPM, gear), plus a tiny external store so only the HUD re-renders
 * while GSAP scrubs the sequence.
 */
import { formatNumber, padNumber } from '@/lib/format';

export type TelemetryStatus = 'launch' | 'accelerating' | 'top-speed' | 'cruise';

export interface Telemetry {
  /** km/h, integer. */
  speed: number;
  /** Engine speed, integer. */
  rpm: number;
  /** 1–6. */
  gear: number;
  status: TelemetryStatus;
}

/** Speedometer maximum (km/h) — matches the `Speedometer` default dial. */
export const TOP_SPEED_KMH = 320;
/** Launch-control hold at the line. */
export const LAUNCH_RPM = 8200;
/** Upshift point (inside the tachometer's red zone). */
export const SHIFT_RPM = 9200;
/** RPM right after an upshift. */
export const POST_SHIFT_RPM = 5600;
/** Upper speed bound of each gear (km/h); the last one is the top speed. */
export const GEAR_TOP_SPEEDS: readonly number[] = [62, 112, 168, 224, 276, TOP_SPEED_KMH];
/** Timeline progress at which the car has left the screen (the rest is the section hand-off). */
export const SEQUENCE_EXIT_AT = 0.92;

/** Shown when the scroll sequence is off (mobile / tablet / reduced motion). */
export const STATIC_TELEMETRY: Readonly<Telemetry> = {
  speed: 214,
  rpm: 8200,
  gear: 4,
  status: 'cruise',
};

export const TELEMETRY_STATUS_LABEL: Readonly<Record<TelemetryStatus, string>> = {
  launch: 'LAUNCH CONTROL',
  accelerating: 'FULL THROTTLE',
  'top-speed': 'TOP SPEED',
  cruise: 'CRUISE MODE',
};

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/**
 * Telemetry at a point of the hero sequence. Speed climbs with the car's acceleration curve,
 * RPM saw-tooths through six gears (launch-control hold at 8,200 rpm on the line).
 */
export function telemetryAt(progress: number): Telemetry {
  const p = clamp01(progress);
  const t = Math.min(1, p / SEQUENCE_EXIT_AT);
  const speed = Math.round(TOP_SPEED_KMH * t ** 1.55);

  let gearIndex = GEAR_TOP_SPEEDS.findIndex((top) => speed <= top);
  if (gearIndex < 0) gearIndex = GEAR_TOP_SPEEDS.length - 1;
  const gearTop = GEAR_TOP_SPEEDS[gearIndex] ?? TOP_SPEED_KMH;
  const gearStart = gearIndex === 0 ? 0 : (GEAR_TOP_SPEEDS[gearIndex - 1] ?? 0);
  const local = gearTop > gearStart ? (speed - gearStart) / (gearTop - gearStart) : 1;
  const floor = gearIndex === 0 ? LAUNCH_RPM : POST_SHIFT_RPM;
  const rpm = Math.round(floor + clamp01(local) * (SHIFT_RPM - floor));

  const status: TelemetryStatus = p <= 0.01 ? 'launch' : t >= 1 ? 'top-speed' : 'accelerating';
  return { speed, rpm, gear: gearIndex + 1, status };
}

/** `RPM 8,200` (rounded to 50 like a digital tach). */
export const formatRpmReadout = (rpm: number): string =>
  `RPM ${formatNumber(Math.round(rpm / 50) * 50)}`;

/** `GEAR 4`. */
export const formatGearReadout = (gear: number): string => `GEAR ${gear}`;

/** `214 KM/H` / `006 KM/H` (fixed width so the strip never jitters). */
export const formatSpeedReadout = (speed: number): string =>
  `${padNumber(Math.max(0, Math.round(speed)), 3)} KM/H`;

/** Rounds progress so the HUD re-renders at most `steps` times over the whole sequence. */
export function quantizeProgress(progress: number, steps = 160): number {
  return Math.round(clamp01(progress) * steps) / steps;
}

export interface ProgressStore {
  get: () => number;
  set: (value: number) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Minimal external store for `useSyncExternalStore` (no React state in the GSAP callback). */
export function createProgressStore(initial = 0): ProgressStore {
  let value = clamp01(initial);
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      const clamped = clamp01(next);
      if (clamped === value) return;
      value = clamped;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
