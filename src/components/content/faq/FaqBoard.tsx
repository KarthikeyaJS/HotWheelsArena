import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { pluralize } from '@/lib/format';
import { idFromHash } from '../useHashScroll';
import { faqEntryIds, type FaqGroup } from './faqData';
import { FaqItem } from './FaqItem';

export interface FaqBoardProps {
  groups: readonly FaqGroup[];
}

const TRIGGER_SELECTOR = 'button[data-faq-trigger]';

/**
 * All FAQ groups as WAI-ARIA accordions. Items open independently; `#faq-…` deep links open
 * (and scroll to) their item; ↑/↓/Home/End move between question buttons across groups;
 * "Expand all" / "Collapse all" toggle everything.
 */
export function FaqBoard({ groups }: FaqBoardProps) {
  const { hash } = useLocation();
  const allIds = useMemo(() => faqEntryIds(groups), [groups]);
  const totalItems = allIds.size;
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => {
    const target = idFromHash(hash);
    return new Set(target && allIds.has(target) ? [target] : []);
  });

  // Deep links (`/faq#faq-gst`) — also when the hash changes while the page is open.
  useEffect(() => {
    const target = idFromHash(hash);
    if (!target || !allIds.has(target)) return;
    setOpenIds((previous) => (previous.has(target) ? previous : new Set(previous).add(target)));
  }, [hash, allIds]);

  const toggle = useCallback((id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allOpen = openIds.size === totalItems && totalItems > 0;

  // Arrow-key roving between question buttons (WAI-ARIA accordion pattern), delegated from the
  // list container with a native listener.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = listRef.current;
    if (!container) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(TRIGGER_SELECTOR)) return;
      const triggers = Array.from(container.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR));
      const index = triggers.indexOf(target);
      if (index === -1) return;
      let next: HTMLElement | undefined;
      switch (event.key) {
        case 'ArrowDown':
          next = triggers[(index + 1) % triggers.length];
          break;
        case 'ArrowUp':
          next = triggers[(index - 1 + triggers.length) % triggers.length];
          break;
        case 'Home':
          next = triggers[0];
          break;
        case 'End':
          next = triggers[triggers.length - 1];
          break;
        default:
          return;
      }
      event.preventDefault();
      next?.focus();
    };
    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-card">
        <p className="hud text-muted">
          <span className="text-fg">{pluralize(totalItems, 'answer')}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {pluralize(groups.length, 'topic')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
          onClick={() => setOpenIds(allOpen ? new Set() : new Set(allIds))}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      <div ref={listRef} className="flex flex-col gap-14">
        {groups.map((group) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`}>
            <div className="mb-5 flex flex-col gap-1.5">
              <h2
                id={`${group.id}-title`}
                tabIndex={-1}
                className="text-xl leading-snug text-fg sm:text-2xl"
              >
                {group.title}
              </h2>
              <p className="text-sm text-muted sm:text-base">{group.description}</p>
            </div>
            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <FaqItem key={item.id} item={item} open={openIds.has(item.id)} onToggle={toggle} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
