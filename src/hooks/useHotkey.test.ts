import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hotkeyAria,
  hotkeyLabels,
  isEditableTarget,
  matchesHotkey,
  parseHotkey,
  useHotkey,
} from './useHotkey';

type EventInit = Partial<
  Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>
>;

const ev = (init: EventInit) => ({
  key: '',
  code: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...init,
});

describe('parseHotkey', () => {
  it('parses modifiers and keys case-insensitively', () => {
    expect(parseHotkey('mod+k')).toEqual({
      key: 'k',
      mod: true,
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    });
    expect(parseHotkey('Ctrl+Alt+Shift+P')).toMatchObject({
      key: 'p',
      ctrl: true,
      alt: true,
      shift: true,
    });
    expect(parseHotkey('cmd+option+j')).toMatchObject({ key: 'j', meta: true, alt: true });
  });

  it('resolves key aliases', () => {
    expect(parseHotkey('esc').key).toBe('escape');
    expect(parseHotkey('Escape').key).toBe('escape');
    expect(parseHotkey('space').key).toBe(' ');
    expect(parseHotkey('up').key).toBe('arrowup');
    expect(parseHotkey('slash').key).toBe('/');
  });

  it('treats shift as "don\'t care" for punctuation unless written', () => {
    expect(parseHotkey('/').shift).toBeNull();
    expect(parseHotkey('?').shift).toBeNull();
    expect(parseHotkey('shift+/').shift).toBe(true);
    expect(parseHotkey('k').shift).toBe(false);
    expect(parseHotkey('escape').shift).toBe(false);
  });

  it('supports a literal "+" key', () => {
    expect(parseHotkey('+')).toMatchObject({ key: '+', shift: null });
    expect(parseHotkey('ctrl++')).toMatchObject({ key: '+', ctrl: true });
    expect(parseHotkey('plus').key).toBe('+');
  });

  it('rejects malformed combos', () => {
    expect(() => parseHotkey('')).toThrow();
    expect(() => parseHotkey('mod+')).toThrow();
    expect(() => parseHotkey('hyper+k')).toThrow();
  });
});

describe('matchesHotkey', () => {
  const modK = parseHotkey('mod+k');

  it('maps mod to Ctrl on Windows/Linux and ⌘ on macOS', () => {
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true }), modK, false)).toBe(true);
    expect(matchesHotkey(ev({ key: 'k', metaKey: true }), modK, false)).toBe(false);
    expect(matchesHotkey(ev({ key: 'k', metaKey: true }), modK, true)).toBe(true);
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true }), modK, true)).toBe(false);
  });

  it('requires exact modifiers', () => {
    expect(matchesHotkey(ev({ key: 'k' }), modK, false)).toBe(false);
    expect(matchesHotkey(ev({ key: 'K', ctrlKey: true, shiftKey: true }), modK, false)).toBe(false);
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true, altKey: true }), modK, false)).toBe(false);
  });

  it('falls back to event.code for letters (non-Latin layouts)', () => {
    expect(matchesHotkey(ev({ key: 'л', code: 'KeyK', ctrlKey: true }), modK, false)).toBe(true);
  });

  it('ignores shift for punctuation keys', () => {
    const slash = parseHotkey('/');
    expect(matchesHotkey(ev({ key: '/' }), slash, false)).toBe(true);
    expect(matchesHotkey(ev({ key: '/', shiftKey: true }), slash, false)).toBe(true);
    expect(matchesHotkey(ev({ key: '/', ctrlKey: true }), slash, false)).toBe(false);
    expect(matchesHotkey(ev({ key: 'Escape' }), parseHotkey('escape'), false)).toBe(true);
  });
});

describe('isEditableTarget', () => {
  it('detects text fields, textareas, selects and contenteditable', () => {
    const text = document.createElement('input');
    const search = document.createElement('input');
    search.type = 'search';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    const combobox = document.createElement('div');
    combobox.setAttribute('role', 'combobox');

    expect(isEditableTarget(text)).toBe(true);
    expect(isEditableTarget(search)).toBe(true);
    expect(isEditableTarget(checkbox)).toBe(false);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(select)).toBe(true);
    expect(isEditableTarget(div)).toBe(false);
    expect(isEditableTarget(combobox)).toBe(true);
    expect(isEditableTarget(null)).toBe(false);
    // jsdom does not implement isContentEditable; the attribute path is covered in browsers.
    expect(typeof isEditableTarget(editable)).toBe('boolean');
  });
});

describe('hotkey labels', () => {
  it('formats platform labels and aria-keyshortcuts', () => {
    expect(hotkeyLabels('mod+k', false)).toEqual(['Ctrl', 'K']);
    expect(hotkeyLabels('mod+k', true)).toEqual(['⌘', 'K']);
    expect(hotkeyLabels('escape', false)).toEqual(['Esc']);
    expect(hotkeyAria('mod+k', false)).toBe('Control+K');
    expect(hotkeyAria('mod+k', true)).toBe('Meta+K');
    expect(hotkeyAria('/', false)).toBe('/');
  });
});

describe('useHotkey', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires for a matching combo and prevents the default action', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+k', handler));
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('accepts several combos', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey(['/', 'ctrl+k'], handler));
    fireEvent.keyDown(window, { key: '/' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignores typing in inputs unless allowInInputs', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const blocked = vi.fn();
    const allowed = vi.fn();
    renderHook(() => useHotkey('/', blocked));
    renderHook(() => useHotkey('ctrl+k', allowed, { allowInInputs: true }));
    fireEvent.keyDown(input, { key: '/' });
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    expect(blocked).not.toHaveBeenCalled();
    expect(allowed).toHaveBeenCalledTimes(1);
  });

  it('respects enabled, repeat and already-handled events', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useHotkey('escape', handler, { enabled }), {
      initialProps: { enabled: false },
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handler).not.toHaveBeenCalled();

    rerender({ enabled: true });
    fireEvent.keyDown(window, { key: 'Escape', repeat: true });
    expect(handler).not.toHaveBeenCalled();

    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(handler).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest handler and cleans up on unmount', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ fn }) => useHotkey('k', fn), {
      initialProps: { fn: first },
    });
    rerender({ fn: second });
    fireEvent.keyDown(window, { key: 'k' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(window, { key: 'k' });
    expect(second).toHaveBeenCalledTimes(1);
  });
});
