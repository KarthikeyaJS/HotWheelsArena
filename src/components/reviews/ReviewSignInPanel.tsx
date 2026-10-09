import { MessageSquarePlus } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { cn } from '@/lib/cn';

export interface ReviewSignInPanelProps {
  productName: string;
  className?: string;
}

/** Signed-out prompt in place of the review form: Google sign-in, then the form appears in place. */
export function ReviewSignInPanel({ productName, className }: ReviewSignInPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-4 rounded-xl border border-dashed border-line bg-surface/60 p-4 sm:p-5',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-accent-ink"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-base font-bold uppercase tracking-display text-fg">
          Got this one on your shelf?
        </h3>
        <p className="text-sm text-muted">
          Sign in to rate the {productName} and share your take with the collector community.
          Reviews from buyers get a <span className="font-semibold text-fg">Verified buyer</span>{' '}
          badge.
        </p>
      </div>
      <GoogleSignInButton label="Sign in to write a review" fullWidth className="sm:w-auto" />
    </div>
  );
}
