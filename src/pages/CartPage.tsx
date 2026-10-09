import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockedLinesNotice } from '@/components/cart/BlockedLinesNotice';
import { CartCheckoutBar } from '@/components/cart/CartCheckoutBar';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { EmptyCart } from '@/components/cart/EmptyCart';
import { PriceUpdateNotice } from '@/components/cart/PriceUpdateNotice';
import { RemovedLineNotice } from '@/components/cart/RemovedLineNotice';
import { restoreCartLine } from '@/components/cart/restoreCartLine';
import type { ReconciledCartLine } from '@/components/cart/reconcile';
import { useReconciledCart } from '@/components/cart/useReconciledCart';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { formatINR, pluralize } from '@/lib/format';
import { useDocumentMeta } from '@/lib/seo';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/store/toastStore';
import type { CartItem } from '@/types';

interface RemovedEntry {
  key: string;
  item: CartItem;
  /** Position the line had, so Undo puts it back in place. */
  index: number;
  /** The "Removed" toast (it carries its own Undo action); dismissed when undone inline. */
  toastId?: string;
}

type FocusTarget = { kind: 'undo'; key: string } | { kind: 'line'; productId: string } | null;

/** Keep at most this many Undo placeholders around. */
const MAX_REMOVED = 3;

type Row =
  | { type: 'line'; key: string; line: ReconciledCartLine }
  | { type: 'removed'; key: string; entry: RemovedEntry };

