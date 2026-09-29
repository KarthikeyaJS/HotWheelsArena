import { useEffect, useMemo, useRef } from 'react';

/**
 * Global keyboard shortcuts.
 *
 * Combo syntax: modifiers and one key joined with `+`, case-insensitive —
 * `'mod+k'`, `'/'`, `'escape'`, `'shift+?'`, `'ctrl+alt+p'`.
 * - `mod` = Ctrl on Windows/Linux, ⌘ (Meta) on macOS / iOS.
 * - Modifier aliases: `ctrl|control`, `meta|cmd|command|super|win`, `alt|option|opt`, `shift`.
 * - Key aliases: `esc`, `space`, `return`, `up|down|left|right`, `del`, `plus`, `slash`.
 * - When `shift` is not written, it is ignored for single punctuation keys (`/`, `?`, `+` … depend
 *   on the keyboard layout) but must be released for letters, digits and named keys.
 */

export interface ParsedHotkey {
  /** Normalised `KeyboardEvent.key` (lower case), e.g. `k`, `/`, `escape`, `arrowup`, ` `. */
  key: string;
  /** Platform modifier (Ctrl / ⌘). */
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  /** `true` = must be held, `false` = must be released, `null` = don't care. */
  shift: boolean | null;
}

export interface UseHotkeyOptions {
  /** Listen at all (default true). */
  enabled?: boolean;
  /** Call `event.preventDefault()` when the combo matches (default true). */
  preventDefault?: boolean;
  /** Fire even while typing in inputs / textareas / contenteditable (default false). */
  allowInInputs?: boolean;
  /** Fire on auto-repeat while the key is held (default false). */
  allowRepeat?: boolean;
}

const MODIFIER_ALIASES: Readonly<Record<string, 'mod' | 'ctrl' | 'meta' | 'alt' | 'shift'>> = {
  mod: 'mod',
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
};

const KEY_ALIASES: Readonly<Record<string, string>> = {
  esc: 'escape',
  space: ' ',
  spacebar: ' ',
  return: 'enter',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  plus: '+',
  slash: '/',
};

/** Text-entry input types (typing in these must not trigger global shortcuts). */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

const TEXT_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);

const isSingleChar = (key: string): boolean => key.length === 1;
const isAlphanumeric = (key: string): boolean => /^[a-z0-9]$/.test(key);

/**
 * Parses a combo string. Throws on an empty combo or a combo without a key (`'mod+'`),
 * so typos surface during development.
 */
export function parseHotkey(combo: string): ParsedHotkey {
  const raw = combo.trim().toLowerCase();
  if (!raw) throw new Error('useHotkey: empty combo');
  if (raw.length > 1 && raw.endsWith('+') && raw.charAt(raw.length - 2) !== '+') {
    throw new Error(`useHotkey: combo "${combo}" has no key`);
  }

  // Split on "+" but keep a literal "+" key ("shift++" / "+").
  const parts: string[] = [];
  let buffer = '';
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw.charAt(index);
    if (char === '+' && buffer !== '') {
      parts.push(buffer);
      buffer = '';
    } else {
      buffer += char;
    }
  }
  if (buffer !== '') parts.push(buffer);

  const parsed: ParsedHotkey = {
    key: '',
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: null,
  };
  let explicitShift = false;

  parts.forEach((part, index) => {
    const token = part.trim() || part;
    const modifier = MODIFIER_ALIASES[token];
    const isLast = index === parts.length - 1;
    if (modifier && !isLast) {
      if (modifier === 'shift') {
        explicitShift = true;
      } else {
        parsed[modifier] = true;
      }
      return;
    }
    if (!isLast) throw new Error(`useHotkey: unknown modifier "${token}" in "${combo}"`);
    parsed.key = KEY_ALIASES[token] ?? token;
  });

  if (!parsed.key) throw new Error(`useHotkey: combo "${combo}" has no key`);

  if (explicitShift) {
    parsed.shift = true;
  } else if (isSingleChar(parsed.key) && !isAlphanumeric(parsed.key) && parsed.key !== ' ') {
    // Punctuation: layout-dependent shift state → don't care.
    parsed.shift = null;
  } else {
    parsed.shift = false;
  }
  return parsed;
}

/** macOS / iOS (⌘ is the platform modifier). */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform) || /Mac OS X|iPhone|iPad/.test(nav.userAgent);
}

type HotkeyEventLike = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
>;

