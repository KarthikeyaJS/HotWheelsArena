import { describe, expect, it } from 'vitest';
import { emailDocId, normalizeEmail, sha256Hex } from './email.js';

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Collector@Example.COM \n')).toBe('collector@example.com');
  });

  it('applies Unicode NFKC so full-width input maps to ASCII', () => {
    expect(normalizeEmail('ｃｏｌｌｅｃｔｏｒ＠example.com')).toBe('collector@example.com');
  });

  it('is idempotent', () => {
    const once = normalizeEmail(' Mixed.Case+tag@Garage.in ');
    expect(normalizeEmail(once)).toBe(once);
  });
});

describe('sha256Hex', () => {
  it('matches the published SHA-256 test vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('returns 64 lowercase hex chars', () => {
    expect(sha256Hex('')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('emailDocId', () => {
  it('is the hash of the normalised email, so variants dedupe to one document', () => {
    const id = emailDocId('collector@example.com');
    expect(emailDocId('  COLLECTOR@example.com ')).toBe(id);
    expect(id).toBe(sha256Hex('collector@example.com'));
  });

  it('never contains the email itself (safe document id)', () => {
    const id = emailDocId('collector@example.com');
    expect(id).not.toContain('@');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs for different addresses', () => {
    expect(emailDocId('a@example.com')).not.toBe(emailDocId('b@example.com'));
  });
});
