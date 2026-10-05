import { AlertTriangle, FlaskConical, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type CalloutTone = 'info' | 'warning' | 'test';

export interface CalloutProps {
  title: string;
  children: ReactNode;
  tone?: CalloutTone;
  /** Override the default tone icon. */
  icon?: ReactNode;
  className?: string;
}

const TONES: Readonly<
  Record<CalloutTone, { frame: string; tile: string; icon: ReactNode; stripe: string }>
> = {
  info: {
    frame: 'border-line bg-card',
    tile: 'border-line bg-surface text-accent-ink',
    icon: <Info />,
    stripe: 'bg-accent',
  },
  warning: {
    frame: 'border-danger/40 bg-danger/[0.06]',
    tile: 'border-danger/40 bg-surface text-danger-ink',
    icon: <AlertTriangle />,
    stripe: 'bg-danger',
  },
  test: {
    frame: 'border-accent/40 bg-accent/[0.06]',
    tile: 'border-accent/40 bg-surface text-accent-ink',
    icon: <FlaskConical />,
    stripe: 'bg-accent',
  },
};

/** Highlighted note inside a static page (e.g. "Payments are in test mode"). */
export function Callout({ title, children, tone = 'info', icon, className }: CalloutProps) {
  const t = TONES[tone];
  return (
    <div
      role="note"
      aria-label={title}
      className={cn(
        'relative flex gap-4 overflow-hidden rounded-xl border p-4 shadow-card sm:p-5',
        t.frame,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', t.stripe)} />
      <span
        aria-hidden="true"
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg border [&_svg]:h-4 [&_svg]:w-4',
          t.tile,
        )}
      >
        {icon ?? t.icon}
      </span>
      <div className="min-w-0 text-sm leading-6 text-fg/85">
        <p className="hud mb-1 text-fg">{title}</p>
        {children}
      </div>
    </div>
  );
}
