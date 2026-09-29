import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** Target element (defaults to `document.body`). */
  container?: Element | null;
}

/**
 * Renders children into `document.body` (or `container`). Rendering is synchronous so overlays
 * that are open on first render can move focus inside immediately.
 */
export function Portal({ children, container }: PortalProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, container ?? document.body);
}
