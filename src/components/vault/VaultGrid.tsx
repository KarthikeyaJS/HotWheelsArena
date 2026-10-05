import { VaultCard } from '@/components/product/VaultCard';
import { cn } from '@/lib/cn';
import type { Product } from '@/types';
import { VAULT_GRID_CLASSES as GRID } from './vaultLayout';

export interface VaultGridProps {
  products: readonly Product[];
  /** Accessible name of the list. */
  label: string;
  /** First N cards load eagerly (above the fold). */
  priorityCount?: number;
  className?: string;
}

/** Large VaultCards in a responsive grid (`<ul>` of editions). */
export function VaultGrid({ products, label, priorityCount = 0, className }: VaultGridProps) {
  return (
    <ul aria-label={label} className={cn(GRID, className)}>
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <VaultCard product={product} priority={index < priorityCount} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
