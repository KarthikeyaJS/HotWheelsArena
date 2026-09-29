/**
 * Client IP extraction for rate limiting. Cloud Functions (2nd gen) sit behind Google's front
 * end, which appends the caller's address to `X-Forwarded-For`; the first entry is the client.
 */

export type HeaderBag = Readonly<Record<string, string | string[] | undefined>>;

const IP_CHARS = /^[0-9a-fA-F:.]{2,45}$/;

function cleanIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length);
  // Strip an IPv4 port ("1.2.3.4:5678") or IPv6 brackets ("[::1]:443").
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed?.[1]) ip = bracketed[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'));
  return IP_CHARS.test(ip) ? ip.toLowerCase() : null;
}

/** Best-effort client IP, or `null` when it cannot be determined. */
export function extractClientIp(headers: HeaderBag, fallbackIp?: string | null): string | null {
  const forwarded = headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = forwardedValue?.split(',')[0];
  return cleanIp(first) ?? cleanIp(fallbackIp);
}
