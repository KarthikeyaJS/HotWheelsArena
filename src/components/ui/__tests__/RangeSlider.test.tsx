import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { formatINR } from '@/lib/format';
import { RangeSlider, type RangeValue } from '../RangeSlider';

function Harness({
  initial = [200, 2400],
  onChange,
  onCommit,
  minDistance,
  disabled,
}: {
  initial?: RangeValue;
  onChange?: (value: RangeValue) => void;
  onCommit?: (value: RangeValue) => void;
  minDistance?: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<RangeValue>(initial);
  return (
    <RangeSlider
      label="Price"
      min={0}
      max={2500}
      step={50}
      value={value}
      minDistance={minDistance}
      disabled={disabled}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onCommit={onCommit}
    />
  );
}

const minThumb = (): HTMLElement => screen.getByRole('slider', { name: 'Minimum Price' });
const maxThumb = (): HTMLElement => screen.getByRole('slider', { name: 'Maximum Price' });

describe('RangeSlider', () => {
  it('renders two labelled slider thumbs with values and INR value text', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument();

    expect(minThumb()).toHaveAttribute('aria-valuenow', '200');
    expect(minThumb()).toHaveAttribute('aria-valuemin', '0');
    expect(minThumb()).toHaveAttribute('aria-valuemax', '2400');
    expect(minThumb()).toHaveAttribute('aria-valuetext', formatINR(200));

    expect(maxThumb()).toHaveAttribute('aria-valuenow', '2400');
    expect(maxThumb()).toHaveAttribute('aria-valuemin', '200');
    expect(maxThumb()).toHaveAttribute('aria-valuemax', '2500');
    expect(maxThumb()).toHaveAttribute('aria-valuetext', formatINR(2400));
  });

  it('moves a thumb by one step with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    minThumb().focus();
    await user.keyboard('{ArrowRight}');
    expect(minThumb()).toHaveAttribute('aria-valuenow', '250');
    expect(onChange).toHaveBeenLastCalledWith([250, 2400]);

    await user.keyboard('{ArrowUp}');
    expect(minThumb()).toHaveAttribute('aria-valuenow', '300');

    await user.keyboard('{ArrowLeft}{ArrowDown}');
    expect(minThumb()).toHaveAttribute('aria-valuenow', '200');
  });

  it('jumps by a tenth of the range with PageUp / PageDown', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    maxThumb().focus();

    await user.keyboard('{PageDown}');
    expect(maxThumb()).toHaveAttribute('aria-valuenow', '2150');
    await user.keyboard('{PageUp}');
    expect(maxThumb()).toHaveAttribute('aria-valuenow', '2400');
    await user.keyboard('{PageUp}');
    expect(maxThumb()).toHaveAttribute('aria-valuenow', '2500');
  });

  it('Home / End go to the bounds without crossing the other thumb', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[500, 1500]} />);

    minThumb().focus();
    await user.keyboard('{Home}');
    expect(minThumb()).toHaveAttribute('aria-valuenow', '0');
    await user.keyboard('{End}');
    expect(minThumb()).toHaveAttribute('aria-valuenow', '1500');

    maxThumb().focus();
    await user.keyboard('{Home}');
    expect(maxThumb()).toHaveAttribute('aria-valuenow', '1500');
    await user.keyboard('{End}');
    expect(maxThumb()).toHaveAttribute('aria-valuenow', '2500');
  });

  it('keeps the minimum distance between thumbs', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[1000, 1200]} minDistance={100} />);

    minThumb().focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(minThumb()).toHaveAttribute('aria-valuenow', '1100');
    expect(maxThumb()).toHaveAttribute('aria-valuemin', '1200');
  });

  it('commits once the key is released', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    maxThumb().focus();
    await user.keyboard('{ArrowLeft}');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith([200, 2350]);

    // Keys that do not change anything are not committed.
    await user.keyboard('{Tab}');
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('is not focusable or operable when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness disabled onChange={onChange} />);
    expect(minThumb()).toHaveAttribute('tabindex', '-1');
    expect(minThumb()).toHaveAttribute('aria-disabled', 'true');

    minThumb().focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
