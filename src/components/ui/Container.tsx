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

/** Page gutter + max width: `mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8`. */
export function Container({
  as: Component = 'div',
  size = 'content',
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <Component {...rest} className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', SIZES[size], className)}>
      {children}
    </Component>
  );
}
