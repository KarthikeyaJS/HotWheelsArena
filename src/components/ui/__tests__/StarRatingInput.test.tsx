import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StarRating } from '../StarRating';
import { StarRatingInput } from '../StarRatingInput';

function Harness({ onChange }: { onChange?: (value: number) => void }) {
  const [value, setValue] = useState(0);
  return (
    <StarRatingInput
      label="Your rating"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('StarRatingInput', () => {
  it('is a labelled radio group of five stars', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Your rating' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('selects on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /4 stars/ }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole('radio', { name: /4 stars/ })).toBeChecked();
  });

  it('changes the rating with arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('radio', { name: /^1 star/ })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /^1 star/ })).toBeChecked();
    await user.keyboard('{ArrowRight}{ArrowUp}');
    expect(screen.getByRole('radio', { name: /3 stars/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /3 stars/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: /2 stars/ })).toBeChecked();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: /5 stars/ })).toBeChecked();
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: /^1 star/ })).toBeChecked();
  });
});

describe('StarRating', () => {
  it('announces the rating and count', () => {
    render(<StarRating value={4.46} count={23} />);
    expect(screen.getByRole('img', { name: 'Rated 4.5 out of 5, 23 ratings' })).toBeInTheDocument();
  });
});
