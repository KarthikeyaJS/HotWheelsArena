/**
 * Test fixtures for the functions unit tests (excluded from the deployable build).
 */
import type { Address, PaymentResult } from '../../../shared/index.js';
import { AppError } from '../lib/errors.js';
import { readSiteSettings, type ProductRecord, type ServerSettings } from '../lib/firestoreData.js';
import type { VerifiedPayment } from '../payments/types.js';

/** Runs `fn` and returns the `AppError` it throws (fails the test otherwise). */
export function captureAppError(fn: () => unknown): AppError {
  try {
    fn();
  } catch (error: unknown) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error('Expected an AppError to be thrown');
}

/** Awaits `promise` and returns the `AppError` it rejects with (fails the test otherwise). */
export async function captureAppErrorAsync(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error: unknown) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error('Expected an AppError rejection');
}

/** Stand-in for `FieldValue.serverTimestamp()` in planner tests. */
export const NOW = 'SERVER_TIMESTAMP' as const;
export type Now = typeof NOW;

export function product(
  overrides: Partial<ProductRecord> & Pick<ProductRecord, 'id'>,
): ProductRecord {
  return {
    slug: overrides.id,
    name: `Car ${overrides.id}`,
    price: 299,
    stock: 20,
    isActive: true,
    rarity: 'common',
    category: 'sports',
    image: `/placeholders/${overrides.id}.svg`,
    ...overrides,
  };
}

export function productMap(...products: ProductRecord[]): Map<string, ProductRecord | null> {
  return new Map(products.map((item) => [item.id, item]));
}

/** `settings/site` defaults (DEFAULT_SITE_SETTINGS) with overrides. */
export function settings(overrides: Partial<ServerSettings> = {}): ServerSettings {
  return { ...readSiteSettings(undefined), ...overrides };
}

export function address(overrides: Partial<Address> = {}): Address {
  return {
    name: 'Asha Rao',
    phone: '9876543210',
    pincode: '560001',
    line1: '12 MG Road, Flat 4B',
    line2: 'Near the metro',
    city: 'Bengaluru',
    state: 'Karnataka',
    ...overrides,
  };
}

export const TXN_ID = 'test_0123456789abcdef0123';

export function dummyPayment(overrides: Partial<PaymentResult> = {}): PaymentResult {
  return {
    provider: 'dummy',
    status: 'success',
    transactionId: TXN_ID,
    mode: 'test',
    method: 'card',
    amount: 0,
    ...overrides,
  };
}

export function verifiedPayment(overrides: Partial<VerifiedPayment> = {}): VerifiedPayment {
  return {
    provider: 'dummy',
    transactionId: TXN_ID,
    mode: 'test',
    method: 'card',
    amount: 0,
    status: 'success',
    ...overrides,
  };
}

/** Dot paths of every `undefined` value (Firestore rejects them) inside a document. */
export function findUndefinedPaths(value: unknown, path = ''): string[] {
  if (value === undefined) return [path || '(root)'];
  if (value === null || typeof value !== 'object') return [];
  const entries: Array<[string, unknown]> = Array.isArray(value)
    ? value.map((item, index): [string, unknown] => [String(index), item])
    : Object.entries(value);
  return entries.flatMap(([key, child]) =>
    findUndefinedPaths(child, path ? `${path}.${key}` : key),
  );
}
