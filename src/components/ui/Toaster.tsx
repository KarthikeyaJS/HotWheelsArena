import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { SPRING_SNAPPY } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { useToasts, useToastStore } from '@/store/toastStore';
import type { Toast, ToastVariant } from '@/types';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Portal } from './Portal';

export type ToasterPosition = 'bottom-right' | 'top-center';

export interface ToasterProps {
  /** `bottom-right` on desktop (full-width bottom on phones) — default; or `top-center`. */
  position?: ToasterPosition;
  className?: string;
}

interface VariantStyle {
  container: string;
  bar: string;
  icon: string;
  title: string;
  defaultIcon: ReactNode;
}

const VARIANT_STYLES: Readonly<Record<ToastVariant, VariantStyle>> = {
  default: {
    container: 'border-line',
    bar: 'bg-metal',
    icon: 'bg-fg/[0.06] text-fg',
    title: 'text-fg',
    defaultIcon: <Bell />,
  },
  success: {
    container: 'border-line',
    bar: 'bg-success',
    icon: 'bg-success/10 text-success',
    title: 'text-fg',
    defaultIcon: <CheckCircle2 />,
  },
  error: {
    container: 'border-danger/40',
    bar: 'bg-danger',
    icon: 'bg-danger/10 text-danger-ink',
    title: 'text-fg',
    defaultIcon: <AlertTriangle />,
  },
  achievement: {
    container: 'border-highlight/50 shadow-glow-highlight',
    bar: 'bg-highlight',
    icon: 'bg-highlight-gradient text-on-highlight',
    title: 'font-display text-[13px] tracking-display text-highlight-ink',
    defaultIcon: <Trophy />,
  },
};

/** Appended to repeat announcements so identical text is read again. */
const NBSP = String.fromCharCode(160);

const POSITIONS: Readonly<Record<ToasterPosition, string>> = {
  'bottom-right':
    'inset-x-3 bottom-3 pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem]',
  'top-center': 'inset-x-3 top-3 sm:left-1/2 sm:right-auto sm:w-[26rem] sm:-translate-x-1/2',
};

/** Text read by the live region for a toast. */
function announcementFor(item: Toast): string {
  const prefix = item.variant === 'achievement' ? 'Achievement: ' : '';
  const action = item.action ? `. ${item.action.label} available in notifications` : '';
  return `${prefix}${item.title}${item.description ? `. ${item.description}` : ''}${action}`;
}

interface ToastCardProps {
  item: Toast;
  paused: boolean;
  onDismiss: (id: string) => void;
  enterFrom: 'bottom' | 'top';
}

function ToastCard({ item, paused, onDismiss, enterFrom }: ToastCardProps) {
  const remainingRef = useRef(item.duration);
  const timed = Number.isFinite(item.duration) && item.duration > 0;
  const style = VARIANT_STYLES[item.variant];

  // Auto-dismiss that pauses (keeping the remaining time) while hovered / focused / tab hidden.
  useEffect(() => {
    if (paused || !timed) return undefined;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(item.id), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, timed, item.id, onDismiss]);

  const icon = item.icon ?? style.defaultIcon;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: enterFrom === 'bottom' ? 16 : -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.96, transition: { duration: 0.18 } }}
      transition={SPRING_SNAPPY}
      className="pointer-events-auto"
    >
      <div
        className={cn(
          'relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-surface/95 py-3.5 pl-4 pr-11 shadow-card-hover backdrop-blur',
          style.container,
        )}
      >
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', style.bar)} />
        {item.variant === 'achievement' ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(105deg,transparent_40%,rgb(var(--highlight)/0.14)_50%,transparent_60%)] bg-[length:250%_100%] motion-reduce:hidden"
          />
        ) : null}
        <span
          aria-hidden="true"
          className={cn(
            'relative grid h-9 w-9 shrink-0 place-items-center rounded-md text-lg leading-none [&_svg]:h-[18px] [&_svg]:w-[18px]',
            style.icon,
          )}
        >
          {icon}
        </span>
        <div className="relative min-w-0 flex-1 pt-0.5">
          <p className={cn('text-sm font-semibold leading-snug', style.title)}>{item.title}</p>
          {item.description ? (
            <p className="mt-0.5 text-sm leading-snug text-muted">{item.description}</p>
          ) : null}
          {item.action ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2.5"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
            >
              {item.action.label}
            </Button>
          ) : null}
        </div>
        <IconButton
          label="Dismiss notification"
          icon={<X />}
          variant="ghost"
          size="xs"
          onClick={() => onDismiss(item.id)}
          className="absolute right-2 top-2 text-muted hover:text-fg"
        />
        {timed ? (
          <span
            aria-hidden="true"
            className={cn(
              'absolute bottom-0 left-0 h-0.5 w-full origin-left animate-stripe-slide opacity-70 motion-reduce:hidden',
              style.bar,
            )}
            style={{
              animationDuration: `${item.duration}ms`,
              animationDirection: 'reverse',
              animationTimingFunction: 'linear',
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        ) : null}
      </div>
    </motion.li>
  );
}

