import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { ScanlinesOverlay } from '../ScanlinesOverlay';

const overlay = () => screen.queryByTestId('scanlines-overlay');

beforeEach(() => {
  useUiStore.setState({ theme: 'dark', scanlines: 'auto' });
});

describe('ScanlinesOverlay', () => {
  it('auto: visible in the dark theme only', () => {
    render(<ScanlinesOverlay />);
    expect(overlay()).toBeInTheDocument();
    expect(overlay()).toHaveAttribute('aria-hidden', 'true');
    expect(overlay()).toHaveClass('pointer-events-none', 'fixed');

    act(() => useUiStore.setState({ theme: 'light' }));
    expect(overlay()).not.toBeInTheDocument();
  });

  it('on / off override the theme', () => {
    render(<ScanlinesOverlay />);
    act(() => useUiStore.setState({ theme: 'light', scanlines: 'on' }));
    expect(overlay()).toBeInTheDocument();
    act(() => useUiStore.setState({ theme: 'dark', scanlines: 'off' }));
    expect(overlay()).not.toBeInTheDocument();
  });
});
