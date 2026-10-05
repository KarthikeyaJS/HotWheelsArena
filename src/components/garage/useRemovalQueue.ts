import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** How long a removed car can be put back before the delete is written. */
export const UNDO_WINDOW_MS = 6000;

export interface PendingRemoval {
  productId: string;
  name: string;
  /** Epoch millis when the removal is committed. */
  expiresAt: number;
}

export interface RemovalQueue {
  /** Newest first. */
  pending: PendingRemoval[];
  pendingIds: ReadonlySet<string>;
  /** Hides the car now and commits the removal after the undo window. */
  requestRemoval: (car: { productId: string; name: string }) => void;
  /** Cancels a pending removal (the car comes back untouched). */
  undo: (productId: string) => void;
  /** Commits a pending removal immediately. */
  commitNow: (productId: string) => void;
}

/**
 * Delayed-commit removals with undo. The car disappears immediately; the actual delete runs when
 * the undo window closes (or right away when the page unmounts), so "Undo" restores the original
 * entry exactly — purchase source, added date, copies and favourite flag included.
 *
 * @param commit performs the delete (e.g. `useGarageActions().removeFromGarage`)
 */
export function useRemovalQueue(
  commit: (productId: string, name: string) => void,
  windowMs: number = UNDO_WINDOW_MS,
): RemovalQueue {
  const [pending, setPending] = useState<PendingRemoval[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingRef = useRef<PendingRemoval[]>([]);
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const update = useCallback((next: (current: PendingRemoval[]) => PendingRemoval[]) => {
    pendingRef.current = next(pendingRef.current);
    setPending(pendingRef.current);
  }, []);

  const finish = useCallback(
    (productId: string, shouldCommit: boolean) => {
      const timer = timers.current.get(productId);
      if (timer !== undefined) clearTimeout(timer);
      timers.current.delete(productId);
      const item = pendingRef.current.find((entry) => entry.productId === productId);
      if (!item) return;
      update((current) => current.filter((entry) => entry.productId !== productId));
      if (shouldCommit) commitRef.current(item.productId, item.name);
    },
    [update],
  );

  const requestRemoval = useCallback(
    ({ productId, name }: { productId: string; name: string }) => {
      if (pendingRef.current.some((entry) => entry.productId === productId)) return;
      update((current) => [{ productId, name, expiresAt: Date.now() + windowMs }, ...current]);
      timers.current.set(
        productId,
        setTimeout(() => finish(productId, true), windowMs),
      );
    },
    [finish, update, windowMs],
  );

  const undo = useCallback((productId: string) => finish(productId, false), [finish]);
  const commitNow = useCallback((productId: string) => finish(productId, true), [finish]);

  // Leaving the page never loses a removal: commit whatever is still waiting.
  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
      const leftovers = pendingRef.current;
      pendingRef.current = [];
      leftovers.forEach((item) => commitRef.current(item.productId, item.name));
    };
  }, []);

  const pendingIds = useMemo(() => new Set(pending.map((entry) => entry.productId)), [pending]);

  return { pending, pendingIds, requestRemoval, undo, commitNow };
}
