/**
 * Amount checks shared by every verifier: the amount a collector was charged must equal the
 * server-computed order total to the paisa, otherwise prices (or shipping rules) changed after
 * the pit stop was priced on the client.
 */
import { AppError } from '../lib/errors.js';

export const PRICES_CHANGED_MESSAGE = 'Prices changed — review your pit stop.';

const toPaise = (rupees: number): number => Math.round(rupees * 100);

/** True when both amounts are finite and equal to the paisa. */
export function amountsMatch(charged: number, expected: number): boolean {
  return (
    Number.isFinite(charged) && Number.isFinite(expected) && toPaise(charged) === toPaise(expected)
  );
}

/** @throws AppError('failed-precondition', PRICES_CHANGED_MESSAGE) on any mismatch. */
export function assertAmountMatches(charged: number, expected: number): void {
  if (!amountsMatch(charged, expected)) {
    throw new AppError('failed-precondition', PRICES_CHANGED_MESSAGE, {
      reason: 'amount-mismatch',
      charged,
      expected,
    });
  }
}
