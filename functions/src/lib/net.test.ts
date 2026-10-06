import { describe, expect, it } from 'vitest';
import { CLIENT_IP_TRUSTED_HOPS, extractClientIp, rateLimitKeyForIp } from './net.js';

describe('extractClientIp', () => {
  it('trusts no proxy hops by default (direct callable traffic)', () => {
    expect(CLIENT_IP_TRUSTED_HOPS).toBe(0);
  });

  it("uses the right-most X-Forwarded-For entry (the one Google's front end appends)", () => {
    expect(extractClientIp({ 'x-forwarded-for': '10.1.1.1, 203.0.113.7' })).toBe('203.0.113.7');
  });

  it('ignores a spoofed first entry: the client key does not change with it', () => {
    const real = '192.0.2.44';
    const keys = new Set(
      ['10.0.9.1', '10.1.9.1', '8.8.8.8', '<script>'].map((spoofed) =>
        extractClientIp({ 'x-forwarded-for': `${spoofed}, ${real}` }),
      ),
    );
    expect([...keys]).toEqual([real]);
  });

  it('joins an array header before picking the right-most entry', () => {
    expect(extractClientIp({ 'x-forwarded-for': ['198.51.100.2', '10.0.0.1'] })).toBe('10.0.0.1');
    expect(
      extractClientIp({ 'x-forwarded-for': ['198.51.100.2, 192.0.2.1', ' 203.0.113.9 '] }),
    ).toBe('203.0.113.9');
  });

  it('returns a single entry', () => {
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7' })).toBe('203.0.113.7');
  });

  it('drops empty entries', () => {
    expect(extractClientIp({ 'x-forwarded-for': '10.0.0.1, 203.0.113.7, , ' })).toBe('203.0.113.7');
  });

  it('skips trusted proxy hops from the right', () => {
    expect(
      extractClientIp({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7, 35.191.0.1' }, null, 1),
    ).toBe('203.0.113.7');
  });

  it('falls back to the socket address when there are fewer entries than hops + 1', () => {
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7' }, '192.0.2.10', 1)).toBe(
      '192.0.2.10',
    );
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7' }, null, 1)).toBeNull();
  });

  it('never falls back to a caller-controlled entry when the right-most one is garbage', () => {
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7, <script>' }, '192.0.2.10')).toBe(
      '192.0.2.10',
    );
    expect(extractClientIp({ 'x-forwarded-for': '203.0.113.7, not-an-ip' })).toBeNull();
  });

  it('rejects strings that only look like addresses', () => {
    expect(extractClientIp({ 'x-forwarded-for': '999.1.1.1' })).toBeNull();
    expect(extractClientIp({ 'x-forwarded-for': 'beef' })).toBeNull();
    expect(extractClientIp({ 'x-forwarded-for': '1.2.3' })).toBeNull();
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

describe('rateLimitKeyForIp', () => {
  it('keeps IPv4 addresses unchanged', () => {
    expect(rateLimitKeyForIp('203.0.113.7')).toBe('203.0.113.7');
  });

  it('reduces IPv6 addresses to their /64, whatever the notation', () => {
    const key = rateLimitKeyForIp('2001:db8:1:2:3:4:5:6');
    expect(key).toBe('2001:db8:1:2::/64');
    expect(rateLimitKeyForIp('2001:db8:1:2:ffff::1')).toBe(key);
    expect(rateLimitKeyForIp('2001:0db8:0001:0002:0000:0000:0000:0001')).toBe(key);
    expect(rateLimitKeyForIp('2001:db8:1:2::192.0.2.1')).toBe(key);
  });

  it('expands "::" in the network half', () => {
    expect(rateLimitKeyForIp('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(rateLimitKeyForIp('::1')).toBe('0:0:0:0::/64');
  });

  it('keeps different /64 networks apart', () => {
    expect(rateLimitKeyForIp('2001:db8:1:2::1')).not.toBe(rateLimitKeyForIp('2001:db8:1:3::1'));
  });
});
