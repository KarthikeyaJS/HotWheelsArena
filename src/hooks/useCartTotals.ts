import { useMemo } from 'react';
import { computeOrderTotals } from '@shared/commerce';
import { useCartItems } from '@/store/cartStore';
import type { OrderTotals, SiteSettings } from '@/types';
import { useSettings } from './useSiteSettings';

export interface CartTotals extends OrderTotals {
  settings: SiteSettings;
}

/**
 * Display totals for the current cart using live site settings (same `computeOrderTotals` the
 * server uses, so `total` is the amount to charge).
 */
export function useCartTotals(): CartTotals {
  const items = useCartItems();
  const settings = useSettings();
  return useMemo(() => ({ ...computeOrderTotals(items, settings), settings }), [items, settings]);
}
