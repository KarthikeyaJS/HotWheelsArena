import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { MEDIA_QUERIES, useMediaQuery } from '@/hooks/useMediaQuery';
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

/**
 * Phones (< sm) show at most this many toasts; newer ones wait (unmounted, so their timers have
 * not started) behind a "+N more" note and slide in as the visible ones go. Every toast is still
 * announced the moment it is pushed.
 */
export const SMALL_SCREEN_VISIBLE_TOASTS = 2;

/** Appended to repeat announcements so identical text is read again. */
const NBSP = String.fromCharCode(160);

const POSITIONS: Readonly<Record<ToasterPosition, string>> = {
  'bottom-right':
    'inset-x-3 bottom-3 pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem]',
  'top-center': 'inset-x-3 top-3 sm:left-1/2 sm:right-auto sm:w-[26rem] sm:-translate-x-1/2',
};

/**
 * Only keyboard focus pauses the timers: a mouse click on a toast's button also focuses it in
 * Chromium, but hovering already pauses for pointer users. (`:focus-visible` is unsupported in
 * very old engines → treat any focus as keyboard focus.)
 */
function hasKeyboardFocus(element: Element | null): boolean {
  if (!element) return false;
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/** Text read by the live region for a toast. */
function announcementFor(item: Toast): string {
  const prefix = item.variant === 'achievement' ? 'Achievement: ' : '';
  const action = item.action ? `. ${item.action.label} available in notifications` : '';
  return `${prefix}${item.title}${item.description ? `. ${item.description}` : ''}${action}`;
}

interface ToastCardProps {
  item: Toast;
  paused: boolean;
  /** Timer expiry. */
  onDismiss: (id: string) => void;
  /** Dismiss / action button: hands keyboard focus on before the card goes away. */
  onUserDismiss: (id: string) => void;
  /** Runs after the card has left the DOM (focus inside it is lost without a blur event). */
  onRemoved: () => void;
  enterFrom: 'bottom' | 'top';
}

function ToastCard({
  item,
  paused,
  onDismiss,
  onUserDismiss,
  onRemoved,
  enterFrom,
}: ToastCardProps) {
  const remainingRef = useRef(item.duration);
  const timed = Number.isFinite(item.duration) && item.duration > 0;
  const style = VARIANT_STYLES[item.variant];

  useEffect(() => onRemoved, [onRemoved]);

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
      data-toast-id={item.id}
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
                onUserDismiss(item.id);
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
          onClick={() => onUserDismiss(item.id)}
          data-toast-dismiss=""
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

/** "+2 more" note under a capped phone stack. */
function QueuedNote({ count, className }: { count: number; className?: string }) {
  return (
    <p
      className={cn(
        'hud ml-auto w-fit rounded-full border border-line bg-surface/95 px-3 py-1 text-[10px] text-muted shadow-card backdrop-blur',
        className,
      )}
    >
      +{count} more {count === 1 ? 'notification' : 'notifications'}
    </p>
  );
}

/**
 * Renders the `toastStore` queue (mount once, in AppLayout). Announces new toasts through
 * persistent live regions (polite; assertive for errors), auto-dismisses after
 * `toast.duration` (paused while hovered, focused or the tab is hidden) and has a dismiss
 * button per toast. Achievement toasts get the yellow trophy treatment. On phones only the
 * oldest {@link SMALL_SCREEN_VISIBLE_TOASTS} are shown; the rest queue behind a "+N more" note.
 */
export function Toaster({ position = 'bottom-right', className }: ToasterProps) {
  const toasts = useToasts();
  const smallScreen = !useMediaQuery(MEDIA_QUERIES.sm);
  const dismiss = useToastStore((state) => state.dismiss);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [announcement, setAnnouncement] = useState({ polite: '', assertive: '' });
  const paused = hovered || focusWithin || documentHidden;
  const sectionRef = useRef<HTMLElement>(null);
  /** Where keyboard focus came from before it entered the stack (restored after the last toast). */
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const orderedIdsRef = useRef<string[]>([]);

  const onDismiss = useCallback((id: string) => dismiss(id), [dismiss]);

  // A dismissed card unmounts with focus inside it, which browsers drop to <body> without a
  // blur event: without this, `focusWithin` stayed true and every later toast never expired.
  const syncFocusWithin = useCallback(() => {
    const section = sectionRef.current;
    const focused = document.activeElement;
    setFocusWithin(
      section !== null &&
        focused !== null &&
        section.contains(focused) &&
        hasKeyboardFocus(focused),
    );
  }, []);

  // Keyboard users keep their place: focus moves to the neighbouring toast's dismiss button, or
  // back to where it came from when this was the last toast.
  const onUserDismiss = useCallback(
    (id: string) => {
      const section = sectionRef.current;
      const focused = document.activeElement;
      const card = section?.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
      if (section && card && focused && card.contains(focused) && hasKeyboardFocus(focused)) {
        const ids = orderedIdsRef.current;
        const index = ids.indexOf(id);
        const neighbourId = ids[index + 1] ?? ids[index - 1];
        const neighbour = neighbourId
          ? section.querySelector<HTMLElement>(
              `[data-toast-id="${neighbourId}"] [data-toast-dismiss]`,
            )
          : null;
        const back = returnFocusRef.current;
        const target =
          neighbour ??
          (back?.isConnected && !section.contains(back) ? back : null) ??
          document.getElementById('main-content');
        target?.focus({ preventScroll: true });
      }
      dismiss(id);
    },
    [dismiss],
  );

  // Toasts pushed in the same task (e.g. several badges from one order) are announced together;
  // otherwise each push replaced the previous text before it was ever read.
  const batchRef = useRef<{ polite: string[]; assertive: string[] } | null>(null);

  // Announce toasts as they are pushed (the live regions exist before content changes).
  useEffect(
    () =>
      useToastStore.subscribe((state, previous) => {
        const previousIds = new Set(previous.toasts.map((item) => item.id));
        const added = state.toasts.filter((item) => !previousIds.has(item.id));
        if (added.length === 0) return;
        if (batchRef.current === null) {
          batchRef.current = { polite: [], assertive: [] };
          window.setTimeout(() => {
            batchRef.current = null;
          }, 0);
        }
        const batch = batchRef.current;
        batch.polite.push(...added.filter((item) => item.variant !== 'error').map(announcementFor));
        batch.assertive.push(
          ...added.filter((item) => item.variant === 'error').map(announcementFor),
        );
        const polite = batch.polite.join(' ');
        const assertive = batch.assertive.join(' ');
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

  // The hovered card can vanish under a still pointer (dismissed with the mouse), and then no
  // mouseleave ever fires: re-check on the next pointer move, or later toasts never expire.
  useEffect(() => {
    if (!hovered) return undefined;
    const onMouseMove = (event: MouseEvent): void => {
      const section = sectionRef.current;
      if (!section || !(event.target instanceof Node) || !section.contains(event.target)) {
        setHovered(false);
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [hovered]);

  // No toasts → nothing can be hovered / focused any more.
  useEffect(() => {
    if (toasts.length === 0) {
      setHovered(false);
      setFocusWithin(false);
    }
  }, [toasts.length]);

  const handleFocus = (event: FocusEvent<HTMLElement>): void => {
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) {
      returnFocusRef.current = from;
    }
    setFocusWithin(hasKeyboardFocus(event.target));
  };

  const handleBlur = (event: FocusEvent<HTMLElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  };

  // Oldest first, so queued toasts each get their full time once they show.
  const visible = smallScreen ? toasts.slice(0, SMALL_SCREEN_VISIBLE_TOASTS) : toasts;
  const queuedCount = toasts.length - visible.length;
  const ordered = position === 'top-center' ? [...visible].reverse() : visible;
  useEffect(() => {
    orderedIdsRef.current = ordered.map((item) => item.id);
  });

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
          ref={sectionRef}
          aria-label={toasts.length > 0 ? 'Notifications' : undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn('pointer-events-none fixed z-toast', POSITIONS[position], className)}
        >
          {queuedCount > 0 && position === 'top-center' ? (
            <QueuedNote count={queuedCount} className="mb-2" />
          ) : null}
          <ol className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {ordered.map((item) => (
                <ToastCard
                  key={item.id}
                  item={item}
                  paused={paused}
                  onDismiss={onDismiss}
                  onUserDismiss={onUserDismiss}
                  onRemoved={syncFocusWithin}
                  enterFrom={position === 'top-center' ? 'top' : 'bottom'}
                />
              ))}
            </AnimatePresence>
          </ol>
          {queuedCount > 0 && position !== 'top-center' ? (
            <QueuedNote count={queuedCount} className="mt-2" />
          ) : null}
        </section>
      </Portal>
    </>
  );
}
