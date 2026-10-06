import { describe, expect, it } from 'vitest';
import { hasUnsafeText, isUnsafeCodePoint, stripUnsafeText } from './text.js';

const UNSAFE = {
  NUL: '\u0000',
  BEL: '\u0007',
  VT: '\u000B',
  CR: '\u000D',
  DEL: '\u007F',
  NEL: '\u0085',
  ZWSP: '\u200B',
  LRM: '\u200E',
  RLM: '\u200F',
  RLO: '\u202E',
  LRI: '\u2066',
  PDI: '\u2069',
  BOM: '\uFEFF',
} as const;

/** Real-world text that needs ZWNJ (U+200C) / ZWJ (U+200D) to be spelled or rendered correctly. */
const JOINER_TEXT = {
  // Marathi eyelash-ra: र + ् + ZWJ + य ("दऱ्या").
  'Marathi eyelash-ra': 'मराठी: दर्\u200Dया',
  // Malayalam chillu written with ZWJ (ന + ് + ZWJ).
  'Malayalam chillu': 'മലയാളം: അവന്\u200D',
  // Hindi explicit half form: क + ् + ZWNJ + ष.
  'Hindi ZWNJ half form': 'क्\u200Cष',
  // Family emoji: a ZWJ sequence.
  'family emoji': 'Family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}',
} as const;

describe('isUnsafeCodePoint', () => {
  it.each(Object.entries(UNSAFE))('flags %s', (_name, char) => {
    expect(isUnsafeCodePoint(char.codePointAt(0) ?? -1)).toBe(true);
  });

  it('keeps TAB, LF, printable ASCII and the characters around each unsafe range', () => {
    for (const code of [0x09, 0x0a, 0x20, 0x41, 0x7e, 0xa0, 0x200a, 0x2010, 0x2029, 0x202f]) {
      expect(isUnsafeCodePoint(code)).toBe(false);
    }
    for (const code of [0x2065, 0x206a, 0xfefe, 0xff00]) {
      expect(isUnsafeCodePoint(code)).toBe(false);
    }
  });

  it('allows ZWNJ (U+200C) and ZWJ (U+200D)', () => {
    expect(isUnsafeCodePoint(0x200c)).toBe(false);
    expect(isUnsafeCodePoint(0x200d)).toBe(false);
  });
});

describe('stripUnsafeText', () => {
  it('strips NUL, BEL, U+202E, U+200B and U+FEFF', () => {
    expect(stripUnsafeText('Ni\u0000ce\u0007 pa\u202Eint\u200B jo\uFEFFb')).toBe('Nice paint job');
  });

  it('removes every unsafe character', () => {
    expect(stripUnsafeText(`a${Object.values(UNSAFE).join('')}b`)).toBe('ab');
  });

  it('keeps TAB and LF (multi-line text semantics)', () => {
    expect(stripUnsafeText('Line one\n\tLine two')).toBe('Line one\n\tLine two');
  });

  it('keeps emoji (with variation selectors) and Indian scripts', () => {
    expect(stripUnsafeText('शानदार कार 🏎️🔥')).toBe('शानदार कार 🏎️🔥');
    expect(stripUnsafeText('பிரமாதம் ✓')).toBe('பிரமாதம் ✓');
  });

  it.each(Object.entries(JOINER_TEXT))('keeps ZWNJ / ZWJ text unchanged: %s', (_name, text) => {
    expect(stripUnsafeText(text)).toBe(text);
  });

  it('still strips bidi and control characters next to ZWJ / ZWNJ', () => {
    expect(stripUnsafeText('दर्\u200Dया\u202E\u200F\u0000 क्\u200Cष')).toBe(
      'दर्\u200Dया क्\u200Cष',
    );
  });

  it('returns an empty string for text made only of invisible characters', () => {
    expect(stripUnsafeText('\u200B\u202E\uFEFF')).toBe('');
  });
});

describe('hasUnsafeText', () => {
  it('detects any unsafe character', () => {
    expect(hasUnsafeText('Flat 4\u0000')).toBe(true);
    expect(hasUnsafeText('MG \u202ERoad')).toBe(true);
    expect(hasUnsafeText('M\u200BG Road')).toBe(true);
    expect(hasUnsafeText('दर्\u200Dया \u200E')).toBe(true);
  });

  it('accepts ordinary, Hindi, emoji and multi-line text', () => {
    expect(hasUnsafeText('Flat 4, MG Road')).toBe(false);
    expect(hasUnsafeText('फ्लैट 4, एमजी रोड')).toBe(false);
    expect(hasUnsafeText('Great casting 🏎️\nWould buy again')).toBe(false);
    expect(hasUnsafeText('')).toBe(false);
  });

  it.each(Object.entries(JOINER_TEXT))('accepts ZWNJ / ZWJ text: %s', (_name, text) => {
    expect(hasUnsafeText(text)).toBe(false);
  });
});
