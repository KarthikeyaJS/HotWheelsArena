import { ArrowRight, CornerDownRight, CornerDownLeft } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { CarImage } from '@/components/product/CarImage';
import { RarityChip } from '@/components/ui/RarityChip';
import { cn } from '@/lib/cn';
import { formatINR, pluralize } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import type { PaletteItem } from './paletteModel';

export interface PaletteOptionProps {
  item: PaletteItem;
  /** DOM id (referenced by the input's `aria-activedescendant`). */
  id: string;
  active: boolean;
  onSelect: (item: PaletteItem) => void;
  /** Pointer moved over the option → make it the active descendant. */
  onActivate: () => void;
}

/**
 * One `role="option"` row of the command palette. Focus never leaves the combobox input
 * (options are `tabIndex={-1}` and mouse-down is prevented); keyboard selection is driven by
 * the input, pointer selection by click.
 */
export function PaletteOption({ item, id, active, onSelect, onActivate }: PaletteOptionProps) {
  const Icon = item.icon;
  const product = item.product;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(item);
    }
  };

  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onMouseMove={active ? undefined : onActivate}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 transition-colors duration-100',
        active ? 'bg-card-hover' : 'hover:bg-card-hover/60',
        item.indent && 'pl-8 sm:pl-10',
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
        />
      ) : null}

      {product ? (
        <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface">
          <CarImage
            image={primaryImageOf(product)}
            alt=""
            width={56}
            height={40}
            aspectBox={false}
            className="h-full w-full"
          />
        </span>
      ) : item.indent ? (
        <CornerDownRight
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0', active ? 'text-accent-ink' : 'text-muted')}
        />
      ) : Icon ? (
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-surface',
            active ? 'border-accent/50 text-accent-ink' : 'border-line text-muted',
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-surface font-display text-xs font-bold',
            active ? 'border-accent/50 text-accent-ink' : 'border-line text-fg',
          )}
        >
          {item.label.charAt(0)}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm text-fg',
            item.kind === 'make' || item.kind === 'search' ? 'font-semibold' : 'font-medium',
          )}
        >
          {item.label}
        </span>
        {item.description && item.kind !== 'model' ? (
          <span className="hud mt-0.5 block truncate text-[10px] text-muted">
            {item.description}
          </span>
        ) : null}
      </span>

      {product ? (
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-sm font-semibold tabular-nums text-fg">
            {formatINR(product.price)}
          </span>
          {product.rarity !== 'common' ? <RarityChip rarity={product.rarity} size="sm" /> : null}
        </span>
      ) : item.count !== undefined ? (
        <span className="hud shrink-0 text-[10px] text-muted">
          {pluralize(item.count, 'car').toUpperCase()}
        </span>
      ) : null}

      <span
        aria-hidden="true"
        className={cn(
          'hidden shrink-0 text-accent-ink sm:inline-flex',
          active ? 'opacity-100' : 'opacity-0',
        )}
      >
        {item.kind === 'search' ? (
          <CornerDownLeft className="h-4 w-4" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
      </span>
    </div>
  );
}
