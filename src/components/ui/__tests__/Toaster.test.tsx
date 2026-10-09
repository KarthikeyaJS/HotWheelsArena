import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIN_ACTION_TOAST_DURATION, toast, useToastStore } from '@/store/toastStore';
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

  it('renders an optional action button that runs the action and dismisses the toast', () => {
    const onUndo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Pulled from your pit stop', action: { label: 'Undo', onClick: onUndo } });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Pulled from your pit stop. Undo available in notifications',
    );
    expect(useToastStore.getState().toasts[0]?.duration).toBeGreaterThanOrEqual(
      MIN_ACTION_TOAST_DURATION,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(toastIds()).toHaveLength(0);
  });

  it('keeps later toasts expiring after a focused toast leaves without a blur', async () => {
    MotionGlobalConfig.skipAnimations = true;
    try {
      render(<Toaster />);
      act(() => {
        toast({ title: 'Focused', duration: 60_000 });
        toast({ title: 'Sticky', duration: 60_000 });
      });
      act(() => {
        screen.getAllByRole('button', { name: 'Dismiss notification' })[0]?.focus();
      });
      // Removed from code (no focus hand-off): browsers drop focus to <body> without a blur.
      act(() => {
        useToastStore.getState().dismiss(toastIds()[0] ?? '');
      });
      await waitFor(() => expect(screen.queryByText('Focused')).not.toBeInTheDocument());
      act(() => {
        toast({ title: 'Short', duration: 150 });
      });
      await waitFor(() =>
        expect(useToastStore.getState().toasts.map((item) => item.title)).toEqual(['Sticky']),
      );
    } finally {
      MotionGlobalConfig.skipAnimations = false;
    }
  });

  it('hands keyboard focus to the next toast, then back to where it came from', () => {
    render(
      <>
        <button type="button">Origin</button>
        <Toaster />
      </>,
    );
    act(() => {
      toast({ title: 'One', duration: 60_000 });
      toast({ title: 'Two', duration: 60_000 });
    });
    const origin = screen.getByRole('button', { name: 'Origin' });
    const [first, second] = screen.getAllByRole('button', { name: 'Dismiss notification' });
    act(() => origin.focus());
    act(() => first?.focus());
    fireEvent.click(first as HTMLElement);
    expect(second).toHaveFocus();
    fireEvent.click(second as HTMLElement);
    expect(origin).toHaveFocus();
    expect(toastIds()).toHaveLength(0);
  });

  it('resumes when the hovered toast was dismissed under a still pointer', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'One', duration: 60_000 });
      toast({ title: 'Two', duration: 1000 });
    });
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Notifications' }));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Dismiss notification' })[0] as HTMLElement,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(toastIds()).toHaveLength(1);

    // No mouseleave arrives (the card under the pointer is gone): the next move outside resumes.
    fireEvent.mouseMove(document.body);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(toastIds()).toHaveLength(0);
  });

  it('shows at most two toasts on phones and queues the rest behind "+N more"', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Address saved', duration: 1000 });
      toast({ title: 'First Ride', duration: 1000 });
      toast({ title: 'Treasure Hunter', duration: 1000 });
      toast({ title: 'Level up', duration: 1000 });
    });
    const stack = within(screen.getByRole('region', { name: 'Notifications' }));
    expect(stack.getByText('Address saved')).toBeInTheDocument();
    expect(stack.getByText('First Ride')).toBeInTheDocument();
    expect(stack.queryByText('Treasure Hunter')).not.toBeInTheDocument();
    expect(stack.getByText('+2 more notifications')).toBeInTheDocument();
    // Every toast pushed together is announced right away, queued or not.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Address saved First Ride Treasure Hunter Level up',
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(toastIds()).toHaveLength(2);
    expect(stack.getByText('Treasure Hunter')).toBeInTheDocument();
    expect(stack.queryByText(/more notification/)).not.toBeInTheDocument();
    // Queued toasts start their own timer only once they are shown.
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(toastIds()).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(toastIds()).toHaveLength(0);
  });

  it('shows the whole stack from the sm breakpoint up', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(min-width: 640px)',
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    render(<Toaster />);
    act(() => {
      toast({ title: 'One' });
      toast({ title: 'Two' });
      toast({ title: 'Three' });
    });
    const stack = within(screen.getByRole('region', { name: 'Notifications' }));
    expect(stack.getByText('Three')).toBeInTheDocument();
    expect(stack.queryByText(/more notification/)).not.toBeInTheDocument();
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
