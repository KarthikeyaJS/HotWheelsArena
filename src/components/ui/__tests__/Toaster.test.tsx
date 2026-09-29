import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from '@/store/toastStore';
import { Toaster } from '../Toaster';

const toastIds = (): string[] => useToastStore.getState().toasts.map((item) => item.id);

describe('Toaster', () => {
  beforeEach(() => {
    useToastStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    useToastStore.getState().clear();
  });

  it('renders toasts and announces them in a polite live region', () => {
    render(<Toaster />);
    act(() => {
      toast.success('Added to your pit stop', 'Twin Mill');
    });
    expect(screen.getByText('Added to your pit stop')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Added to your pit stop. Twin Mill');
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('announces errors assertively', () => {
    render(<Toaster />);
    act(() => {
      toast.error("Couldn't add to garage", 'Check your connection.');
    });
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't add to garage");
  });

  it('dismisses with the close button', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Signed out' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(toastIds()).toHaveLength(0);
  });

  it('auto-dismisses after its duration and pauses while hovered', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Saved', duration: 1000 });
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(toastIds()).toHaveLength(1);

    const region = screen.getByRole('region', { name: 'Notifications' });
    fireEvent.mouseEnter(region);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(toastIds()).toHaveLength(1);

    fireEvent.mouseLeave(region);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(toastIds()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(toastIds()).toHaveLength(0);
  });

  it('keeps sticky toasts (duration Infinity)', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Test mode', duration: Number.POSITIVE_INFINITY });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(toastIds()).toHaveLength(1);
  });
});
