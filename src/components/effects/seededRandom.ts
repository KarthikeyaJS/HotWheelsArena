/**
 * Deterministic pseudo-random number in [0, 1) for a seed. Decorative effects use it so their
 * layout is stable across renders (and identical between server/client snapshots).
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** `seededRandom` mapped to [min, max). */
export function seededRange(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}
