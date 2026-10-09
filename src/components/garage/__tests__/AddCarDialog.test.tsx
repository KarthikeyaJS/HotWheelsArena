import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddCarDialog } from '../AddCarDialog';
import { CATALOGUE } from './fixtures';

function renderDialog(owned: Array<[string, number]> = [['revuelto', 2]]) {
  const onAdd = vi.fn();
  const onAddCopy = vi.fn();
  render(
    <AddCarDialog
      open
      onClose={vi.fn()}
      catalogue={CATALOGUE}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      ownedCopies={new Map(owned)}
      onAdd={onAdd}
      onAddCopy={onAddCopy}
    />,
  );
  return { onAdd, onAddCopy };
}

const rows = () =>
  within(screen.getByRole('list', { name: 'Catalogue cars' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('p')?.textContent);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AddCarDialog', () => {
  it('lists the catalogue A–Z and focuses the search field', () => {
    renderDialog();
    expect(rows()).toEqual([
      'Chevrolet Corvette C8.R',
      'Lamborghini Revuelto',
      'Maruti Suzuki Swift INRC Rally',
      'McLaren 750S',
      'Porsche 911 GT3 RS',
    ]);
    expect(screen.getByText('5 cars in the catalogue')).toBeInTheDocument();
  });

  it('searches with the shared ranking', () => {
    renderDialog();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'porsche' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(rows()).toEqual(['Porsche 911 GT3 RS']);
    expect(screen.getByText('1 match for “porsche”')).toBeInTheDocument();
  });

  it('parks new cars and logs extra copies of parked ones', () => {
    const { onAdd, onAddCopy } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Park it — McLaren 750S' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'mclaren-750s' }));
    expect(screen.getByText('Parked ×2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+1 copy — Lamborghini Revuelto' }));
    expect(onAddCopy).toHaveBeenCalledWith(expect.objectContaining({ id: 'revuelto' }), 3);
  });

  it('can hide parked cars and explains an empty search', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide parked cars' }));
    expect(rows()).not.toContain('Lamborghini Revuelto');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('No cars match')).toBeInTheDocument();
  });
});

describe('AddCarDialog focus', () => {
  function renderControlled(owned: Map<string, number>, hideParked = false) {
    const props = {
      open: true,
      onClose: vi.fn(),
      catalogue: CATALOGUE,
      isLoading: false,
      error: null,
      onRetry: vi.fn(),
      onAdd: vi.fn(),
      onAddCopy: vi.fn(),
    };
    const view = render(<AddCarDialog {...props} ownedCopies={owned} />);
    if (hideParked) fireEvent.click(screen.getByRole('checkbox', { name: 'Hide parked cars' }));
    return {
      ...props,
      update: (next: Map<string, number>) =>
        view.rerender(<AddCarDialog {...props} ownedCopies={next} />),
    };
  }

  it('keeps focus on the row action when "Park it" turns into "+1 copy"', () => {
    const dialog = renderControlled(new Map());
    const park = screen.getByRole('button', { name: 'Park it — McLaren 750S' });
    park.focus();
    fireEvent.click(park);
    expect(dialog.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'mclaren-750s' }));
    dialog.update(new Map([['mclaren-750s', 1]]));

    // Before: a different <button> replaced it and focus dropped to <body>.
    expect(screen.getByRole('button', { name: '+1 copy — McLaren 750S' })).toHaveFocus();
  });

  it('moves focus to the next row when "Hide parked cars" removes the parked one', () => {
    const dialog = renderControlled(new Map(), true);
    const park = screen.getByRole('button', { name: 'Park it — McLaren 750S' });
    park.focus();
    fireEvent.click(park);
    dialog.update(new Map([['mclaren-750s', 1]]));

    expect(screen.queryByRole('button', { name: /McLaren 750S/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Park it — Porsche 911 GT3 RS' })).toHaveFocus();
  });
});
