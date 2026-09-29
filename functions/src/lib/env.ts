/**
 * Runtime environment flags.
 *
 * These are read from plain environment variables (Firebase loads `functions/.env`,
 * `functions/.env.<projectId>` and, in the emulator, `functions/.env.local` into `process.env`).
 * They are intentionally NOT declared with `defineBoolean()`: firebase-tools refuses to deploy /
 * emulate non-interactively when a declared param has no dotenv value, even if it has a default.
 */

const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

/** Parses a boolean env value; empty / unknown values fall back to `fallback`. */
export function parseBooleanEnv(raw: string | undefined, fallback: boolean): boolean {
  const value = raw?.trim().toLowerCase();
  if (!value) return fallback;
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  return fallback;
}

/**
 * `ALLOW_TEST_PAYMENTS` (default **true**): whether dummy / test-mode payments may create orders.
 * Set `ALLOW_TEST_PAYMENTS=false` in `functions/.env.<projectId>` once a live gateway is wired up.
 */
export function allowTestPayments(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return parseBooleanEnv(env.ALLOW_TEST_PAYMENTS, true);
}
