import { describe, expect, it } from 'vitest';
import {
  MACHINE_STATS_NOTE,
  MACHINE_STAT_CEILINGS,
  buildMachineStats,
  clampStat,
  scaleStat,
} from '../machineStats';

const base = { themedStats: { topSpeedKmh: 296, powerHp: 518 }, rarityScore: 6, collectorScore: 8 };

describe('machine stat scaling', () => {
  it('uses the ~450 km/h and ~1600 hp ceilings and /10 scores', () => {
    expect(MACHINE_STAT_CEILINGS).toEqual({ topSpeedKmh: 450, powerHp: 1600, score: 10 });
  });

  it('scales values onto their ceilings as percentages (1 decimal)', () => {
    expect(scaleStat(225, 450)).toBe(50);
    expect(scaleStat(296, 450)).toBe(65.8);
    expect(scaleStat(800, 1600)).toBe(50);
    expect(scaleStat(7, 10)).toBe(70);
  });

  it('clamps out-of-range and invalid values', () => {
    expect(clampStat(1800, 1600)).toBe(1600);
    expect(clampStat(-20, 450)).toBe(0);
    expect(clampStat(Number.NaN, 450)).toBe(0);
    expect(scaleStat(Number.POSITIVE_INFINITY, 450)).toBe(0);
    expect(scaleStat(10, 0)).toBe(0);
  });

  it('builds TOP SPEED, POWER, RARITY and COLLECTOR rows with mono readouts', () => {
    const stats = buildMachineStats(base);
    expect(stats.map((stat) => stat.label)).toEqual(['TOP SPEED', 'POWER', 'RARITY', 'COLLECTOR']);
    expect(stats[0]).toMatchObject({ value: 296, max: 450, display: '296 KM/H', pct: 65.8 });
    expect(stats[1]).toMatchObject({ value: 518, max: 1600, display: '518 HP', pct: 32.4 });
    expect(stats[2]).toMatchObject({ value: 6, max: 10, display: '6/10', tone: 'highlight' });
    expect(stats[3]).toMatchObject({ value: 8, max: 10, display: '8/10', tone: 'accent' });
  });

  it('fills the bar for over-ceiling machines but keeps the real readout', () => {
    const [speed, power] = buildMachineStats({
      ...base,
      themedStats: { topSpeedKmh: 402, powerHp: 1800 },
    });
    expect(speed).toMatchObject({ value: 402, pct: 89.3, display: '402 KM/H' });
    expect(power).toMatchObject({ value: 1600, pct: 100, display: '1,800 HP' });
  });

  it('rounds and clamps collector scores into 0–10', () => {
    const stats = buildMachineStats({ ...base, rarityScore: 12, collectorScore: 7.6 });
    expect(stats[2]).toMatchObject({ value: 10, display: '10/10', pct: 100 });
    expect(stats[3]).toMatchObject({ value: 8, display: '8/10' });
  });

  it('keeps the exact disclaimer copy', () => {
    expect(MACHINE_STATS_NOTE).toBe(
      'Themed vehicle specifications — not claims about the toy itself.',
    );
  });
});
