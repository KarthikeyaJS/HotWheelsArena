import { ArrowRight, ChevronDown, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { faqPanelId, faqTriggerId, type FaqEntry } from './faqData';

export interface FaqItemProps {
  item: FaqEntry;
  open: boolean;
  onToggle: (id: string) => void;
}

/**
 * One WAI-ARIA accordion item: an `<h3>` wrapping the disclosure `<button aria-expanded
 * aria-controls>`, a permalink, and the answer `role="region"` labelled by the button.
 */
export function FaqItem({ item, open, onToggle }: FaqItemProps) {
  const triggerId = faqTriggerId(item.id);
  const panelId = faqPanelId(item.id);

  return (
    <div
      id={item.id}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card shadow-card transition-[border-color,background-color] duration-200',
        open ? 'border-accent/50' : 'border-line hover:bg-card-hover',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('racing-stripe racing-stripe-left', open && 'is-active')}
      />
      <div className="flex items-stretch">
        <h3 className="m-0 min-w-0 flex-1 font-sans text-base normal-case tracking-normal">
          <button
            type="button"
            id={triggerId}
            aria-expanded={open}
            aria-controls={panelId}
            data-faq-trigger=""
            onClick={() => onToggle(item.id)}
            className="flex w-full items-center gap-4 rounded-xl py-4 pl-5 pr-4 text-left text-[15px] font-semibold leading-6 text-fg transition-colors duration-150 active:opacity-80 sm:pr-2 sm:text-base"
          >
            <span className="min-w-0 flex-1">{item.question}</span>
            <span
              aria-hidden="true"
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-[transform,border-color,color] duration-200 ease-race',
                open ? 'rotate-180 border-accent text-accent-ink' : 'border-line text-muted',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
        </h3>
        <Link
          to={{ hash: item.id }}
          aria-label={`Link to this question: ${item.question}`}
          title="Link to this question"
          className="my-3 mr-3 hidden w-9 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-fg/[0.06] hover:text-accent-ink active:scale-95 sm:grid"
        >
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="animate-fade-in border-t border-line px-5 pb-5 pt-4"
      >
        <div className="flex max-w-[70ch] flex-col gap-3 text-[15px] leading-7 text-fg/85">
          {item.answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {item.links && item.links.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Related pages">
            {item.links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-line bg-surface px-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-fg transition-[color,border-color,transform] duration-150 hover:border-accent/60 hover:text-accent-ink active:scale-[0.97] touch:h-11"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {/* Phones: the permalink lives here instead of beside the question (CA-09). */}
        <Link
          to={{ hash: item.id }}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-sm font-mono text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent-ink sm:hidden"
        >
          <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
          Link to this question
        </Link>
      </div>
    </div>
  );
}
