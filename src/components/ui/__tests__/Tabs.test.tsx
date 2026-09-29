import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TabPanel } from '../TabPanel';
import { Tabs, type TabItem } from '../Tabs';

type Section = 'collection' | 'wishlist' | 'favorites' | 'stats';

const ITEMS: ReadonlyArray<TabItem<Section>> = [
  { id: 'collection', label: 'Collection' },
  { id: 'wishlist', label: 'Wishlist', badge: 3 },
  { id: 'favorites', label: 'Favorites', disabled: true },
  { id: 'stats', label: 'Stats' },
];

function Harness({
  onChange,
  activation,
}: {
  onChange?: (id: Section) => void;
  activation?: 'automatic' | 'manual';
}) {
  const [value, setValue] = useState<Section>('collection');
  return (
    <>
      <Tabs
        items={ITEMS}
        value={value}
        onChange={(id) => {
          setValue(id);
          onChange?.(id);
        }}
        label="Garage sections"
        idPrefix="garage"
        activation={activation}
      />
      {ITEMS.map((item) => (
        <TabPanel key={item.id} idPrefix="garage" tabId={item.id} active={value === item.id}>
          {item.id} panel
        </TabPanel>
      ))}
    </>
  );
}

const tab = (name: RegExp): HTMLElement => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('wires up tablist / tab / tabpanel ARIA', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Garage sections' })).toBeInTheDocument();

    const collection = tab(/collection/i);
    expect(collection).toHaveAttribute('aria-selected', 'true');
    expect(collection).toHaveAttribute('id', 'garage-tab-collection');
    expect(collection).toHaveAttribute('aria-controls', 'garage-panel-collection');
    expect(tab(/wishlist/i)).toHaveAttribute('aria-selected', 'false');

    const panel = screen.getByRole('tabpanel', { name: /collection/i });
    expect(panel).toHaveAttribute('id', 'garage-panel-collection');
    expect(panel).toHaveTextContent('collection panel');
  });

  it('uses a roving tabindex (only the selected tab is tabbable)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(tab(/collection/i)).toHaveAttribute('tabindex', '0');
    expect(tab(/wishlist/i)).toHaveAttribute('tabindex', '-1');
    expect(tab(/stats/i)).toHaveAttribute('tabindex', '-1');

    await user.tab();
    expect(tab(/collection/i)).toHaveFocus();
  });

  it('moves focus + selection with arrow keys, skipping disabled tabs and wrapping', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(tab(/wishlist/i)).toHaveFocus();
    expect(tab(/wishlist/i)).toHaveAttribute('aria-selected', 'true');
    expect(tab(/wishlist/i)).toHaveAttribute('tabindex', '0');
    expect(onChange).toHaveBeenLastCalledWith('wishlist');

    // "favorites" is disabled → skipped.
    await user.keyboard('{ArrowRight}');
    expect(tab(/stats/i)).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: /stats/i })).toHaveTextContent('stats panel');

    // Wraps around to the first tab.
    await user.keyboard('{ArrowRight}');
    expect(tab(/collection/i)).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(tab(/stats/i)).toHaveFocus();
    expect(onChange).not.toHaveBeenCalledWith('favorites');
  });

  it('supports Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();

    await user.keyboard('{End}');
    expect(tab(/stats/i)).toHaveFocus();
    expect(tab(/stats/i)).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(tab(/collection/i)).toHaveFocus();
    expect(tab(/collection/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('selects on click and hides inactive panels', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab(/wishlist/i));

    expect(tab(/wishlist/i)).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById('garage-panel-collection')).not.toBeVisible();
    expect(document.getElementById('garage-panel-wishlist')).toBeVisible();
  });

  it('in manual mode arrows only move focus; Enter selects', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} activation="manual" />);

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(tab(/wishlist/i)).toHaveFocus();
    expect(tab(/collection/i)).toHaveAttribute('aria-selected', 'true');
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('wishlist');
    expect(tab(/wishlist/i)).toHaveAttribute('aria-selected', 'true');
  });
});
