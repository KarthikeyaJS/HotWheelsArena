import { describe, expect, it } from 'vitest';
import {
  TRACK_WIDTH,
  pickActiveIndex,
  pointAtFraction,
  sampleTrackPoints,
  sectionScrollFraction,
  toSmoothPath,
} from '../trackGeometry';

describe('sampleTrackPoints', () => {
  it('runs top to bottom, starting and ending on the centre line inside the rail', () => {
    const points = sampleTrackPoints(TRACK_WIDTH, 800);
    expect(points[0]).toEqual({ x: TRACK_WIDTH / 2, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: TRACK_WIDTH / 2, y: 800 });
    points.forEach((point, index) => {
      expect(point.x).toBeGreaterThanOrEqual(10 - 0.01);
      expect(point.x).toBeLessThanOrEqual(TRACK_WIDTH - 10 + 0.01);
      if (index > 0) expect(point.y).toBeGreaterThan(points[index - 1]?.y ?? -1);
    });
    // It actually snakes.
    expect(new Set(points.map((point) => point.x)).size).toBeGreaterThan(10);
  });

  it('handles an empty rail', () => {
    expect(sampleTrackPoints(TRACK_WIDTH, 0)).toEqual([
      { x: 24, y: 0 },
      { x: 24, y: 0 },
    ]);
  });
});

describe('toSmoothPath', () => {
  it('emits one cubic segment per gap, through every point', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ];
    const path = toSmoothPath(points);
    expect(path.startsWith('M0 0')).toBe(true);
    expect(path.match(/C/g)).toHaveLength(2);
    expect(path.endsWith('20 0')).toBe(true);
  });

  it('returns an empty path for no points', () => {
    expect(toSmoothPath([])).toBe('');
  });
});

describe('pointAtFraction', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
  ];

  it('walks the arc length', () => {
    expect(pointAtFraction(line, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtFraction(line, 0.25)).toEqual({ x: 0, y: 50 });
    expect(pointAtFraction(line, 0.75)).toEqual({ x: 50, y: 100 });
    expect(pointAtFraction(line, 1)).toEqual({ x: 100, y: 100 });
  });

  it('clamps and tolerates empty input', () => {
    expect(pointAtFraction(line, 5)).toEqual({ x: 100, y: 100 });
    expect(pointAtFraction([], 0.5)).toEqual({ x: 0, y: 0 });
  });
});

describe('sectionScrollFraction', () => {
  it('maps a section top (minus the header padding) onto page scroll', () => {
    expect(sectionScrollFraction(1088, 88, 2000)).toBe(0.5);
    expect(sectionScrollFraction(40, 88, 2000)).toBe(0);
    expect(sectionScrollFraction(9000, 88, 2000)).toBe(1);
    expect(sectionScrollFraction(500, 88, 0)).toBe(0);
  });
});

describe('pickActiveIndex', () => {
  it('picks the last section that has passed the threshold', () => {
    expect(pickActiveIndex([-900, -200, 300, 1200], 380, false)).toBe(2);
    expect(pickActiveIndex([100, 900], 380, false)).toBe(0);
    expect(pickActiveIndex([500, 900], 380, false)).toBe(0);
  });

  it('skips missing sections and selects the last one at the page bottom', () => {
    expect(pickActiveIndex([-500, Number.POSITIVE_INFINITY, 200], 380, false)).toBe(2);
    expect(pickActiveIndex([-900, -300, 600, Number.POSITIVE_INFINITY], 380, true)).toBe(2);
    expect(pickActiveIndex([], 380, false)).toBe(0);
  });
});
