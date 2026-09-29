import { describe, expect, it } from 'vitest';
import { extractClientIp } from './net.js';

describe('extractClientIp', () => {
  it('uses the first X-Forwarded-For entry', () => {
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })).toBe('203.0.113.7');
  });

  it('accepts an array header', () => {
    expect(extractClientIp({ 'x-forwarded-for': ['198.51.100.2', '10.0.0.1'] })).toBe(
      '198.51.100.2',
    );
  });

  it('strips an IPv4 port and the IPv4-mapped IPv6 prefix', () => {
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7:51234' })).toBe('203.0.113.7');
    expect(extractClientIp({}, '::ffff:127.0.0.1')).toBe('127.0.0.1');
  });

  it('handles bracketed IPv6 with a port and lower-cases it', () => {
    expect(extractClientIp({ 'x-forwarded-for': '[2001:DB8::1]:443' })).toBe('2001:db8::1');
  });

  it('falls back to the socket address', () => {
    expect(extractClientIp({}, '192.0.2.10')).toBe('192.0.2.10');
  });

  it('rejects garbage and returns null when nothing usable exists', () => {
    expect(extractClientIp({ 'x-forwarded-for': '<script>' })).toBeNull();
    expect(extractClientIp({}, undefined)).toBeNull();
    expect(extractClientIp({ 'x-forwarded-for': '' }, null)).toBeNull();
  });
});
