import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNDO_WINDOW_MS, useRemovalQueue } from '../useRemovalQueue';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRemovalQueue', () => {
  it('hides a car immediately and commits after the undo window', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useRemovalQueue(commit));
    act(() => result.current.requestRemoval({ productId: 'gt3-rs', name: 'Porsche 911 GT3 RS' }));
    expect(result.current.pendingIds.has('gt3-rs')).toBe(true);
    expect(result.current.pending[0]?.name).toBe('Porsche 911 GT3 RS');
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS - 1);
    });
    expect(commit).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(commit).toHaveBeenCalledWith('gt3-rs', 'Porsche 911 GT3 RS');
    expect(result.current.pending).toEqual([]);
  });

  it('undo cancels the removal without committing', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useRemovalQueue(commit));
    act(() => result.current.requestRemoval({ productId: 'thar', name: 'Mahindra Thar' }));
    act(() => result.current.undo('thar'));
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS * 2);
    });
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pendingIds.size).toBe(0);
  });

  it('keeps the newest removal first, ignores repeats and can commit early', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useRemovalQueue(commit));
    act(() => {
      result.current.requestRemoval({ productId: 'a', name: 'A' });
      result.current.requestRemoval({ productId: 'b', name: 'B' });
      result.current.requestRemoval({ productId: 'a', name: 'A' });
    });
    expect(result.current.pending.map((item) => item.productId)).toEqual(['b', 'a']);
    act(() => result.current.commitNow('a'));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('a', 'A');
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });
    expect(commit).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenLastCalledWith('b', 'B');
  });

  it('commits pending removals when the page unmounts', () => {
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useRemovalQueue(commit));
    act(() => result.current.requestRemoval({ productId: 'swift', name: 'Swift' }));
    unmount();
    expect(commit).toHaveBeenCalledWith('swift', 'Swift');
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
    });
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