/**
 * Renders the `toastStore` queue (mount once, in AppLayout). Announces new toasts through
 * persistent live regions (polite; assertive for errors), auto-dismisses after
 * `toast.duration` (paused while hovered, focused or the tab is hidden) and has a dismiss
 * button per toast. Achievement toasts get the yellow trophy treatment.
 */
export function Toaster({ position = 'bottom-right', className }: ToasterProps) {
  const toasts = useToasts();
  const dismiss = useToastStore((state) => state.dismiss);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [announcement, setAnnouncement] = useState({ polite: '', assertive: '' });
  const paused = hovered || focusWithin || documentHidden;

  const onDismiss = useCallback((id: string) => dismiss(id), [dismiss]);

  // Announce toasts as they are pushed (the live regions exist before content changes).
  useEffect(
    () =>
      useToastStore.subscribe((state, previous) => {
        const previousIds = new Set(previous.toasts.map((item) => item.id));
        const added = state.toasts.filter((item) => !previousIds.has(item.id));
        if (added.length === 0) return;
        const polite = added
          .filter((item) => item.variant !== 'error')
          .map(announcementFor)
          .join(' ');
        const assertive = added
          .filter((item) => item.variant === 'error')
          .map(announcementFor)
          .join(' ');
        setAnnouncement((current) => ({
          // A trailing no-break space forces a re-announcement of identical text.
          polite: polite
            ? polite === current.polite
              ? `${polite}${NBSP}`
              : polite
            : current.polite,
          assertive: assertive
            ? assertive === current.assertive
              ? `${assertive}${NBSP}`
              : assertive
            : current.assertive,
        }));
      }),
    [],
  );

  // Clear the live regions shortly after so stale text is not re-read.
  useEffect(() => {
    if (!announcement.polite && !announcement.assertive) return undefined;
    const timer = window.setTimeout(() => setAnnouncement({ polite: '', assertive: '' }), 5000);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  useEffect(() => {
    const update = (): void => setDocumentHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  // No toasts → nothing can be hovered / focused any more.
  useEffect(() => {
    if (toasts.length === 0) {
      setHovered(false);
      setFocusWithin(false);
    }
  }, [toasts.length]);

  const handleBlur = (event: FocusEvent<HTMLElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  };

  const ordered = position === 'top-center' ? [...toasts].reverse() : toasts;

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement.polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {announcement.assertive}
      </div>
      <Portal>
        <section
          aria-label={toasts.length > 0 ? 'Notifications' : undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocusWithin(true)}
          onBlur={handleBlur}
          className={cn('pointer-events-none fixed z-toast', POSITIONS[position], className)}
        >
          <ol className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {ordered.map((item) => (
                <ToastCard
                  key={item.id}
                  item={item}
                  paused={paused}
                  onDismiss={onDismiss}
                  enterFrom={position === 'top-center' ? 'top' : 'bottom'}
                />
              ))}
            </AnimatePresence>
          </ol>
        </section>
      </Portal>
    </>
  );
}
