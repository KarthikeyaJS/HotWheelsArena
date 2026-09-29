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
import {
  buttonClasses,
  buttonGapClass,
  isExternalHref,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles';
import { mergeRefs } from './mergeRefs';
import { Spinner } from './Spinner';
import { VisuallyHidden } from './VisuallyHidden';

export type { ButtonSize, ButtonVariant };

export interface ButtonProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
  children?: ReactNode;
  /** `primary` = orange chamfered CTA (on-accent text). Default `primary`. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Spinner + `aria-busy`; clicks are blocked but focus is kept. Width never jumps. */
  loading?: boolean;
  /** Text shown next to the spinner while loading (its width is reserved up-front). */
  loadingText?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  /** Renders a react-router `<Link>`. */
  to?: To;
  /** Renders an `<a>`. Absolute http(s) URLs open in a new tab (`rel="noopener noreferrer"`). */
  href?: string;
  /** `<Link>` only. */
  replace?: boolean;
  /** `<Link>` only. */
  state?: unknown;
  /** `<Link>` only. */
  preventScrollReset?: boolean;
  target?: string;
  rel?: string;
  download?: boolean | string;
  /** Native button type (default `'button'`). */
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string | number;
  onClick?: MouseEventHandler<HTMLElement>;
}

/**
 * The garage CTA. Renders a `<button>`, a router `<Link>` (`to`) or an `<a>` (`href`).
 * Primary = orange fill on a decorative chamfered layer (so the focus ring is never clipped),
 * hover sheen + speed stripes, press-down on active, spinner with stable width while loading.
 */
export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    to,
    href,
    replace,
    state,
    preventScrollReset,
    target,
    rel,
    download,
    type = 'button',
    disabled = false,
    form,
    name,
    value,
    onClick,
    className,
    ...rest
  },
  forwardedRef,
) {
  const setRef = useMemo(() => mergeRefs(forwardedRef), [forwardedRef]);
  const interactive = !disabled && !loading;
  const classes = buttonClasses({ variant, size, fullWidth, interactive, loading, className });
  const gap = buttonGapClass(size);
  const hasLoadingText = loadingText !== undefined && loadingText !== null && loadingText !== false;
  const hasChildren = children !== undefined && children !== null && children !== false;
  const external = href !== undefined && isExternalHref(href);
  const resolvedTarget = target ?? (external ? '_blank' : undefined);
  const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);

  const handleClick = (event: MouseEvent<HTMLElement>): void => {
    if (!interactive) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      {variant === 'primary' ? (
        <span
          aria-hidden="true"
          className={cn(
            'clip-angled-sm pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-accent transition-[filter] duration-200',
            interactive && 'group-hover/btn:brightness-110 group-active/btn:brightness-95',
          )}
        >
          <span className="absolute inset-y-0 right-2.5 w-7 -skew-x-[24deg] bg-[repeating-linear-gradient(90deg,rgb(var(--on-accent)/0.16)_0_2px,transparent_2px_6px)] transition-transform duration-300 ease-race group-hover/btn:translate-x-1" />
          <span
            className={cn(
              'absolute inset-y-0 -left-1/2 w-1/3 -translate-x-full -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-0 ease-out motion-reduce:hidden',
              interactive &&
                'group-hover/btn:translate-x-[520%] group-hover/btn:duration-700 group-focus-visible/btn:translate-x-[520%] group-focus-visible/btn:duration-700',
            )}
          />
        </span>
      ) : null}
      <span className="relative inline-grid min-w-0 place-items-center">
        <span
          aria-hidden={loading && hasLoadingText ? true : undefined}
          className={cn(
            'col-start-1 row-start-1 inline-flex min-w-0 items-center',
            gap,
            loading && (hasLoadingText ? 'invisible' : 'opacity-0'),
          )}
        >
          {leftIcon ? (
            <span aria-hidden="true" className="inline-flex shrink-0">
              {leftIcon}
            </span>
          ) : null}
          {hasChildren ? <span>{children}</span> : null}
          {rightIcon ? (
            <span
              aria-hidden="true"
              className="inline-flex shrink-0 transition-transform duration-200 ease-race group-hover/btn:translate-x-0.5"
            >
              {rightIcon}
            </span>
          ) : null}
        </span>
        {loading || hasLoadingText ? (
          <span
            aria-hidden={loading ? undefined : true}
            className={cn(
              'col-start-1 row-start-1 inline-flex items-center',
              gap,
              !loading && 'invisible',
            )}
          >
            <Spinner size="sm" tone="current" label="" />
            {hasLoadingText ? <span>{loadingText}</span> : null}
          </span>
        ) : null}
      </span>
      {resolvedTarget === '_blank' ? <VisuallyHidden> (opens in a new tab)</VisuallyHidden> : null}
    </>
  );

  if ((to !== undefined || href !== undefined) && !interactive) {
    // A disabled link is not focusable and never navigates.
    return (
      <span
        {...rest}
        ref={setRef}
        role="link"
        aria-disabled="true"
        aria-busy={loading || undefined}
        className={classes}
      >
        {content}
      </span>
    );
  }

  if (to !== undefined) {
    return (
      <Link
        {...rest}
        ref={setRef}
        to={to}
        replace={replace}
        state={state}
        preventScrollReset={preventScrollReset}
        target={target}
        rel={resolvedRel}
        className={classes}
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  if (href !== undefined) {
    return (
      <a
        {...rest}
        ref={setRef}
        href={href}
        target={resolvedTarget}
        rel={resolvedRel}
        download={download}
        className={classes}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...rest}
      ref={setRef}
      type={type}
      disabled={disabled}
      form={form}
      name={name}
      value={value}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={classes}
      onClick={handleClick}
    >
      {content}
    </button>
  );
});
