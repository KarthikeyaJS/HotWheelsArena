import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type HudPanelTone = 'default' | 'accent' | 'highlight';

export interface HudPanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Mono label in the top-left notch, e.g. `TELEMETRY`, `GARAGE STATUS`. */
  title?: ReactNode;
  /** Element used for the title (default `p`; use a heading when it names a page section). */
  titleAs?: 'p' | 'h2' | 'h3' | 'h4';
  /** Right-aligned mono detail, e.g. `SYS OK`, `LIVE`. */
  meta?: ReactNode;
  /** Corner-bracket colour: `accent` orange (default), `highlight` yellow (vault/rare only), `default` metal. */
  tone?: HudPanelTone;
  as?: 'div' | 'section' | 'aside' | 'article';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

const BRACKETS: Readonly<Record<HudPanelTone, string>> = {
  default: 'border-metal/70',
  accent: 'border-accent',
  highlight: 'border-highlight',
};

const DOTS: Readonly<Record<HudPanelTone, string>> = {
  default: 'bg-metal',
  accent: 'bg-accent',
  highlight: 'bg-highlight',
};

const PADDING = { none: 'p-0', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' } as const;

/**
 * Racing-HUD frame: thin border, orange corner brackets, mono title + meta row. The frame is
 * decorative (brackets are `aria-hidden`); the content is regular, accessible markup.
 */
export function HudPanel({
  title,
  titleAs: TitleTag = 'p',
  meta,
  tone = 'accent',
  as: Tag = 'div',
  padding = 'md',
  className,
  children,
  ...rest
}: HudPanelProps) {
  const bracket = cn('pointer-events-none absolute h-3.5 w-3.5', BRACKETS[tone]);
  return (
    <Tag
      {...rest}
      className={cn(
        'relative rounded-md border border-line bg-surface/70 backdrop-blur-sm',
        PADDING[padding],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(bracket, '-left-px -top-px rounded-tl-md border-l-2 border-t-2')}
      />
      <span
        aria-hidden="true"
        className={cn(bracket, '-right-px -top-px rounded-tr-md border-r-2 border-t-2')}
      />
      <span
        aria-hidden="true"
        className={cn(bracket, '-bottom-px -left-px rounded-bl-md border-b-2 border-l-2')}
      />
      <span
        aria-hidden="true"
        className={cn(bracket, '-bottom-px -right-px rounded-br-md border-b-2 border-r-2')}
      />
      {title || meta ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <TitleTag className="hud flex min-w-0 items-center gap-2 text-muted">
              <span
                aria-hidden="true"
                className={cn('h-1.5 w-1.5 shrink-0 rounded-[1px]', DOTS[tone])}
              />
              <span className="truncate">{title}</span>
            </TitleTag>
          ) : (
            <span />
          )}
          {meta ? <span className="hud shrink-0 text-muted">{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
