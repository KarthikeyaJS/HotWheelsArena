import { Check, Plus, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataState } from '@/components/common/DataState';
import { CarImage } from '@/components/product/CarImage';
import { SearchInput } from '@/components/search/SearchInput';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { RarityChip } from '@/components/ui/RarityChip';
import { Skeleton } from '@/components/ui/Skeleton';
import { MAX_GARAGE_QUANTITY } from '@/config/gamification';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCollectionNumber, formatINR, pluralize } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import { buildSearchIndex, searchProducts } from '@/lib/search';
import type { Product } from '@/types';

export interface AddCarDialogProps {
  open: boolean;
  onClose: () => void;
  /** Active catalogue. */
  catalogue: readonly Product[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Copies currently parked, by product id. */
  ownedCopies: ReadonlyMap<string, number>;
  /** Park a car that isn't in the garage yet. */
  onAdd: (product: Product) => void;
  /** Log one more copy of a parked car. */
  onAddCopy: (product: Product, copies: number) => void;
}

function PickerSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-lg border border-line bg-card p-2.5"
        >
          <Skeleton className="h-12 w-20 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-3/5 rounded-sm" />
            <Skeleton className="h-2.5 w-2/5 rounded-sm" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

/**
 * "ADD A CAR" picker: search the active catalogue (shared `lib/search` ranking) and park cars the
 * collector already owns. Parked cars show their copy count with a "+1 copy" action instead.
 */
export function AddCarDialog({
  open,
  onClose,
  catalogue,
  isLoading,
  error,
  onRetry,
  ownedCopies,
  onAdd,
  onAddCopy,
}: AddCarDialogProps) {
  const [query, setQuery] = useState('');
  const [hideParked, setHideParked] = useState(false);
  const debouncedQuery = useDebounce(query.trim(), 150);

  const index = useMemo(() => buildSearchIndex(catalogue), [catalogue]);
  const alphabetical = useMemo(
    () => [...catalogue].sort((a, b) => a.name.localeCompare(b.name)),
    [catalogue],
  );
  const results = useMemo(() => {
    const base = debouncedQuery ? searchProducts(index, debouncedQuery) : alphabetical;
    return hideParked ? base.filter((product) => !ownedCopies.has(product.id)) : base;
  }, [alphabetical, debouncedQuery, hideParked, index, ownedCopies]);

  const summary = debouncedQuery
    ? results.length === 0
      ? `No cars match “${debouncedQuery}”`
      : `${pluralize(results.length, 'match', 'matches')} for “${debouncedQuery}”`
    : `${pluralize(results.length, 'car')} in the catalogue`;

  const handleClose = (): void => {
    onClose();
    setQuery('');
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      eyebrow="MANUAL ENTRY // GARAGE LOG"
      title="Add a car"
      description="Already own it? Find it in the catalogue and park it in your garage. Manual entries count towards series and badges."
      bodyClassName="pb-4"
      footer={
        <Button variant="secondary" onClick={handleClose}>
          Done
        </Button>
      }
    >
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 bg-surface px-1 pb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          label="Search the catalogue"
          placeholder="Search by name, make or series…"
          data-autofocus=""
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="hud text-muted" role="status" aria-live="polite">
            {isLoading ? 'Loading the catalogue…' : summary}
          </p>
          <Checkbox
            label="Hide parked cars"
            checked={hideParked}
            onChange={(event) => setHideParked(event.currentTarget.checked)}
          />
        </div>
      </div>

      <DataState
        isLoading={isLoading}
        isError={Boolean(error)}
        error={error}
        onRetry={onRetry}
        errorCompact
        isEmpty={results.length === 0}
        loadingLabel="Loading the catalogue…"
        skeleton={<PickerSkeleton />}
        empty={
          <EmptyState
            variant="plain"
            size="sm"
            titleAs="p"
            icon={<SearchX />}
            title={hideParked && !debouncedQuery ? 'Every car is already parked' : 'No cars match'}
            description={
              hideParked && !debouncedQuery
                ? 'You own the whole catalogue. Legendary.'
                : 'Try a make, model or series name — e.g. “Porsche”, “GT-R” or “Rescue”.'
            }
          />
        }
      >
        {() => (
          <ul aria-label="Catalogue cars" className="flex flex-col gap-2">
            {results.map((product) => {
              const copies = ownedCopies.get(product.id) ?? 0;
              const image = primaryImageOf(product);
              return (
                <li
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-card p-2.5 pr-3 transition-colors hover:bg-card-hover"
                >
                  <CarImage
                    image={image}
                    alt=""
                    width={96}
                    height={60}
                    className="w-16 shrink-0 sm:w-20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-display text-[13px] font-bold uppercase leading-snug tracking-display text-fg">
                      {product.name}
                    </p>
                    <p className="hud mt-1 truncate text-[10px] text-muted">
                      {product.seriesName}
                      <span aria-hidden="true"> · </span>
                      <span className="sr-only">, </span>
                      {formatCollectionNumber(product.collectionNumber)}
                      <span aria-hidden="true"> · </span>
                      <span className="sr-only">, </span>
                      {formatINR(product.price)}
                    </p>
                  </div>
                  <RarityChip rarity={product.rarity} size="sm" className="hidden sm:inline-flex" />
                  {copies > 0 ? (
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="hud inline-flex items-center gap-1 text-[10px] text-success">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        Parked ×{copies}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus />}
                        disabled={copies >= MAX_GARAGE_QUANTITY}
                        aria-label={`+1 copy — ${product.name}`}
                        onClick={() => onAddCopy(product, copies + 1)}
                      >
                        1 copy
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      aria-label={`Park it — ${product.name}`}
                      onClick={() => onAdd(product)}
                      className="shrink-0"
                    >
                      Park it
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DataState>
    </Modal>
  );
}
