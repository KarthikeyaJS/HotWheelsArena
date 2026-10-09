import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ContainerSize = 'content' | 'narrow' | 'wide';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Element to render (default `div`), e.g. `section`, `header`, `article`. */
  as?: ElementType;
  /** `content` = 1280px (default), `narrow` = 768px reading width, `wide` = 1440px. */
  size?: ContainerSize;
  children?: ReactNode;
}

const SIZES: Readonly<Record<ContainerSize, string>> = {
  content: 'max-w-content',
  narrow: 'max-w-3xl',
  wide: 'max-w-[1440px]',
};

/**
 * Page gutter (1rem / 1.5rem from sm / 2rem from lg, each widened to the safe-area inset so
 * content clears a landscape notch) + max width.
 */
const GUTTER =
  'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))]';

export function Container({
  as: Component = 'div',
  size = 'content',
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <Component
      {...rest}
      className={cn('mx-auto w-full', GUTTER, SIZES[size], className)}
    >
      {children}
    </Component>
  );
}
