import { cn } from '@/lib/cn';
import { GarageCarCard } from './GarageCarCard';
import type { GarageCarView } from './garageModel';

export interface GarageCarGridProps {
  cars: readonly GarageCarView[];
  onRemove: (car: GarageCarView) => void;
  /** `aria-label` of the list. */
  label: string;
  /** Eager images for the first N cards. */
  priorityCount?: number;
  cardHeadingAs?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/** Responsive grid of parked cars: 1 → 2 (sm) → 3 (lg) → 4 (xl) columns. */
export function GarageCarGrid({
  cars,
  onRemove,
  label,
  priorityCount = 0,
  cardHeadingAs = 'h3',
  className,
}: GarageCarGridProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {cars.map((car, index) => (
        <li key={car.entry.productId} className="min-w-0">
          <GarageCarCard
            car={car}
            onRemove={onRemove}
            priority={index < priorityCount}
            headingAs={cardHeadingAs}
          />
        </li>
      ))}
    </ul>
  );
}
