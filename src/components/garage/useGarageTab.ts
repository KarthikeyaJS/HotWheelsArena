import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GarageTab } from '@/config/routes';
import { isGarageTab, parseGarageTab } from './garageModel';

const NAV_OPTIONS = { replace: true, preventScrollReset: true } as const;

/**
 * The active garage tab, synced with `?tab=` (same shape as `garagePath(tab)`): `collection`
 * is the bare `/garage`; unknown values fall back to it and are cleaned out of the URL.
 * Updates replace the history entry and keep the scroll position.
 */
export function useGarageTab(): [GarageTab, (tab: GarageTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = parseGarageTab(raw);

  useEffect(() => {
    if (raw === null || (isGarageTab(raw) && raw !== 'collection')) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('tab');
      return next;
    }, NAV_OPTIONS);
  }, [raw, setParams]);

  const setTab = useCallback(
    (nextTab: GarageTab) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (nextTab === 'collection') next.delete('tab');
        else next.set('tab', nextTab);
        return next;
      }, NAV_OPTIONS);
    },
    [setParams],
  );

  return [tab, setTab];
}
