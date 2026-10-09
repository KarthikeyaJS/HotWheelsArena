import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface QueryChipLinkProps {
  to: string;
  children: ReactNode;
  /** Called before navigation (e.g. to save a recent search). */
  onSelect?: () => void;
  icon?: ReactNode;
  /** Muted trailing detail, e.g. a count. */
  meta?: ReactNode;
  /** Tooltip with the full text (long queries truncate); defaults to string `children`. */
  title?: string;
  className?: string;
}

/** Chip-styled link for suggested / recent / popular searches. */
export function QueryChipLink({
  to,
  children,
  onSelect,
  icon,
  meta,
  title,
  className,
}: QueryChipLinkProps) {
  return (
    <Link
      to={to}
      onClick={onSelect}
      title={title ?? (typeof children === 'string' ? children : undefined)}
      className={cn(
        'group inline-flex h-9 max-w-full items-center gap-2 rounded border border-line bg-card/60 px-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-fg transition-[color,background-color,border-color,transform] duration-150 ease-race hover:border-accent/60 hover:bg-card-hover hover:text-accent-ink active:scale-[0.97]',
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 text-muted transition-colors group-hover:text-accent-ink [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
      {meta !== undefined ? (
        <span className="shrink-0 font-medium tabular-nums text-muted">{meta}</span>
      ) : null}
    </Link>
  );
}
