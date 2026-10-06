/**
 * Client IP extraction for rate limiting.
 *
 * The web app calls the callables directly (there is no Hosting rewrite to functions), so every
 * request reaches the function through Google's front end. That front end APPENDS the address of
 * the peer that connected to it to any `X-Forwarded-For` the caller sent
 * (`<caller-supplied entries>,<client-ip>[,<load-balancer-ip>]`) and does not verify the entries
 * before it. Everything left of the entry Google appended is therefore caller-controlled, so the
 * client IP is read from the RIGHT: entry `length - 1 - trustedProxyHops`.
 *
 * Note that Express's `req.ip` (with `trust proxy`, as the functions runtime configures it) is the
 * LEFT-most entry, i.e. caller-controlled, so callers pass the socket address as the fallback.
 */
import { isIP } from 'node:net';

export type HeaderBag = Readonly<Record<string, string | string[] | undefined>>;

/**
 * Trusted proxies between Google's front end and the function. `0` = the right-most
 * `X-Forwarded-For` entry is the client (direct callable traffic, as deployed today). Set it to `1`
 * if an external Application Load Balancer (or another proxy that appends its own entry after
 * Google's) is ever put in front of the functions.
 */
export const CLIENT_IP_TRUSTED_HOPS = 0;

const IP_CHARS = /^[0-9a-fA-F:.]{2,45}$/;

function cleanIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length);
  // Strip an IPv4 port ("1.2.3.4:5678") or IPv6 brackets ("[::1]:443").
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed?.[1]) ip = bracketed[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'));
  return IP_CHARS.test(ip) && isIP(ip) !== 0 ? ip.toLowerCase() : null;
}

/** Non-empty, trimmed `X-Forwarded-For` entries in order (an array header is joined first). */
function forwardedEntries(header: string | string[] | undefined): string[] {
  const joined = Array.isArray(header) ? header.join(',') : (header ?? '');
  return joined
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * The client IP for rate limiting, or `null` when it cannot be determined.
 *
 * Takes the `X-Forwarded-For` entry `trustedProxyHops` positions from the right. When the header
 * has fewer entries than `trustedProxyHops + 1`, or the selected entry is not an IP address, it
 * never falls back to a caller-controlled entry; it uses `fallbackIp` (the socket address) instead.
 */
export function extractClientIp(
  headers: HeaderBag,
  fallbackIp?: string | null,
  trustedProxyHops: number = CLIENT_IP_TRUSTED_HOPS,
): string | null {
  const entries = forwardedEntries(headers['x-forwarded-for']);
  const hops = Number.isFinite(trustedProxyHops) ? Math.max(0, Math.floor(trustedProxyHops)) : 0;
  const index = entries.length - 1 - hops;
  const forwarded = index >= 0 ? cleanIp(entries[index]) : null;
  return forwarded ?? cleanIp(fallbackIp);
}

/** The 8 hextets of a valid IPv6 address (leading zeros dropped), or `null`. */
function ipv6Hextets(ip: string): string[] | null {
  if (isIP(ip) !== 6) return null;
  let address = ip.toLowerCase();
  const zone = address.indexOf('%');
  if (zone !== -1) address = address.slice(0, zone);

  // An embedded IPv4 tail ("64:ff9b::192.0.2.1") is the last two hextets.
  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  if (tail.includes('.')) {
    const [a = 0, b = 0, c = 0, d = 0] = tail.split('.').map(Number);
    address = `${address.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = address.split('::');
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - rest.length;
  const groups = [
    ...head,
    ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => '0'),
    ...rest,
  ];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => Number.parseInt(group, 16).toString(16));
}

/**
 * Rate-limit subject for a client IP. IPv4 addresses are used as-is. IPv6 addresses are reduced to
 * their /64 prefix (`2001:db8:1:2::/64`): a single subscriber line is usually given a whole /64, so
 * keying on the full address would hand one client billions of separate buckets.
 */
export function rateLimitKeyForIp(ip: string): string {
  const hextets = ipv6Hextets(ip);
  return hextets ? `${hextets.slice(0, 4).join(':')}::/64` : ip;
}