export default function CartPage() {
  useDocumentMeta({
    title: 'Your Pit Stop',
    description: 'Review your cars, quantities and totals before you start the engine.',
    noindex: true,
  });

  const cart = useReconciledCart({ maxCatalogueAgeMs: 60_000 });
  const [removed, setRemoved] = useState<RemovedEntry[]>([]);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const linesHeadingRef = useRef<HTMLHeadingElement>(null);
  const emptyRegionRef = useRef<HTMLDivElement>(null);
  // Set when an action removes the control that had focus (a dismissed Undo row, the
  // "Remove unavailable" button). After that render, focus moves to the lines heading — or, once
  // the pit stop is empty and the heading is gone, to the first control of the empty view.
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (!restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const target =
      linesHeadingRef.current ??
      emptyRegionRef.current?.querySelector<HTMLElement>('button, a[href]') ??
      null;
    target?.focus();
  });

  const handleQtyChange = useCallback((productId: string, qty: number) => {
    useCartStore.getState().setQty(productId, qty);
  }, []);

  const handleUndo = useCallback((entry: RemovedEntry) => {
    if (entry.toastId) toast.dismiss(entry.toastId);
    // Already back (inline Undo + toast Undo, or re-added from elsewhere) → nothing to restore.
    if (useCartStore.getState().items.some((item) => item.productId === entry.item.productId)) {
      setRemoved((current) => current.filter((e) => e.key !== entry.key));
      return;
    }
    useCartStore.setState((state) => ({
      items: restoreCartLine(state.items, entry.item, entry.index),
    }));
    setRemoved((current) => current.filter((e) => e.key !== entry.key));
    setFocusTarget({ kind: 'line', productId: entry.item.productId });
    toast.success('Back in your pit stop', entry.item.name);
  }, []);

  const handleRemove = useCallback(
    (line: ReconciledCartLine) => {
      const items = useCartStore.getState().items;
      const index = items.findIndex((item) => item.productId === line.item.productId);
      if (index === -1) return;
      const entry: RemovedEntry = {
        key: `${line.item.productId}-${Date.now().toString(36)}`,
        item: items[index] ?? line.original,
        index,
      };
      useCartStore.getState().removeItem(line.item.productId);
      entry.toastId = toast({
        title: 'Removed from your pit stop',
        description: line.item.name,
        action: { label: 'Undo', onClick: () => handleUndo(entry) },
      });
      setRemoved((current) =>
        [...current.filter((e) => e.item.productId !== line.item.productId), entry].slice(
          -MAX_REMOVED,
        ),
      );
      setFocusTarget({ kind: 'undo', key: entry.key });
    },
    [handleUndo],
  );

  const handleDismissRemoved = useCallback((entry: RemovedEntry) => {
    restoreFocusRef.current = true;
    setRemoved((current) => current.filter((e) => e.key !== entry.key));
  }, []);

  const { blocked } = cart;
  const handleRemoveBlocked = useCallback(() => {
    const store = useCartStore.getState();
    restoreFocusRef.current = true;
    blocked.forEach((line) => store.removeItem(line.item.productId));
    toast({
      title: `Removed ${pluralize(blocked.length, 'unavailable car')}`,
      description: 'Your pit stop is ready to race.',
    });
  }, [blocked]);

  // Lines in cart order, with Undo placeholders slotted back where the removed lines were.
  const rows = useMemo<Row[]>(() => {
    const result: Row[] = cart.lines.map((line) => ({
      type: 'line',
      key: line.item.productId,
      line,
    }));
    removed
      .filter((entry) => !cart.items.some((item) => item.productId === entry.item.productId))
      .forEach((entry) => {
        result.splice(Math.min(entry.index, result.length), 0, {
          type: 'removed',
          key: entry.key,
          entry,
        });
      });
    return result;
  }, [cart.lines, cart.items, removed]);

  const isEmpty = cart.items.length === 0;
  const unitCount = cart.items.reduce((sum, item) => sum + item.qty, 0);
  // Same gate as the summary's START ENGINE (CartSummary).
  const canCheckout = !cart.hasBlockers && cart.lineLimitExcess === 0 && cart.totals.itemCount > 0;

  return (
    <Container className="py-6 sm:py-10 lg:py-14">
      <SectionHeading
        as="h1"
        eyebrow={
          isEmpty ? 'PIT STOP · EMPTY BAY' : `PIT STOP · ${pluralize(unitCount, 'UNIT', 'UNITS')}`
        }
        title="Your pit stop"
        description={
          isEmpty
            ? 'Nothing on the lift yet — every legend starts with one car.'
            : 'Tune quantities, check the numbers, then start your engine.'
        }
        action={
          isEmpty ? undefined : (
            <p className="hud rounded-md border border-line bg-surface px-3 py-2 text-muted">
              TOTAL{' '}
              <span className="ml-2 text-sm font-bold text-fg">{formatINR(cart.totals.total)}</span>
            </p>
          )
        }
      />

      {isEmpty ? (
        <div ref={emptyRegionRef} className="mt-8 flex flex-col gap-4 sm:mt-10">
          {rows.map((row) =>
            row.type === 'removed' ? (
              <RemovedLineNotice
                key={row.key}
                name={row.entry.item.name}
                onUndo={() => handleUndo(row.entry)}
                onDismiss={() => handleDismissRemoved(row.entry)}
                focusOnMount={focusTarget?.kind === 'undo' && focusTarget.key === row.key}
              />
            ) : null,
          )}
          <EmptyCart />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-10 lg:grid-cols-12 lg:gap-10">
          <section
            aria-labelledby="cart-lines-title"
            className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="cart-lines-title"
                ref={linesHeadingRef}
                tabIndex={-1}
                className="hud flex items-center gap-2 text-sm font-normal text-muted"
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-[1px] bg-accent" />
                On the lift · {pluralize(cart.items.length, 'car')}
              </h2>
            </div>

            <PriceUpdateNotice
              changes={cart.notices}
              onDismiss={cart.dismissNotices}
              headingAs="h3"
            />
            <BlockedLinesNotice
              blocked={cart.blocked}
              onRemoveAll={handleRemoveBlocked}
              headingAs="h3"
            />

            <ErrorBoundary label="Pit stop lines">
              <ul className="flex flex-col gap-4">
                {rows.map((row) => (
                  <li key={row.key}>
                    {row.type === 'line' ? (
                      <CartLineItem
                        line={row.line}
                        onQtyChange={handleQtyChange}
                        onRemove={handleRemove}
                        focusOnMount={
                          focusTarget?.kind === 'line' &&
                          focusTarget.productId === row.line.item.productId
                        }
                      />
                    ) : (
                      <RemovedLineNotice
                        name={row.entry.item.name}
                        onUndo={() => handleUndo(row.entry)}
                        onDismiss={() => handleDismissRemoved(row.entry)}
                        focusOnMount={focusTarget?.kind === 'undo' && focusTarget.key === row.key}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </ErrorBoundary>

            {canCheckout ? (
              <CartCheckoutBar totals={cart.totals} isVerifying={cart.isVerifying} />
            ) : null}
          </section>

          <div className="lg:col-span-5 xl:col-span-4">
            <ErrorBoundary label="Race summary">
              <CartSummary
                className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]"
                totals={cart.totals}
                settings={cart.settings}
                isVerifying={cart.isVerifying}
                verifyError={cart.verifyError}
                onRetryVerify={cart.retryVerify}
                hasBlockers={cart.hasBlockers}
                lineLimitExcess={cart.lineLimitExcess}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </Container>
  );
}
