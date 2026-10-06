/**
 * Plain-text hygiene shared by the web app and Cloud Functions (pure, no dependencies — safe for
 * any bundle, including the entry chunk).
 *
 * "Unsafe" characters are invisible or reorder what a reader sees: C0/C1 control characters
 * (except TAB and LF, which multi-line text keeps), the zero-width space, bidi marks,
 * embeddings/overrides/isolates and the BOM. React renders them as text, so they are not an
 * injection risk, but they can hide or spoof content (e.g. a U+202E name that reads backwards).
 *
 * ZWNJ (U+200C) and ZWJ (U+200D) are deliberately allowed: Indian scripts need them for correct
 * spellings (Marathi eyelash-ra, Malayalam chillu forms, explicit half forms in Hindi/Bengali)
 * and emoji ZWJ sequences (the family emoji) are built from them. They cannot reorder text, so
 * they enable no bidi spoof.
 */

/**
 * C0/C1 control characters except TAB (0x09) and LF (0x0A), the zero-width space (U+200B), the
 * LRM/RLM bidi marks (U+200E–U+200F), bidi embeddings/overrides (U+202A–U+202E) and isolates
 * (U+2066–U+2069), and the BOM (U+FEFF). ZWNJ/ZWJ (U+200C–U+200D) are allowed.
 */
export function isUnsafeCodePoint(code: number): boolean {
  return (
    code <= 0x08 ||
    (code >= 0x0b && code <= 0x1f) ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x200b ||
    code === 0x200e ||
    code === 0x200f ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff
  );
}

/** `text` without its unsafe characters (everything else, including TAB and LF, is kept). */
export function stripUnsafeText(text: string): string {
  let result = '';
  for (const char of text) {
    if (!isUnsafeCodePoint(char.codePointAt(0) ?? 0)) result += char;
  }
  return result;
}

/** Whether `text` contains any unsafe character. */
export function hasUnsafeText(text: string): boolean {
  for (const char of text) {
    if (isUnsafeCodePoint(char.codePointAt(0) ?? 0)) return true;
  }
  return false;
}
