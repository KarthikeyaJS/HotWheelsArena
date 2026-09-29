import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { tabId as buildTabId, tabPanelId } from './tabIds';

export interface TabPanelProps {
  /** Same `idPrefix` as the `<Tabs>`. */
  idPrefix: string;
  /** The tab id this panel belongs to. */
  tabId: string;
  active: boolean;
  children: ReactNode;
  /** Keep children mounted (hidden) when inactive — preserves state / avoids refetch. */
  keepMounted?: boolean;
  className?: string;
}

/**
 * Tab panel (`role="tabpanel"`, labelled by its tab). Always rendered so `aria-controls`
 * resolves; children mount only while active unless `keepMounted`.
 */
export function TabPanel({
  idPrefix,
  tabId,
  active,
  children,
  keepMounted = false,
  className,
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(idPrefix, tabId)}
      aria-labelledby={buildTabId(idPrefix, tabId)}
      hidden={!active}
      tabIndex={0}
      className={cn('animate-fade-in rounded-md', className)}
    >
      {active || keepMounted ? children : null}
    </div>
  );
}
