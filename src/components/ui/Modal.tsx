import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useId, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASE_IN_OUT, EASE_OUT_EXPO, motionSafe, overlayFade } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { OverlayHeader } from './OverlayHeader';
import { Portal } from './Portal';
import { useOverlayBehavior } from './useOverlayBehavior';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalTone = 'accent' | 'highlight' | 'danger';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title (rendered as the `h2` that labels the dialog). */
  title: ReactNode;
  /** Short description (labels the dialog via `aria-describedby`). */
  description?: ReactNode;
  /** Mono HUD line above the title, e.g. `PIT LANE · CONFIRM`. */
  eyebrow?: ReactNode;
  children?: ReactNode;
  /** Action row (right-aligned on desktop, stacked on mobile). */
  footer?: ReactNode;
  size?: ModalSize;
  /** Element focused on open (default: `[data-autofocus]`, else the first control). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Click on the backdrop closes (default true). */
  closeOnOverlayClick?: boolean;
  /** Escape closes (default true). */
  closeOnEsc?: boolean;
  hideCloseButton?: boolean;
  /** Accessible name of the × button (default "Close dialog"). */
  closeLabel?: string;
  /** Top stripe colour: `accent` racing stripe (default), `highlight` for achievements, `danger`. */
  tone?: ModalTone;
  className?: string;
  bodyClassName?: string;
  /** Called after the exit animation finishes. */
  onExitComplete?: () => void;
}

const SIZES: Readonly<Record<ModalSize, string>> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

const TONE_STRIPES: Readonly<Record<ModalTone, string>> = {
  accent: 'racing-stripe is-active',
  highlight: 'absolute inset-x-0 top-0 h-1 bg-highlight-gradient',
  danger: 'absolute inset-x-0 top-0 h-1 bg-danger',
};

const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.98,
    transition: { duration: DURATION.fast, ease: EASE_IN_OUT },
  },
};

type ModalContentProps = Omit<ModalProps, 'open' | 'onExitComplete'>;

function ModalContent({
  onClose,
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
  closeLabel = 'Close dialog',
  tone = 'accent',
  className,
  bodyClassName,
}: ModalContentProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `modal-${baseId}-title`;
  const descriptionId = description ? `modal-${baseId}-description` : undefined;
  const reduceMotion = useReducedMotion();
  const variants = useMemo(() => motionSafe(PANEL_VARIANTS, reduceMotion), [reduceMotion]);

  useOverlayBehavior(panelRef, { onClose, closeOnEsc, initialFocusRef });

  return (
    <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-6">
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
          'relative flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-card-hover outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl',
          SIZES[size],
          className,
        )}
      >
        <span aria-hidden="true" className={TONE_STRIPES[tone]} />
        <OverlayHeader
          titleId={titleId}
          descriptionId={descriptionId}
          title={title}
          description={description}
          eyebrow={eyebrow}
          onClose={onClose}
          hideCloseButton={hideCloseButton}
          closeLabel={closeLabel}
          className="px-5 pb-4 pt-6 sm:px-6"
        />
        {children !== undefined && children !== null ? (
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6', bodyClassName)}>
            {children}
          </div>
        ) : null}
        {footer ? (
          <div className="safe-bottom flex flex-col-reverse gap-3 border-t border-line bg-bg/40 px-5 pt-4 sm:flex-row sm:flex-wrap-reverse sm:items-center sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

/**
 * Accessible modal dialog: portal, focus trap, Escape / backdrop to close, scroll lock,
 * `aria-modal` + labelled/described, focus returns to the trigger. Slides up and fades in
 * (fade only for reduced-motion users); a bottom sheet on phones.
 */
export function Modal({ open, onExitComplete, ...contentProps }: ModalProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open ? (
        <Portal key="modal">
          <ModalContent {...contentProps} />
        </Portal>
      ) : null}
    </AnimatePresence>
  );
}
