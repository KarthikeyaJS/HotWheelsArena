import type { CartItem } from '@/types';

/**
 * Re-inserts a removed line at its previous position (Undo). If the car was added back in the
 * meantime the existing line wins and the list is returned unchanged.
 */
export function restoreCartLine(
  items: readonly CartItem[],
  line: CartItem,
  index: number,
): CartItem[] {
  if (items.some((item) => item.productId === line.productId)) return [...items];
  const position = Math.max(0, Math.min(Math.floor(index), items.length));
  return [...items.slice(0, position), line, ...items.slice(position)];
}
