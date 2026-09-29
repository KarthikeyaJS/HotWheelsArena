import {
  forwardRef,
  useMemo,
  type HTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { Link, type To } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { isExternalHref } from './buttonStyles';
import { CountBadge } from './CountBadge';
import { mergeRefs } from './mergeRefs';
import { Spinner } from './Spinner';

export type IconButtonVariant = 'ghost' | 'outline' | 'solid' | 'danger';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick' | 'aria-label'> {
  /** Accessible name (also used as the native tooltip unless `title` is given). Required. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  /** Toggle state → `aria-pressed` + active styling (wishlist heart, sound toggle…). */
  pressed?: boolean;
  /** Count overlay (hidden at 0). The count is appended to the accessible name. */
  badge?: number;
  badgeMax?: number;
  /** Unit read after the count, e.g. "items" → "Pit stop cart (3 items)". */
  badgeLabel?: string;
  badgeTone?: 'accent' | 'danger' | 'highlight' | 'neutral';
  /** Renders a react-router `<Link>`. */
  to?: To;
  /** Renders an `<a>` (external URLs open in a new tab). */
  href?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
}

const BASE =
  'relative inline-flex shrink-0 select-none items-center justify-center rounded-md transition-[color,background-color,border-color,box-shadow,transform,filter] duration-200 ease-race';

const VARIANTS: Readonly<Record<IconButtonVariant, string>> = {
  ghost: 'text-fg',
  outline: 'border border-line bg-transparent text-fg',
  solid: 'bg-accent text-on-accent shadow-[0_6px_18px_-8px_rgb(var(--accent)/0.7)]',
  danger: 'text-danger-ink',
};

const VARIANTS_INTERACTIVE: Readonly<Record<IconButtonVariant, string>> = {
  ghost: 'hover:bg-fg/[0.08] hover:text-fg active:bg-fg/[0.12]',
  outline: 'hover:border-accent hover:text-accent-ink active:bg-accent/10',
  solid: 'hover:brightness-110 active:brightness-95',
  danger: 'hover:bg-danger/10 active:bg-danger/15',
};

const PRESSED: Readonly<Record<IconButtonVariant, string>> = {
  ghost: 'bg-accent/10 text-accent-ink hover:bg-accent/15 hover:text-accent-ink',
  outline: 'border-accent/60 bg-accent/10 text-accent-ink',
  solid: 'ring-2 ring-accent/40 ring-offset-2 ring-offset-bg',
  danger: 'bg-danger/10',
};

const SIZES: Readonly<Record<IconButtonSize, string>> = {
  xs: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  sm: 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 w-10 [&_svg]:h-[18px] [&_svg]:w-[18px]',
  lg: 'h-12 w-12 [&_svg]:h-5 [&_svg]:w-5',
};

/**
 * Icon-only button with a required accessible `label`. Supports toggles (`pressed`), a count
 * badge, loading, and rendering as a router link / anchor.
 */
export const IconButton = forwardRef<HTMLElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    variant = 'ghost',
    size = 'md',
    loading = false,
    pressed,
    badge,
    badgeMax = 99,
    badgeLabel,
    badgeTone = 'accent',
    to,
    href,
    target,
    rel,
    type = 'button',
    disabled = false,
    onClick,
    className,
    title,
    ...rest
  },
  forwardedRef,
) {
  const setRef = useMemo(() => mergeRefs(forwardedRef), [forwardedRef]);
  const interactive = !disabled && !loading;
  const count = badge !== undefined && Number.isFinite(badge) ? Math.max(0, Math.floor(badge)) : 0;
  const countText = count > badgeMax ? `${badgeMax}+` : String(count);
  const accessibleName =
    count > 0 ? `${label} (${countText}${badgeLabel ? ` ${badgeLabel}` : ''})` : label;
  const external = href !== undefined && isExternalHref(href);
  const resolvedTarget = target ?? (external ? '_blank' : undefined);
  const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);

  const classes = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    interactive && VARIANTS_INTERACTIVE[variant],
    interactive && 'active:scale-95',
    pressed && PRESSED[variant],
    !interactive && !loading && 'cursor-not-allowed opacity-40',
    loading && 'cursor-wait',
    className,
  );

  const handleClick = (event: MouseEvent<HTMLElement>): void => {
    if (!interactive) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn('inline-flex items-center justify-center', loading && 'opacity-0')}
      >
        {icon}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" tone="current" label="" />
        </span>
      ) : null}
      {count > 0 ? (
        <CountBadge
          count={count}
          max={badgeMax}
          tone={badgeTone}
          size="sm"
          decorative
          className="pointer-events-none absolute -right-1 -top-1"
        />
      ) : null}
    </>
  );

  const shared = {
    ...rest,
    title: title ?? label,
    'aria-label': accessibleName,
    'aria-busy': loading || undefined,
    className: classes,
  };

  if ((to !== undefined || href !== undefined) && !interactive) {
    return (
      <span {...shared} ref={setRef} role="link" aria-disabled="true">
        {content}
      </span>
    );
  }

  if (to !== undefined) {
    return (
      <Link
        {...shared}
        ref={setRef}
        to={to}
        target={target}
        rel={resolvedRel}
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  if (href !== undefined) {
    return (
      <a
        {...shared}
        ref={setRef}
        href={href}
        target={resolvedTarget}
        rel={resolvedRel}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...shared}
      ref={setRef}
      type={type}
      disabled={disabled}
      aria-pressed={pressed}
      aria-disabled={loading || undefined}
      onClick={handleClick}
    >
      {content}
    </button>
  );
});
