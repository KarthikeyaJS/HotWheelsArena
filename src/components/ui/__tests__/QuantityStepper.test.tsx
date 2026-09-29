import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QuantityStepper } from '../QuantityStepper';

function Harness({
  initial = 1,
  min,
  max = 5,
  onChange,
  disabled,
}: {
  initial?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <QuantityStepper
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      label="Quantity of Twin Mill"
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const input = (): HTMLElement => screen.getByRole('spinbutton', { name: 'Quantity of Twin Mill' });
const increase = (): HTMLElement => screen.getByRole('button', { name: 'Increase quantity' });
const decrease = (): HTMLElement => screen.getByRole('button', { name: 'Decrease quantity' });

describe('QuantityStepper', () => {
  it('exposes a labelled group and spinbutton with min / max / now', () => {
    render(<Harness initial={2} />);
    expect(screen.getByRole('group', { name: 'Quantity of Twin Mill' })).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-valuenow', '2');
    expect(input()).toHaveAttribute('aria-valuemin', '1');
    expect(input()).toHaveAttribute('aria-valuemax', '5');
    expect(input()).toHaveValue('2');
  });

  it('steps with the buttons and never passes max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={4} onChange={onChange} />);

    await user.click(increase());
    expect(input()).toHaveValue('5');
    expect(increase()).toHaveAttribute('aria-disabled', 'true');

    await user.click(increase());
    expect(input()).toHaveValue('5');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(5);
    // Focus is kept on the boundary button (aria-disabled, not disabled).
    expect(increase()).toHaveFocus();
  });

  it('never goes below min', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={1} onChange={onChange} />);
    expect(decrease()).toHaveAttribute('aria-disabled', 'true');
    await user.click(decrease());
    expect(input()).toHaveValue('1');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps typed values on blur / Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={2} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), '50');
    expect(input()).toHaveValue('50');
    await user.tab();
    expect(input()).toHaveValue('5');
    expect(onChange).toHaveBeenLastCalledWith(5);

    await user.clear(input());
    await user.type(input(), '0{Enter}');
    expect(input()).toHaveValue('1');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('ignores non-digits and reverts an empty entry', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={3} onChange={onChange} />);

    await user.clear(input());
    await user.type(input(), 'ab');
    expect(input()).toHaveValue('');
    await user.tab();
    expect(input()).toHaveValue('3');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('steps with ArrowUp / ArrowDown and jumps with Home / End', async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} />);
    await user.click(input());

    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('3');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(input()).toHaveValue('1');
    await user.keyboard('{End}');
    expect(input()).toHaveValue('5');
    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('5');
    await user.keyboard('{Home}');
    expect(input()).toHaveValue('1');
  });

  it('respects a custom min and clamps an out-of-range value prop', () => {
    render(<Harness initial={12} min={2} max={10} />);
    expect(input()).toHaveValue('10');
    expect(input()).toHaveAttribute('aria-valuemin', '2');
  });

  it('disables every control when disabled', () => {
    render(<Harness disabled />);
    expect(increase()).toBeDisabled();
    expect(decrease()).toBeDisabled();
    expect(input()).toBeDisabled();
  });
});
