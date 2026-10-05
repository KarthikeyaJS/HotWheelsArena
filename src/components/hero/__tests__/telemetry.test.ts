import { describe, expect, it, vi } from 'vitest';
import { computeCarMotion } from '../carMotion';
import { HERO_CAR_VIEWBOX } from '../heroCarGeometry';
import {
  GEAR_TOP_SPEEDS,
  LAUNCH_RPM,
  POST_SHIFT_RPM,
  SEQUENCE_EXIT_AT,
  SHIFT_RPM,
  TOP_SPEED_KMH,
  createProgressStore,
  formatGearReadout,
  formatRpmReadout,
  formatSpeedReadout,
  quantizeProgress,
  telemetryAt,
} from '../telemetry';

describe('telemetryAt', () => {
  it('holds launch control on the line', () => {
    expect(telemetryAt(0)).toEqual({ speed: 0, rpm: LAUNCH_RPM, gear: 1, status: 'launch' });
  });

  it('reaches top speed in sixth gear when the car exits', () => {
    const exit = telemetryAt(SEQUENCE_EXIT_AT);
    expect(exit.speed).toBe(TOP_SPEED_KMH);
    expect(exit.gear).toBe(GEAR_TOP_SPEEDS.length);
    expect(exit.rpm).toBe(SHIFT_RPM);
    expect(exit.status).toBe('top-speed');
    expect(telemetryAt(1)).toEqual(exit);
  });

  it('climbs monotonically in speed and never leaves the rev range', () => {
    let previous = -1;
    for (let step = 0; step <= 100; step += 1) {
      const t = telemetryAt(step / 100);
      expect(t.speed).toBeGreaterThanOrEqual(previous);
      expect(t.rpm).toBeGreaterThanOrEqual(POST_SHIFT_RPM);
      expect(t.rpm).toBeLessThanOrEqual(SHIFT_RPM);
      expect(t.gear).toBeGreaterThanOrEqual(1);
      expect(t.gear).toBeLessThanOrEqual(6);
      previous = t.speed;
    }
  });

  it('drops the revs on every upshift', () => {
    const samples = Array.from({ length: 401 }, (_, index) => telemetryAt(index / 400));
    const shifts = samples.filter(
      (sample, index) => index > 0 && sample.gear > (samples[index - 1]?.gear ?? 0),
    );
    expect(shifts).toHaveLength(5);
    shifts.forEach((sample) => expect(sample.rpm).toBeLessThan(7000));
  });

  it('clamps out-of-range and invalid progress', () => {
    expect(telemetryAt(-2)).toEqual(telemetryAt(0));
    expect(telemetryAt(9)).toEqual(telemetryAt(1));
    expect(telemetryAt(Number.NaN)).toEqual(telemetryAt(0));
  });
});

describe('telemetry readouts', () => {
  it('formats the HUD strip', () => {
    expect(formatRpmReadout(8218)).toBe('RPM 8,200');
    expect(formatGearReadout(4)).toBe('GEAR 4');
    expect(formatSpeedReadout(6)).toBe('006 KM/H');
    expect(formatSpeedReadout(214.4)).toBe('214 KM/H');
  });

  it('quantizes progress to limit re-renders', () => {
    expect(quantizeProgress(0.12345, 100)).toBe(0.12);
    expect(quantizeProgress(2)).toBe(1);
  });
});

describe('createProgressStore', () => {
  it('notifies subscribers only on change and unsubscribes cleanly', () => {
    const store = createProgressStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(0.5);
    store.set(0.5);
    store.set(3);
    expect(store.get()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.set(0.2);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('computeCarMotion', () => {
  it('fits the car by height and sends it fully past the right edge', () => {
    const motion = computeCarMotion({ left: 160, width: 1120, height: 270, stageWidth: 1440 });
    expect(motion.scale).toBe(1);
    // box 1120 wide, svg 800 wide → 160px letterbox; bumper at 66 − 40 = 26 units in.
    expect(motion.carLeft).toBe(160 + 160 + 26);
    expect(motion.travel).toBe(1440 - motion.carLeft + 48);
  });

  it('turns the wheels in proportion to the distance (rolling without slipping)', () => {
    const motion = computeCarMotion({ left: 0, width: 400, height: 1000, stageWidth: 400 });
    expect(motion.scale).toBeCloseTo(400 / HERO_CAR_VIEWBOX.width);
    const radius = 52 * 1.04 * motion.scale;
    expect(motion.wheelDegrees).toBeCloseTo((motion.travel / radius) * (180 / Math.PI));
  });

  it('never returns a negative travel for degenerate boxes', () => {
    const motion = computeCarMotion({ left: 5000, width: 0, height: 0, stageWidth: 100 });
    expect(motion.travel).toBe(0);
    expect(Number.isFinite(motion.wheelDegrees)).toBe(true);
  });
});
