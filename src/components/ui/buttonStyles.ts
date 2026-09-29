import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** False while disabled or loading: hover / press styles are dropped. */
  interactive?: boolean;
  loading?: boolean;
  className?: string;
}

const BASE =
  'group/btn relative isolate inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-bold uppercase transition-[color,background-color,border-color,box-shadow,transform,opacity,filter] duration-200 ease-race';

const VARIANT_BASE: Readonly<Record<ButtonVariant, string>> = {
  // The orange chamfered fill is a decorative layer rendered by <Button> (clip-path must never
  // sit on the focusable element itself, or it would clip the focus ring).
  primary: 'font-display tracking-display text-on-accent',
  secondary:
    'overflow-hidden rounded-md border border-line bg-surface font-display tracking-display text-fg shadow-card',
  ghost: 'rounded-md font-display tracking-display text-fg',
  outline: 'rounded-md border border-fg/25 bg-transparent font-display tracking-display text-fg',
  danger: 'rounded-md bg-danger font-display tracking-display text-white',
  link: 'rounded-sm font-mono tracking-hud text-accent-ink underline-offset-4',
};

const VARIANT_INTERACTIVE: Readonly<Record<ButtonVariant, string>> = {
  primary:
    'hover:drop-shadow-[0_8px_18px_rgb(var(--accent)/0.38)] active:translate-y-px active:scale-[0.98]',
  secondary: 'hover:border-metal/70 hover:bg-card-hover active:translate-y-px active:scale-[0.98]',
  ghost: 'hover:bg-fg/[0.07] active:scale-[0.98] active:bg-fg/10',
  outline: 'hover:border-accent hover:text-accent-ink active:translate-y-px active:scale-[0.98]',
  danger:
    'hover:shadow-[0_10px_28px_-12px_rgb(var(--accent-2)/0.85)] hover:brightness-110 active:translate-y-px active:scale-[0.98]',
  link: 'hover:underline active:opacity-80',
};

const SIZES: Readonly<Record<ButtonSize, string>> = {
  sm: 'h-9 px-4 text-[11px] [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-11 px-5 text-xs [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-14 px-7 text-sm [&_svg]:h-5 [&_svg]:w-5',
};

const LINK_SIZES: Readonly<Record<ButtonSize, string>> = {
  sm: 'text-[11px] [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'text-xs [&_svg]:h-4 [&_svg]:w-4',
  lg: 'text-sm [&_svg]:h-4 [&_svg]:w-4',
};

const GAPS: Readonly<Record<ButtonSize, string>> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
};

/** Class string for the `<Button>` root element. Also handy to style a router `NavLink` like a button. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  interactive = true,
  loading = false,
  className,
}: ButtonClassOptions = {}): string {
  return cn(
    BASE,
    VARIANT_BASE[variant],
    variant === 'link' ? LINK_SIZES[size] : SIZES[size],
    interactive && VARIANT_INTERACTIVE[variant],
    !interactive && !loading && 'cursor-not-allowed opacity-50',
    loading && 'cursor-wait',
    fullWidth && 'w-full',
    className,
  );
}

/** Gap between icon and label inside a button of the given size. */
export function buttonGapClass(size: ButtonSize = 'md'): string {
  return GAPS[size];
}

/** True for absolute http(s) / protocol-relative URLs (opened in a new tab). */
export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href);
}
