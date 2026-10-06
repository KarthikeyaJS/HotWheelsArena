import type { MouseEventHandler } from 'react';
import { Link } from 'react-router-dom';
import { BRAND_LOGO_TEXT, BRAND_NAME } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  size?: LogoSize;
  /** Render as a link to the home page (default true). */
  asLink?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
  /**
   * Extra classes for the wordmark text, e.g. `max-[359px]:sr-only` in the Navbar so the header
   * reflows at 320px. The link's accessible name ("<brand> — home") is unaffected.
   */
  textClassName?: string;
}

const TEXT_SIZES: Readonly<Record<LogoSize, string>> = {
  sm: 'text-[12px] sm:text-[13px]',
  md: 'text-[13px] sm:text-[15px] lg:text-[13px] xl:text-[15px]',
  lg: 'text-lg sm:text-xl',
};

const MARK_SIZES: Readonly<Record<LogoSize, string>> = {
  sm: 'h-4 w-6',
  md: 'h-5 w-7',
  lg: 'h-6 w-9',
};

/** Slanted double racing stripe — the brand's orange accent mark. */
function LogoMark({ size }: { size: LogoSize }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 30 20"
      className={cn(
        'shrink-0 transition-transform duration-300 ease-race group-hover/logo:translate-x-0.5',
        MARK_SIZES[size],
      )}
    >
      <polygon points="3,19 11,1 19,1 11,19" className="fill-accent" />
      <polygon points="14,19 22,1 26,1 18,19" className="fill-accent/70" />
      <polygon points="21,19 29,1 30,1 30,3 23,19" className="fill-accent-2" />
    </svg>
  );
}

/**
 * Wordmark: orange stripe mark + `BRAND_LOGO_TEXT` in Orbitron. Links home by default
 * (accessible name "<brand> — home"). The wrapper is `min-w-0` (not shrink-0) so a tight flex
 * row can shrink it; the stripe mark itself never shrinks.
 */
export function Logo({ size = 'md', asLink = true, onClick, className, textClassName }: LogoProps) {
  const content = (
    <>
      <LogoMark size={size} />
      <span
        className={cn(
          'font-display font-black uppercase leading-none tracking-[0.14em] text-fg',
          TEXT_SIZES[size],
          textClassName,
        )}
      >
        {BRAND_LOGO_TEXT}
      </span>
    </>
  );

  const classes = cn(
    'group/logo inline-flex min-w-0 items-center gap-2.5 rounded-md transition-[font-size] duration-300',
    className,
  );

  if (!asLink) return <span className={classes}>{content}</span>;

  return (
    <Link
      to={ROUTES.home}
      aria-label={`${BRAND_NAME} — home`}
      onClick={onClick}
      className={classes}
    >
      {content}
    </Link>
  );
}
