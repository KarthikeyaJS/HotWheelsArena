/** Millis for an ISO calendar date (`2026-10-01`) at midnight IST, or null when invalid. */
export function isoDateToMillis(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const millis = Date.parse(`${date}T00:00:00+05:30`);
  return Number.isFinite(millis) ? millis : null;
}
