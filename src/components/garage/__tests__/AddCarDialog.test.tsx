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
