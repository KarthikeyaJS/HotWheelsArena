import { Trophy } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { cn } from '@/lib/cn';

export interface TrackProgressBannerProps {
  title?: string;
  description?: string;
  className?: string;
}

/** Signed-out prompt: sign in to see "x/y in your garage" and the missing cars of each series. */
export function TrackProgressBanner({
  title = 'Track your series completion',
  description = 'Sign in to see how many cars of each series are parked in your garage — and exactly which ones you are still missing.',
  className,
}: TrackProgressBannerProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex items-start gap-3 pl-1">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-accent-ink"
        >
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-fg sm:text-base">{title}</p>
          <p className="mt-0.5 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <GoogleSignInButton size="md" className="shrink-0" />
    </div>
  );
}