/** Whether a keyboard event matches a parsed combo. */
export function matchesHotkey(
  event: HotkeyEventLike,
  hotkey: ParsedHotkey,
  isMac: boolean = isMacPlatform(),
): boolean {
  const wantCtrl = hotkey.ctrl || (hotkey.mod && !isMac);
  const wantMeta = hotkey.meta || (hotkey.mod && isMac);
  if (event.ctrlKey !== wantCtrl) return false;
  if (event.metaKey !== wantMeta) return false;
  if (event.altKey !== hotkey.alt) return false;
  if (hotkey.shift !== null && event.shiftKey !== hotkey.shift) return false;

  const key = (event.key ?? '').toLowerCase();
  if (key === hotkey.key) return true;

  // Layout-independent fallback for letters / digits (e.g. ⌥ or non-Latin layouts change `key`).
  if (isAlphanumeric(hotkey.key) && typeof event.code === 'string') {
    const expectedCode = /[a-z]/.test(hotkey.key)
      ? `Key${hotkey.key.toUpperCase()}`
      : `Digit${hotkey.key}`;
    return event.code === expectedCode;
  }
  return false;
}

/** True for text inputs, textareas, selects, contenteditable and ARIA text widgets. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target.getAttribute('type') ?? 'text').toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  const role = target.getAttribute('role');
  return role !== null && TEXT_ROLES.has(role);
}

const KEY_LABELS: Readonly<Record<string, string>> = {
  escape: 'Esc',
  enter: 'Enter',
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  delete: 'Del',
  backspace: 'Backspace',
  tab: 'Tab',
};

/**
 * Human labels for a combo, for `<Kbd>` hints: `hotkeyLabels('mod+k')` → `['Ctrl', 'K']`
 * (Windows) or `['⌘', 'K']` (macOS).
 */
export function hotkeyLabels(combo: string, isMac: boolean = isMacPlatform()): string[] {
  const hotkey = parseHotkey(combo);
  const labels: string[] = [];
  if (hotkey.ctrl || (hotkey.mod && !isMac)) labels.push(isMac ? '⌃' : 'Ctrl');
  if (hotkey.meta || (hotkey.mod && isMac)) labels.push(isMac ? '⌘' : 'Win');
  if (hotkey.alt) labels.push(isMac ? '⌥' : 'Alt');
  if (hotkey.shift) labels.push(isMac ? '⇧' : 'Shift');
  labels.push(KEY_LABELS[hotkey.key] ?? hotkey.key.toUpperCase());
  return labels;
}

/**
 * `aria-keyshortcuts` value for a combo (`'mod+k'` → `'Control+K'` / `'Meta+K'`).
 */
export function hotkeyAria(combo: string, isMac: boolean = isMacPlatform()): string {
  const hotkey = parseHotkey(combo);
  const parts: string[] = [];
  if (hotkey.ctrl || (hotkey.mod && !isMac)) parts.push('Control');
  if (hotkey.meta || (hotkey.mod && isMac)) parts.push('Meta');
  if (hotkey.alt) parts.push('Alt');
  if (hotkey.shift) parts.push('Shift');
  const key = hotkey.key === ' ' ? 'Space' : hotkey.key;
  parts.push(key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1));
  return parts.join('+');
}

/**
 * Registers a global `keydown` shortcut (or several — any match fires).
 * Ignores IME composition, events another handler already `preventDefault`-ed, auto-repeat
 * (unless `allowRepeat`) and keystrokes inside editable fields (unless `allowInInputs`).
 * The latest `handler` is always used — no need to memoise it.
 *
 * @example useHotkey('mod+k', () => toggleSearch(), { allowInInputs: true });
 * @example useHotkey('/', () => openSearch());
 */
export function useHotkey(
  combo: string | readonly string[],
  handler: (event: KeyboardEvent) => void,
  {
    enabled = true,
    preventDefault = true,
    allowInInputs = false,
    allowRepeat = false,
  }: UseHotkeyOptions = {},
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  const comboKey = typeof combo === 'string' ? combo : combo.join('\u0000');
  const parsed = useMemo(
    () => comboKey.split('\u0000').map((part) => parseHotkey(part)),
    [comboKey],
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const isMac = isMacPlatform();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.repeat && !allowRepeat) return;
      if (!allowInInputs && isEditableTarget(event.target)) return;
      if (!parsed.some((hotkey) => matchesHotkey(event, hotkey, isMac))) return;
      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, parsed, preventDefault, allowInInputs, allowRepeat]);
}
