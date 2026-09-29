import { describe, expect, it } from 'vitest';
import { allowTestPayments, parseBooleanEnv } from './env.js';

describe('parseBooleanEnv', () => {
  it.each(['true', 'TRUE', ' 1 ', 'yes', 'on'])('reads %j as true', (raw) => {
    expect(parseBooleanEnv(raw, false)).toBe(true);
  });

  it.each(['false', 'False', '0', 'no', 'off'])('reads %j as false', (raw) => {
    expect(parseBooleanEnv(raw, true)).toBe(false);
  });

  it.each([undefined, '', '   ', 'maybe'])('falls back for %j', (raw) => {
    expect(parseBooleanEnv(raw, true)).toBe(true);
    expect(parseBooleanEnv(raw, false)).toBe(false);
  });
});

describe('allowTestPayments (ALLOW_TEST_PAYMENTS)', () => {
  it('defaults to true when unset', () => {
    expect(allowTestPayments({})).toBe(true);
  });

  it('can be switched off', () => {
    expect(allowTestPayments({ ALLOW_TEST_PAYMENTS: 'false' })).toBe(false);
  });

  it('stays on for explicit true', () => {
    expect(allowTestPayments({ ALLOW_TEST_PAYMENTS: 'true' })).toBe(true);
  });
});
