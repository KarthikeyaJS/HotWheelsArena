/**
 * Email normalisation + hashing for the newsletter (document id = sha256 of the normalised email,
 * so the same address always maps to the same document and duplicates are impossible).
 */
import { createHash } from 'node:crypto';

/** Unicode-normalised (NFKC), trimmed, lower-cased email. */
export function normalizeEmail(raw: string): string {
  return raw.normalize('NFKC').trim().toLowerCase();
}

/** Lower-case hex SHA-256 of a UTF-8 string. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Newsletter document id for an email (normalised first). */
export function emailDocId(email: string): string {
  return sha256Hex(normalizeEmail(email));
}
