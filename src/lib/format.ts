/**
 * Formatting helpers (en-IN). Money always goes through `formatINR`; numbers/specs render in
 * the mono font at the call site.
 */
import { CURRENCY, LOCALE } from '@/config/brand';

const inrFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

const safe = (value: number): number => (Number.isFinite(value) ? value : 0);

/** `₹1,299` — whole rupees (Indian digit grouping: ₹1,25,000). */
export function formatINR(amount: number): string {
  return inrFormatter.format(safe(amount));
}

/** `₹212.54` — paise precision (tax lines). */
export function formatINRPrecise(amount: number): string {
  return inrPreciseFormatter.format(safe(amount));
}

/** `1,25,000`. */
export function formatNumber(value: number): string {
  return numberFormatter.format(safe(value));
}

/** `1.2K`, `3.4L`, `1.2Cr` (en-IN compact). */
export function formatCompact(value: number): string {
  return compactFormatter.format(safe(value));
}

/** `28 Sept 2026`. `null`/invalid → `—`. */
export function formatDate(millis: number | null | undefined, withTime = false): string {
  if (millis == null || !Number.isFinite(millis)) return '—';
  return (withTime ? dateTimeFormatter : dateFormatter).format(new Date(millis));
}

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** `3 days ago`, `yesterday`, `just now`. `null` → `—`. */
export function formatRelative(
  millis: number | null | undefined,
  now: number = Date.now(),
): string {
  if (millis == null || !Number.isFinite(millis)) return '—';
  const diff = millis - now;
  const abs = Math.abs(diff);
  if (abs < 45 * 1000) return 'just now';
  for (const [unit, size] of RELATIVE_UNITS) {
    if (abs >= size || unit === 'minute') {
      return relativeFormatter.format(Math.round(diff / size), unit);
    }
  }
  return 'just now';
}

/** Zero-pads a non-negative integer: `padNumber(7, 3)` → `007`. */
export function padNumber(value: number, width = 2): string {
  const n = Math.max(0, Math.floor(safe(value)));
  return String(n).padStart(width, '0');
}

/** Collector number: `#142`, `#007`. */
export function formatCollectionNumber(value: number): string {
  return `#${padNumber(value, 3)}`;
}

/** Limited edition: `#001/500`. */
export function formatEdition(editionNumber: number, editionSize: number): string {
  return `#${padNumber(editionNumber, 3)}/${padNumber(editionSize, 3)}`;
}

/** Series position label: `SERIES 03`. */
export function formatSeriesLabel(seriesNumber: number): string {
  return `SERIES ${padNumber(seriesNumber, 2)}`;
}

/** Level label: `LEVEL 07`. */
export function formatLevel(level: number): string {
  return `LEVEL ${padNumber(level, 2)}`;
}

/** XP label: `1,240 XP`. */
export function formatXp(xp: number): string {
  return `${formatNumber(Math.max(0, Math.floor(safe(xp))))} XP`;
}

/** `42%` from a 0–100 value. */
export function formatPercent(value: number, fractionDigits = 0): string {
  return `${safe(value).toFixed(fractionDigits)}%`;
}

/** First name from a display name (`Arjun Mehta` → `Arjun`), or the fallback. */
export function firstName(displayName: string | null | undefined, fallback = 'Collector'): string {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : fallback;
}

/** `1 car` / `3 cars`. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
