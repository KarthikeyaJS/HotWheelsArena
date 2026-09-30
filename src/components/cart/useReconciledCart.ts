import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeOrderTotals, DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { useProducts } from '@/hooks/useProducts';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCartItems, useCartStore } from '@/store/cartStore';
import type { CartItem, OrderTotals, SiteSettings } from '@/types';
import {
  effectiveQtyCap,
  isNoticeChange,
  mergeNoticeChanges,
  reconcileCart,
  type CartChange,
  type CartReconciliation,
} from './reconcile';

export interface ReconciledCart extends CartReconciliation {
  /** Raw cart lines from the store. */
  items: CartItem[];
  /** `computeOrderTotals(purchasable, settings)` — the amount the server will charge. */
  totals: OrderTotals;
  settings: SiteSettings;
  /** Effective per-line cap (settings.maxQtyPerItem ≤ MAX_QTY_PER_ITEM). */
  maxQtyPerItem: number;
  /** Catalogue / settings still loading or refreshing (prices not confirmed yet). */
  isVerifying: boolean;
  /** Catalogue failed to load (prices could not be re-checked). */
  verifyError: Error | null;
  retryVerify: () => void;
  /** Price / quantity changes detected since the page opened (shown as a notice). */
  notices: CartChange[];
  dismissNotices: () => void;
  /** Refetches catalogue + settings (e.g. after the server reported changed prices). */
  refresh: () => Promise<void>;
}

export interface UseReconciledCartOptions {
  /** Refetch the catalogue on mount when the cached copy is older than this (ms). */
  maxCatalogueAgeMs?: number;
}

/**
 * The cart, reconciled with the CURRENT catalogue + site settings. Writes refreshed
 * price / stock snapshots (and clamped quantities) back to the cart store, and remembers what
 * changed so the page can say "Prices updated since you added these".
 */
export function useReconciledCart({
  maxCatalogueAgeMs = 60_000,
}: UseReconciledCartOptions = {}): ReconciledCart {
  const items = useCartItems();
  const productsQuery = useProducts();
  const settingsQuery = useSiteSettings();
  const settings = settingsQuery.data ?? DEFAULT_SITE_SETTINGS;
  const maxQtyPerItem = effectiveQtyCap(settings.maxQtyPerItem);
  const [notices, setNotices] = useState<CartChange[]>([]);

  const products = productsQuery.data;
  const reconciliation = useMemo(
    () => reconcileCart(items, products, { maxQtyPerItem }),
    [items, products, maxQtyPerItem],
  );

  const totals = useMemo(
    () => computeOrderTotals(reconciliation.purchasable, settings),
    [reconciliation.purchasable, settings],
  );

  // Refresh a stale catalogue once on mount so the amount we charge matches the server.
  const { dataUpdatedAt, refetch: refetchProducts } = productsQuery;
  const mountFreshnessRef = useRef({ dataUpdatedAt, refetchProducts, maxCatalogueAgeMs });
  useEffect(() => {
    const initial = mountFreshnessRef.current;
    const age = Date.now() - initial.dataUpdatedAt;
    if (initial.dataUpdatedAt > 0 && age > initial.maxCatalogueAgeMs) {
      void initial.refetchProducts();
    }
  }, []);

  // Remember what changed, then write the fresh snapshots back to the store.
  useEffect(() => {
    if (!reconciliation.verified || !products) return;
    const noticeChanges = reconciliation.changes.filter(isNoticeChange);
    if (noticeChanges.length > 0) {
      setNotices((current) => mergeNoticeChanges(current, noticeChanges));
    }
    if (!reconciliation.needsSync) return;
    const store = useCartStore.getState();
    store.reconcile(products);
    // The store clamps to MAX_QTY_PER_ITEM; apply a lower per-collector cap from settings too.
    useCartStore
      .getState()
      .items.filter((line) => line.qty > maxQtyPerItem)
      .forEach((line) => store.setQty(line.productId, maxQtyPerItem));
  }, [reconciliation, products, maxQtyPerItem]);

  const retryVerify = useCallback(() => {
    void refetchProducts();
  }, [refetchProducts]);

  const { refetch: refetchSettings } = settingsQuery;
  const refresh = useCallback(async () => {
    await Promise.all([refetchProducts(), refetchSettings()]);
  }, [refetchProducts, refetchSettings]);

  const dismissNotices = useCallback(() => setNotices([]), []);

  const isVerifying =
    productsQuery.isPending ||
    (productsQuery.isFetching && productsQuery.isStale) ||
    (settingsQuery.isPlaceholderData && settingsQuery.isFetching);

  return {
    ...reconciliation,
    items,
    totals,
    settings,
    maxQtyPerItem,
    isVerifying,
    verifyError: productsQuery.isError && !products ? productsQuery.error : null,
    retryVerify,
    notices,
    dismissNotices,
    refresh,
  };
}
