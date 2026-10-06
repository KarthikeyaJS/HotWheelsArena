import { FirebaseError } from 'firebase/app';
import { NewsletterSchema } from '@shared/schemas';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import errorsSource from './errors.ts?raw';
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

  it('passes a server message through only for errors from our callables (functions/ codes)', () => {
    const callable = {
      code: 'functions/invalid-argument',
      message: 'An order can hold at most 20 different cars',
    };
    expect(getFriendlyErrorMessage(callable)).toBe('An order can hold at most 20 different cars');
    expect(
      getFriendlyErrorMessage(
        new FirebaseError('functions/resource-exhausted', 'Slow down, racer.'),
      ),
    ).toBe('Slow down, racer.');
  });

  it('never shows raw Firestore SDK text for pass-through codes', () => {
    const sdk = new FirebaseError(
      'invalid-argument',
      'Invalid document reference. Document references must have an even number of segments, but orders/a/b has 3.',
    );
    expect(getFriendlyErrorMessage(sdk)).toBe(
      'Something went wrong under the hood. Please try again.',
    );
    expect(getFriendlyErrorMessage(sdk, 'Custom fallback')).toBe('Custom fallback');
    expect(
      getFriendlyErrorMessage(
        new FirebaseError(
          'invalid-argument',
          'Resource id "__x__" is invalid because it is reserved.',
        ),
      ),
    ).not.toMatch(/reserved/);
    expect(
      getFriendlyErrorMessage(
        new FirebaseError('failed-precondition', 'The query requires an index.'),
      ),
    ).not.toMatch(/index/);
    expect(
      getFriendlyErrorMessage(new FirebaseError('resource-exhausted', 'Quota exceeded.')),
    ).toMatch(/Too many laps/);
    expect(
      getFriendlyErrorMessage({
        code: 'firestore/already-exists',
        message: 'Document already exists: x',
      }),
    ).toBe('That car is already parked here.');
  });

  it('recognises ZodErrors structurally, without importing zod (entry-chunk module)', () => {
    expect(errorsSource).not.toMatch(/from\s+['"](zod|@shared\/schemas|@shared)['"]/);
  });

  it('uses the first issue of a real ZodError from the shared schemas', () => {
    const result = NewsletterSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ZodError');
      expect(getFriendlyErrorMessage(result.error)).toBe('Enter a valid email address');
    }
  });

  it('falls back when a ZodError-shaped error has no usable issue', () => {
    const empty = Object.assign(new Error('bad'), { name: 'ZodError', issues: [] });
    expect(getFriendlyErrorMessage(empty, 'Check the form')).toBe('Check the form');
    // Not a ZodError without an issues array (no crash, generic copy).
    const lookalike = Object.assign(new Error('bad'), { name: 'ZodError' });
    expect(getFriendlyErrorMessage(lookalike)).toMatch(/under the hood/);
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
