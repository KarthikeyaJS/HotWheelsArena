import { useCallback, useEffect, useMemo, useRef } from 'react';
import { computeOrderTotals, DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { useProducts } from '@/hooks/useProducts';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useCartItems, useCartStore } from '@/store/cartStore';
import type { CartItem, OrderTotals, SiteSettings } from '@/types';
import { useCartNoticeStore } from './cartNoticeStore';
import {
  effectiveQtyCap,
  isNoticeChange,
  orderLineExcess,
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
  /**
   * Purchasable lines over MAX_ORDER_LINES (20) — the server refuses such an order, so checkout
   * is blocked (before any payment) until this many cars are removed. 0 when the order fits.
   */
  lineLimitExcess: number;
  /** Catalogue / settings still loading or refreshing (prices not confirmed yet). */
  isVerifying: boolean;
  /** Catalogue failed to load (prices could not be re-checked). */
  verifyError: Error | null;
  retryVerify: () => void;
  /** Price / quantity changes detected while reconciling (shown until dismissed). */
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
  const notices = useCartNoticeStore((state) => state.notices);
  const dismissNotices = useCartNoticeStore((state) => state.dismiss);

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

  // Remember what changed, then write the fresh snapshots back to the store — unless another tab
  // already reconciled the stored cart against a NEWER catalogue (`catalogueSyncedAt`). Writing
  // our older snapshot back would start a cross-tab ping-pong (every write rehydrates the other
  // tab via PersistSync). Instead refetch once per stored stamp and reconcile with that.
  const deferredSyncRef = useRef<{ stamp: number; dataUpdatedAt: number } | null>(null);
  useEffect(() => {
    if (!reconciliation.verified || !products) return;
    if (reconciliation.needsSync) {
      const storedStamp = useCartStore.getState().catalogueSyncedAt;
      if (storedStamp > dataUpdatedAt) {
        const deferred = deferredSyncRef.current;
        if (deferred?.stamp !== storedStamp) {
          deferredSyncRef.current = { stamp: storedStamp, dataUpdatedAt };
          void refetchProducts();
          return;
        }
        // Wait for that refetch. If it has landed and the stored stamp is STILL newer (clock
        // anomaly), fall through and write anyway so the cart cannot stay out of sync.
        if (dataUpdatedAt <= deferred.dataUpdatedAt) return;
      }
    }
    const noticeChanges = reconciliation.changes.filter(isNoticeChange);
    useCartNoticeStore.getState().record(noticeChanges);
    if (!reconciliation.needsSync) return;
    const store = useCartStore.getState();
    store.reconcile(products, dataUpdatedAt);
    // The store clamps to MAX_QTY_PER_ITEM; apply a lower per-collector cap from settings too.
    useCartStore
      .getState()
      .items.filter((line) => line.qty > maxQtyPerItem)
      .forEach((line) => store.setQty(line.productId, maxQtyPerItem));
  }, [reconciliation, products, maxQtyPerItem, dataUpdatedAt, refetchProducts]);

  // Forget notices about cars that left the cart (removed, or the order was placed).
  useEffect(() => {
    useCartNoticeStore.getState().prune(items.map((item) => item.productId));
  }, [items]);

  const retryVerify = useCallback(() => {
    void refetchProducts();
  }, [refetchProducts]);

  const { refetch: refetchSettings } = settingsQuery;
  const refresh = useCallback(async () => {
    await Promise.all([refetchProducts(), refetchSettings()]);
  }, [refetchProducts, refetchSettings]);

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
    lineLimitExcess: orderLineExcess(reconciliation.purchasable.length),
    isVerifying,
    verifyError: productsQuery.isError && !products ? productsQuery.error : null,
    retryVerify,
    notices,
    dismissNotices,
    refresh,
  };
}
