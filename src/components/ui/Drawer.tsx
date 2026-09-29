import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useId, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASE_IN_OUT, EASE_OUT_EXPO, motionSafe, overlayFade } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { OverlayHeader } from './OverlayHeader';
import { Portal } from './Portal';
import { useOverlayBehavior } from './useOverlayBehavior';

export type DrawerSide = 'left' | 'right' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Edge the panel slides from (default `right`). */
  side?: DrawerSide;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  /** Sticky action row at the bottom. */
  footer?: ReactNode;
  size?: DrawerSize;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  hideCloseButton?: boolean;
  /** Accessible name of the × button (default "Close panel"). */
  closeLabel?: string;
  className?: string;
  bodyClassName?: string;
  onExitComplete?: () => void;
}

const EXIT = { duration: DURATION.fast, ease: EASE_IN_OUT };
const ENTER = { duration: DURATION.base, ease: EASE_OUT_EXPO };

/** Slide variants carry an opacity fade so the reduced-motion fallback still transitions. */
const SIDE_VARIANTS: Readonly<Record<DrawerSide, Variants>> = {
  right: {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: ENTER },
    exit: { x: '100%', opacity: 0, transition: EXIT },
  },
  left: {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: ENTER },
    exit: { x: '-100%', opacity: 0, transition: EXIT },
  },
  bottom: {
    hidden: { y: '100%', opacity: 0 },
    visible: { y: 0, opacity: 1, transition: ENTER },
    exit: { y: '100%', opacity: 0, transition: EXIT },
  },
};

const SIDE_CLASSES: Readonly<Record<DrawerSide, string>> = {
  right: 'inset-y-0 right-0 h-full w-[calc(100%-2.5rem)] border-l sm:w-full',
  left: 'inset-y-0 left-0 h-full w-[calc(100%-2.5rem)] border-r sm:w-full',
  bottom: 'inset-x-0 bottom-0 w-full rounded-t-2xl border-t',
};

const SIZE_CLASSES: Readonly<Record<DrawerSide, Readonly<Record<DrawerSize, string>>>> = {
  right: { sm: 'max-w-xs', md: 'max-w-md', lg: 'max-w-xl', full: 'w-full max-w-none' },
  left: { sm: 'max-w-xs', md: 'max-w-md', lg: 'max-w-xl', full: 'w-full max-w-none' },
  bottom: {
    sm: 'max-h-[40dvh]',
    md: 'max-h-[65dvh]',
    lg: 'max-h-[85dvh]',
    full: 'h-[100dvh] rounded-none',
  },
};

const STRIPE_CLASSES: Readonly<Record<DrawerSide, string>> = {
  right: 'racing-stripe racing-stripe-left is-active',
  left: 'racing-stripe racing-stripe-left is-active left-auto right-0',
  bottom: 'racing-stripe is-active',
};

type DrawerContentProps = Omit<DrawerProps, 'open' | 'onExitComplete'>;

function DrawerContent({
  onClose,
  side = 'right',
  title,
  description,
  eyebrow,
  children,
  footer,
  size = 'md',
  initialFocusRef,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  hideCloseButton = false,
  closeLabel = 'Close panel',
  className,
  bodyClassName,
}: DrawerContentProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `drawer-${baseId}-title`;
  const descriptionId = description ? `drawer-${baseId}-description` : undefined;
  const reduceMotion = useReducedMotion();
  const variants = useMemo(
    () => motionSafe(SIDE_VARIANTS[side], reduceMotion),
    [side, reduceMotion],
  );

  useOverlayBehavior(panelRef, { onClose, closeOnEsc, initialFocusRef });

  return (
    <div className="fixed inset-0 z-drawer">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm dark:bg-bg/80"
        variants={overlayFade}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          'absolute flex flex-col overflow-hidden border-line bg-surface shadow-card-hover outline-none',
          SIDE_CLASSES[side],
          SIZE_CLASSES[side][size],
          className,
        )}
      >
        <span aria-hidden="true" className={STRIPE_CLASSES[side]} />
        <OverlayHeader
          titleId={titleId}
          descriptionId={descriptionId}
          title={title}
          description={description}
          eyebrow={eyebrow}
          onClose={onClose}
          hideCloseButton={hideCloseButton}
          closeLabel={closeLabel}
          className="shrink-0 border-b border-line px-5 py-4"
        />
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5', bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <div className="safe-bottom flex shrink-0 flex-col gap-3 border-t border-line bg-bg/40 px-5 pt-4">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

/**
 * Side / bottom sheet dialog with the same accessibility as `Modal` (portal, focus trap,
 * Escape, scroll lock, labelled, focus return). Slides in from `side`; fades for reduced motion.
 */
export function Drawer({ open, onExitComplete, ...contentProps }: DrawerProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open ? (
        <Portal key="drawer">
          <DrawerContent {...contentProps} />
        </Portal>
      ) : null}
    </AnimatePresence>
  );
}
