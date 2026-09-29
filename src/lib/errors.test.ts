import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  NotSignedInError,
  getErrorCode,
  getFriendlyErrorMessage,
  isChunkLoadError,
  isPermissionError,
  shouldRetryQuery,
} from './errors';

describe('getErrorCode', () => {
  it('normalises service prefixes but keeps auth codes', () => {
    expect(getErrorCode(new FirebaseError('functions/permission-denied', 'nope'))).toBe(
      'permission-denied',
    );
    expect(getErrorCode({ code: 'firestore/unavailable' })).toBe('unavailable');
    expect(getErrorCode(new FirebaseError('auth/popup-blocked', 'blocked'))).toBe(
      'auth/popup-blocked',
    );
    expect(getErrorCode(new Error('plain'))).toBeNull();
  });
});

describe('getFriendlyErrorMessage', () => {
  it('maps known codes to racing-themed copy', () => {
    expect(getFriendlyErrorMessage(new FirebaseError('permission-denied', 'x'))).toMatch(
      /Access denied/,
    );
    expect(getFriendlyErrorMessage(new NotSignedInError())).toMatch(/pit pass/i);
  });

  it('passes through human-written HttpsError messages', () => {
    const error = new FirebaseError(
      'functions/failed-precondition',
      'Prices changed — review your pit stop.',
    );
    expect(getFriendlyErrorMessage(error)).toBe('Prices changed — review your pit stop.');
  });

  it('uses the first zod issue', () => {
    const result = z.object({ email: z.string().email('Enter a valid email address') }).safeParse({
      email: 'nope',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFriendlyErrorMessage(result.error)).toBe('Enter a valid email address');
    }
  });

  it('falls back to a generic message', () => {
    expect(getFriendlyErrorMessage(new Error('stack trace soup'))).toMatch(/under the hood/);
    expect(getFriendlyErrorMessage('???', 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('helpers', () => {
  it('detects permission and chunk errors', () => {
    expect(isPermissionError({ code: 'unauthenticated' })).toBe(true);
    expect(isPermissionError({ code: 'not-found' })).toBe(false);
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js')),
    ).toBe(true);
  });

  it('retries once, never for permission / not-found errors', () => {
    expect(shouldRetryQuery(0, new Error('network'))).toBe(true);
    expect(shouldRetryQuery(1, new Error('network'))).toBe(false);
    expect(shouldRetryQuery(0, { code: 'permission-denied' })).toBe(false);
    expect(shouldRetryQuery(0, { code: 'functions/not-found' })).toBe(false);
  });
});
