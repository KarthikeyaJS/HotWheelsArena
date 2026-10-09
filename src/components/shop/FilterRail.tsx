import { RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { RarityChip } from '@/components/ui/RarityChip';
import { FACET_VISIBLE_LIMIT } from '@/config/shop';
import type { ProductFiltersController } from '@/hooks/useProductFilters';
import { cn } from '@/lib/cn';
import type { Rarity, StockStatus } from '@/types';
import { ColorSwatch } from './ColorSwatch';
import { FacetCheckboxList } from './FacetCheckboxList';
import { FacetChips } from './FacetChips';
import { FilterGroup } from './FilterGroup';
import type { FacetOption, Facets } from './filtering';
import { PriceFilter } from './PriceFilter';

export interface SeriesLabel {
  name: string;
  year: number;
}

export interface FilterRailProps {
  /** Unique per instance (desktop rail vs mobile drawer) so ids never collide. */
  idPrefix: string;
  facets: Facets;
  controller: ProductFiltersController;
  /** Series names from `useSeries()` (falls back to the product's `seriesName`). */
  seriesLabels?: ReadonlyMap<string, SeriesLabel>;
  /** Desktop: render the "FILTERS" heading row (the drawer has its own title). */
  showHeading?: boolean;
  onClearAll: () => void;
  className?: string;
}

const AVAILABILITY_DOT: Readonly<Record<StockStatus, string>> = {
  'in-stock': 'bg-success',
  low: 'bg-danger',
  'sold-out': 'border border-muted bg-transparent',
};

const countSelected = (options: readonly FacetOption[]): number =>
  options.filter((option) => option.selected).length;

/**
 * The filter rail: MAKE · MODEL · SERIES · YEAR · COLOR · SCALE · PRICE · RARITY ·
 * AVAILABILITY, each a collapsible group with live facet counts (zero-count options disabled).
 */
export function FilterRail({
  idPrefix,
  facets,
  controller,
  seriesLabels,
  showHeading = true,
  onClearAll,
  className,
}: FilterRailProps) {
  const { filters, toggle, activeCount } = controller;
  const headingId = `${idPrefix}-heading`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const groupId = (name: string): string => `${idPrefix}-${name}`;
  const selectedMakes = facets.make.filter((option) => option.selected).map((o) => o.label);

  const seriesLabel = (option: FacetOption): string =>
    seriesLabels?.get(option.value)?.name ?? option.label;
  const seriesYear = (option: FacetOption): number | undefined =>
    seriesLabels?.get(option.value)?.year ?? option.year;

  return (
    <div className={cn('flex flex-col', className)}>
      {showHeading ? (
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="rounded-sm font-display text-sm font-bold tracking-hud text-fg"
          >
            Filters
          </h2>
          {activeCount > 0 ? (
            <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-2xs font-bold tabular-nums text-on-accent">
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          ) : null}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                onClearAll();
                // The button is swapped for "Tune the grid": keep keyboard focus in the rail.
                headingRef.current?.focus();
              }}
              className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-sm font-mono text-xs font-bold uppercase tracking-hud text-accent-ink transition-opacity hover:opacity-80 active:opacity-70 touch:min-h-11"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Clear all
            </button>
          ) : (
            <span className="hud ml-auto text-muted">Tune the grid</span>
          )}
        </div>
      ) : null}

      <FilterGroup id={groupId('make')} title="Make" selectedCount={countSelected(facets.make)}>
        <FacetCheckboxList
          options={facets.make}
          onToggle={(value) => toggle('make', value)}
          limit={FACET_VISIBLE_LIMIT.make}
          noun="makes"
        />
      </FilterGroup>

      <FilterGroup
        id={groupId('model')}
        title="Model"
        selectedCount={countSelected(facets.model)}
        defaultOpen={selectedMakes.length > 0}
        openWhen={selectedMakes.length > 0 || countSelected(facets.model) > 0}
        hint={
          selectedMakes.length > 0
            ? `Narrowed to ${selectedMakes.join(', ')}.`
            : 'Pick a make to narrow the list.'
        }
      >
        <FacetCheckboxList
          options={facets.model}
          onToggle={(value) => toggle('model', value)}
          limit={FACET_VISIBLE_LIMIT.model}
          noun="models"
          emptyMessage="No models from the selected makes in this view."
        />
      </FilterGroup>

      <FilterGroup
        id={groupId('series')}
        title="Series"
        selectedCount={countSelected(facets.series)}
      >
        <FacetCheckboxList
          options={facets.series}
          onToggle={(value) => toggle('series', value)}
          limit={FACET_VISIBLE_LIMIT.series}
          noun="series"
          getLabelText={(option) => {
            const year = seriesYear(option);
            return year ? `${seriesLabel(option)} ${year}` : seriesLabel(option);
          }}
          renderLabel={(option) => {
            const year = seriesYear(option);
            return (
              <>
                <span className="truncate" title={seriesLabel(option)}>
                  {seriesLabel(option)}
                </span>
                {year ? (
                  <span className="shrink-0 font-mono text-xs text-muted">
                    &apos;{String(year).slice(-2)}
                  </span>
                ) : null}
              </>
            );
          }}
        />
      </FilterGroup>

      <FilterGroup id={groupId('year')} title="Year" selectedCount={countSelected(facets.year)}>
        <FacetChips options={facets.year} onToggle={(value) => toggle('year', value)} />
      </FilterGroup>

      <FilterGroup
        id={groupId('color')}
        title="Color"
        selectedCount={countSelected(facets.color)}
        defaultOpen={false}
      >
        <FacetCheckboxList
          options={facets.color}
          onToggle={(value) => toggle('color', value)}
          limit={FACET_VISIBLE_LIMIT.color}
          noun="colors"
          columns={2}
          // The desktop rail is too narrow for two columns until xl (names clipped to "Bl…").
          listClassName="lg:grid-cols-1 xl:grid-cols-2"
          renderLabel={(option) => (
            <>
              <ColorSwatch color={option.value} />
              <span className="truncate" title={option.label}>
                {option.label}
              </span>
            </>
          )}
        />
      </FilterGroup>

      <FilterGroup id={groupId('scale')} title="Scale" selectedCount={countSelected(facets.scale)}>
        <FacetChips options={facets.scale} onToggle={(value) => toggle('scale', value)} />
      </FilterGroup>

      <FilterGroup
        id={groupId('price')}
        title="Price"
        active={filters.priceMin !== null || filters.priceMax !== null}
      >
        <PriceFilter
          bounds={facets.price}
          filters={filters}
          draft={controller.priceDraft}
          onDraft={controller.setPriceDraft}
          onCommit={controller.commitPrice}
          onReset={controller.clearPrice}
        />
      </FilterGroup>

      <FilterGroup
        id={groupId('rarity')}
        title="Rarity"
        selectedCount={countSelected(facets.rarity)}
      >
        <FacetCheckboxList
          options={facets.rarity}
          onToggle={(value) => toggle('rarity', value)}
          renderLabel={(option) => <RarityChip rarity={option.value as Rarity} size="sm" />}
        />
      </FilterGroup>

      <FilterGroup
        id={groupId('availability')}
        title="Availability"
        selectedCount={countSelected(facets.availability)}
      >
        <FacetCheckboxList
          options={facets.availability}
          onToggle={(value) => toggle('availability', value)}
          renderLabel={(option) => (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  AVAILABILITY_DOT[option.value as StockStatus],
                )}
              />
              <span className="truncate">{option.label}</span>
            </>
          )}
        />
      </FilterGroup>
    </div>
  );
}
